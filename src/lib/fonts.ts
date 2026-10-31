import { Arimo, Sora } from "next/font/google";

/**
 * Arimo — the Arial-metric sans used for body text and app surfaces.
 */
export const arimo = Arimo({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-arimo",
  display: "swap",
});

/**
 * Sora — a warmer geometric display face used for PartyTalk's marketing and
 * group-practice headlines, giving the social product its own personality.
 */
export const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});
