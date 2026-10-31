import type { Metadata } from "next";
import { bricolage, jakarta, spaceGrotesk } from "@/lib/fonts";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/cn";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PartyTalk — Practice English together, guided by AI",
    template: "%s · PartyTalk",
  },
  description:
    "PartyTalk brings language learners into small live rooms to practise English out loud, guided by an AI host that listens in and moves the group on to new topics.",
  applicationName: "PartyTalk",
  keywords: ["English practice", "language exchange", "speaking practice", "AI host"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn(jakarta.variable, bricolage.variable, spaceGrotesk.variable)}>
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
