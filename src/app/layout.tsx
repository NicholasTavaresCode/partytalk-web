import type { Metadata } from "next";
import { arimo, sora } from "@/lib/fonts";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/cn";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PartyTalk — Practice English together, guided by AI",
    template: "%s · PartyTalk",
  },
  description:
    "PartyTalk brings language learners into small live rooms to practise English out loud, guided by a friendly AI host — plus a faithful IELTS exam simulator for Listening, Reading, Writing and Speaking.",
  applicationName: "PartyTalk",
  keywords: ["English practice", "language exchange", "IELTS simulator", "speaking practice", "AI tutor"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn(arimo.variable, sora.variable)}>
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
