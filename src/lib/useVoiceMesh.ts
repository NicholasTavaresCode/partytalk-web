"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomsSocket } from "./socket";

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export type VoiceStatus =
  | "off"
  | "requesting-mic"
  | "mic-denied"
  | "ready" // mic acquired; waiting for / connecting to peers
  | "connected"; // at least one peer audio stream is flowing

export interface RemoteStream {
  uid: string;
  stream: MediaStream;
}

interface Options {
  socket: RoomsSocket | null;
  roomId: string;
  enabled: boolean;
}

/**
 * P2P mesh voice, wired to the `webrtc:*` signaling contract in the backend's
 * docs/audio-architecture.md (milestone M1). One RTCPeerConnection per peer;
 * media never touches the server. Until the backend relays signaling, the mic is
 * acquired and the client waits — no peers connect, which is the intended
 * graceful-degradation while M1 is unbuilt.
 */
export function useVoiceMesh({ socket, roomId, enabled }: Options) {
  const [status, setStatus] = useState<VoiceStatus>("off");
  const [muted, setMuted] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [error, setError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const addRemote = useCallback((uid: string, stream: MediaStream) => {
    setRemoteStreams((prev) => {
      const rest = prev.filter((r) => r.uid !== uid);
      return [...rest, { uid, stream }];
    });
    setStatus("connected");
  }, []);

  const removePeer = useCallback((uid: string) => {
    peersRef.current.get(uid)?.close();
    peersRef.current.delete(uid);
    pendingIceRef.current.delete(uid);
    setRemoteStreams((prev) => prev.filter((r) => r.uid !== uid));
  }, []);

  useEffect(() => {
    if (!enabled || !socket) return;
    let active = true;

    const createPeer = (uid: string): RTCPeerConnection => {
      const existing = peersRef.current.get(uid);
      if (existing) return existing;

      const pc = new RTCPeerConnection(ICE_CONFIG);
      localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("webrtc:ice", { roomId, toUid: uid, candidate: e.candidate.toJSON() });
        }
      };
      pc.ontrack = (e) => {
        if (e.streams[0]) addRemote(uid, e.streams[0]);
      };
      pc.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(pc.connectionState)) removePeer(uid);
      };

      peersRef.current.set(uid, pc);
      return pc;
    };

    const flushIce = async (uid: string, pc: RTCPeerConnection) => {
      const queued = pendingIceRef.current.get(uid);
      if (!queued) return;
      for (const c of queued) await pc.addIceCandidate(c).catch(() => {});
      pendingIceRef.current.delete(uid);
    };

    const start = async () => {
      setStatus("requesting-mic");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setStatus("ready");
        socket.emit("webrtc:join", { roomId });
      } catch {
        if (active) {
          setStatus("mic-denied");
          setError("Microphone permission is required for voice.");
        }
      }
    };

    const onPeers = ({ uids }: { uids: string[] }) => {
      // We are the initiator toward everyone already in the room.
      uids.forEach(async (uid) => {
        const pc = createPeer(uid);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc:offer", { roomId, toUid: uid, sdp: offer });
      });
    };

    const onOffer = async ({ fromUid, sdp }: { fromUid: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = createPeer(fromUid);
      await pc.setRemoteDescription(sdp);
      await flushIce(fromUid, pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc:answer", { roomId, toUid: fromUid, sdp: answer });
    };

    const onAnswer = async ({ fromUid, sdp }: { fromUid: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = peersRef.current.get(fromUid);
      if (pc) {
        await pc.setRemoteDescription(sdp);
        await flushIce(fromUid, pc);
      }
    };

    const onIce = async ({ fromUid, candidate }: { fromUid: string; candidate: RTCIceCandidateInit }) => {
      const pc = peersRef.current.get(fromUid);
      if (pc?.remoteDescription) {
        await pc.addIceCandidate(candidate).catch(() => {});
      } else {
        const q = pendingIceRef.current.get(fromUid) ?? [];
        q.push(candidate);
        pendingIceRef.current.set(fromUid, q);
      }
    };

    socket.on("webrtc:peers", onPeers);
    socket.on("webrtc:peer-offer", onOffer);
    socket.on("webrtc:peer-answer", onAnswer);
    socket.on("webrtc:peer-ice", onIce);
    void start();

    return () => {
      active = false;
      socket.off("webrtc:peers", onPeers);
      socket.off("webrtc:peer-offer", onOffer);
      socket.off("webrtc:peer-answer", onAnswer);
      socket.off("webrtc:peer-ice", onIce);
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      pendingIceRef.current.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setRemoteStreams([]);
      setStatus("off");
    };
  }, [enabled, socket, roomId, addRemote, removePeer]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }, [muted]);

  return {
    status,
    muted,
    toggleMute,
    remoteStreams,
    peerCount: remoteStreams.length,
    error,
  };
}
