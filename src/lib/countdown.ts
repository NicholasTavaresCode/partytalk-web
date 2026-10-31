"use client";

import { useEffect, useState } from "react";

/** Milliseconds until `scheduledEndAt` (never negative), or null if there is no deadline. */
export function remainingMs(scheduledEndAt: string | undefined, now: number): number | null {
  if (!scheduledEndAt) return null;
  const end = Date.parse(scheduledEndAt);
  if (Number.isNaN(end)) return null;
  return Math.max(0, end - now);
}

/** `m:ss`, or `h:mm:ss` from an hour up. Rounds up so the display never hits 0:00 early. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** Ticks once a second while there is a deadline. */
export function useCountdown(scheduledEndAt: string | undefined): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!scheduledEndAt) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [scheduledEndAt]);
  return remainingMs(scheduledEndAt, now);
}
