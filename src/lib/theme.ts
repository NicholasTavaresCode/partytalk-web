"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const KEY = "partytalk:theme";
const listeners = new Set<() => void>();

/** Stored per device; anything unreadable (private mode, blocked storage) means light. */
function read(): Theme {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange); // other tabs
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* not persisted; this tab still switches */
  }
  listeners.forEach((l) => l());
}

/**
 * The signed-in app's theme. The server (and the first client render, during
 * hydration) always sees "light", so markup matches; the stored choice applies
 * right after. Only ThemeScope acts on it — public pages stay light.
 */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, read, () => "light");
}
