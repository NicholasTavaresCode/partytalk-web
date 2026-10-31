"use client";

import type { ReactNode } from "react";
import { useTheme } from "@/lib/theme";

/**
 * Applies the dark theme to what's inside it: the `.dark` class swaps the colour
 * variables (globals.css) for everything below. Wraps signed-in screens only
 * (RequireAuth), so the landing and sign-in pages always stay light.
 */
export function ThemeScope({ children }: { children: ReactNode }) {
  const theme = useTheme();
  if (theme !== "dark") return <>{children}</>;
  return <div className="dark min-h-screen bg-surface text-on-surface">{children}</div>;
}
