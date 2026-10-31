"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { roomsApi } from "./api/rooms";
import type { RoomsSocket } from "./socket";

/** Used only if the API's ICE servers can't be fetched: enough for most home networks. */
const FALLBACK_ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

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
  /** The signed-in user's uid — breaks offer glare deterministically (see onOffer). */
  selfUid?: string;
  /** Silence our outgoing audio (the room's mic button) without dropping any connection. */
  muted: boolean;
}

/**
 * P2P mesh voice over the backend's `webrtc:*` signaling relay
 * (docs/audio-architecture.md, M1). One RTCPeerConnection per peer; media never
 * touches the server, so audio latency is just the network path between browsers.
 *
 * The joiner offers to everyone already in the mesh (`webrtc:peers`), so there is
 * no offer glare. Any new offer or peers list means that side (re)joined, so the
 * old connection to that uid is replaced rather than renegotiated.
 *
 * ICE servers come from the API (`GET /rooms/:id/ice-servers`): STUN plus, when the
 * deployment has a relay, TURN with a short-lived credential for this user — what
 * lets peers on strict NATs (mobile data, corporate Wi-Fi) still hear each other.
 */
export function useVoiceMesh({ socket, roomId, enabled, selfUid, muted }: Options) {
  const [micStatus, setMicStatus] = useState<Exclude<VoiceStatus, "connected">>("off");
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  /** The local mic stream once acquired (for level metering / speaking indicators). */
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const iceServersRef = useRef<RTCIceServer[]>(FALLBACK_ICE_SERVERS);
  // Read when the mic is acquired, so the new track starts in the right state.
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const addRemote = useCallback((uid: string, stream: MediaStream) => {
    setRemoteStreams((prev) => {
      const rest = prev.filter((r) => r.uid !== uid);
      return [...rest, { uid, stream }];
    });
  }, []);

  const removePeer = useCallback((uid: string) => {
    peersRef.current.get(uid)?.close();
    peersRef.current.delete(uid);
    pendingIceRef.current.delete(uid);
    setRemoteStreams((prev) => prev.filter((r) => r.uid !== uid));
  }, []);

  const removeAllPeers = useCallback(() => {
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    pendingIceRef.current.clear();
    setRemoteStreams([]);
  }, []);

  useEffect(() => {
    if (!enabled || !socket) return;
    let active = true;

    const join = () => socket.emit("webrtc:join", { roomId });

    // Never throws: without the API's list, STUN alone still connects most peers.
    const loadIceServers = async () => {
      try {
        iceServersRef.current = (await roomsApi.iceServers(roomId)).iceServers;
      } catch {
        iceServersRef.current = FALLBACK_ICE_SERVERS;
      }
    };

    const createPeer = (uid: string): RTCPeerConnection => {
      removePeer(uid);

      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
      localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
      // Events from a connection we've since replaced must not touch the new one.
      const current = () => peersRef.current.get(uid) === pc;

      pc.onicecandidate = (e) => {
        if (e.candidate && current()) {
          socket.emit("webrtc:ice", { roomId, toUid: uid, candidate: e.candidate.toJSON() });
        }
      };
      pc.ontrack = (e) => {
        if (e.streams[0] && current()) addRemote(uid, e.streams[0]);
      };
      pc.onconnectionstatechange = () => {
        // "disconnected" is often transient (ICE recovers on its own); only drop on hard failure.
        if (current() && (pc.connectionState === "failed" || pc.connectionState === "closed")) {
          removePeer(uid);
        }
      };

      peersRef.current.set(uid, pc);
      return pc;
    };

    const flushIce = async (uid: string, pc: RTCPeerConnection) => {
      const queued = pendingIceRef.current.get(uid);
      if (!queued) return;
      pendingIceRef.current.delete(uid);
      for (const c of queued) await pc.addIceCandidate(c).catch(() => {});
    };

    const start = async () => {
      setMicStatus("requesting-mic");
      try {
        const [stream] = await Promise.all([
          navigator.mediaDevices.getUserMedia({ audio: true, video: false }),
          loadIceServers(),
        ]);
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.getAudioTracks().forEach((t) => (t.enabled = !mutedRef.current));
        localStreamRef.current = stream;
        setLocalStream(stream);
        setMicStatus("ready");
        // Not connected yet → onConnect joins once the socket is up.
        if (socket.connected) join();
      } catch {
        if (active) {
          setMicStatus("mic-denied");
          setError("Microphone permission is required for voice.");
        }
      }
    };

    // The server drops us from the mesh (and peers drop us) on disconnect, so a
    // reconnect rebuilds every connection from a fresh peers list — and with fresh
    // ICE servers, since the TURN credential may have expired meanwhile.
    const onConnect = async () => {
      if (!localStreamRef.current) return;
      await loadIceServers();
      if (!active) return;
      removeAllPeers();
      join();
    };

    const onPeers = ({ uids }: { uids: string[] }) => {
      uids.forEach(async (uid) => {
        const pc = createPeer(uid);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc:offer", { roomId, toUid: uid, sdp: offer });
      });
    };

    const onOffer = async ({ fromUid, sdp }: { fromUid: string; sdp: RTCSessionDescriptionInit }) => {
      // Glare: we joined at the same moment (everyone does when the host starts)
      // and offered each other. The lower uid keeps its own offer — the peer will
      // answer it — and the higher uid drops its offer and answers this one.
      const mine = peersRef.current.get(fromUid);
      if (mine?.signalingState === "have-local-offer" && selfUid && selfUid < fromUid) return;
      const pc = createPeer(fromUid);
      await pc.setRemoteDescription(sdp);
      await flushIce(fromUid, pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc:answer", { roomId, toUid: fromUid, sdp: answer });
    };

    const onAnswer = async ({ fromUid, sdp }: { fromUid: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = peersRef.current.get(fromUid);
      // Only an outstanding offer takes an answer; anything else replies to an
      // offer that glare resolution or a re-join already replaced.
      if (pc?.signalingState !== "have-local-offer") return;
      await pc.setRemoteDescription(sdp);
      await flushIce(fromUid, pc);
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

    const onPeerLeft = ({ uid }: { uid: string }) => removePeer(uid);

    socket.on("connect", onConnect);
    socket.on("webrtc:peers", onPeers);
    socket.on("webrtc:peer-offer", onOffer);
    socket.on("webrtc:peer-answer", onAnswer);
    socket.on("webrtc:peer-ice", onIce);
    socket.on("webrtc:peer-left", onPeerLeft);
    void start();

    return () => {
      active = false;
      socket.off("connect", onConnect);
      socket.off("webrtc:peers", onPeers);
      socket.off("webrtc:peer-offer", onOffer);
      socket.off("webrtc:peer-answer", onAnswer);
      socket.off("webrtc:peer-ice", onIce);
      socket.off("webrtc:peer-left", onPeerLeft);
      removeAllPeers();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
      setRemoteStreams([]);
      setMicStatus("off");
    };
  }, [enabled, socket, roomId, selfUid, addRemote, removePeer, removeAllPeers]);

  // Muting disables the track, so peers keep their connection and just hear silence.
  useEffect(() => {
    localStream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }, [localStream, muted]);

  return {
    status: (micStatus === "ready" && remoteStreams.length > 0 ? "connected" : micStatus) as VoiceStatus,
    localStream,
    remoteStreams,
    peerCount: remoteStreams.length,
    error,
  };
}
