import { clsx, type ClassValue } from "clsx";

/** Tiny className combiner used throughout the UI. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
