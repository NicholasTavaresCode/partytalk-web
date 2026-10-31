"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { FRESH_WINDOW_MS } from "./hostVoice";
import type { HostMessage } from "./types";

/** How long the room counts down before the host's new topic appears and is spoken. */
export const REVEAL_DELAY_MS = 3000;

export interface RevealSnapshot {
  /** Ids of the host lines the room can see (and the host may speak). */
  shown: ReadonlySet<string>;
  /** The line being counted down to, and when (epoch ms) it appears. */
  incoming: { message: HostMessage; at: number } | null;
  /** The last line revealed after a countdown (history never sets it). */
  revealed: string | null;
}

export interface TopicReveal {
  /**
   * Feed the current host-message list. A line that just arrived is held back
   * for the countdown (one at a time, oldest first); anything older than the
   * fresh window (history from REST, a line missed while disconnected) shows at once.
   */
  onMessages(messages: HostMessage[]): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): RevealSnapshot;
  /** Clears the timer. The line being counted down to goes back to the front of
   * the queue, and the next `onMessages` starts its countdown again. */
  stop(): void;
}

const timeOf = (m: HostMessage) => Date.parse(m.at);

export function createTopicReveal(delayMs = REVEAL_DELAY_MS): TopicReveal {
  const seen = new Set<string>();
  const queue: HostMessage[] = [];
  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let snapshot: RevealSnapshot = { shown: new Set(), incoming: null, revealed: null };

  const publish = (next: Partial<RevealSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    listeners.forEach((listener) => listener());
  };
  const withShown = (ids: string[]) => new Set([...snapshot.shown, ...ids]);

  const startNext = () => {
    const message = queue.shift();
    if (!message) return;
    publish({ incoming: { message, at: Date.now() + delayMs } });
    timer = setTimeout(() => {
      timer = undefined;
      publish({ shown: withShown([message.id]), incoming: null, revealed: message.id });
      startNext();
    }, delayMs);
  };

  return {
    onMessages(messages) {
      const now = Date.now();
      const stale: string[] = [];
      const unseen = messages.filter((m) => !seen.has(m.id)).sort((a, b) => timeOf(a) - timeOf(b));
      for (const m of unseen) {
        seen.add(m.id);
        // An unparseable time counts as new, as it does for the host's voice.
        if (now - timeOf(m) > FRESH_WINDOW_MS) stale.push(m.id);
        else queue.push(m);
      }
      if (stale.length) publish({ shown: withShown(stale) });
      if (!timer) startNext();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    stop() {
      if (!timer) return;
      clearTimeout(timer);
      timer = undefined;
      if (snapshot.incoming) queue.unshift(snapshot.incoming.message);
      publish({ incoming: null });
    },
  };
}

/**
 * Hold each new host line back for a short countdown, so the room hears the
 * change coming before the topic appears and the host speaks it. Returns the
 * lines to show and the one being counted down to.
 */
export function useTopicReveal(messages: HostMessage[]) {
  const [reveal] = useState(() => createTopicReveal());
  useEffect(() => () => reveal.stop(), [reveal]);
  useEffect(() => {
    reveal.onMessages(messages);
  }, [reveal, messages]);
  const { shown, incoming, revealed } = useSyncExternalStore(
    reveal.subscribe,
    reveal.getSnapshot,
    reveal.getSnapshot,
  );
  const visible = useMemo(() => messages.filter((m) => shown.has(m.id)), [messages, shown]);
  return { visible, incoming, revealed };
}
