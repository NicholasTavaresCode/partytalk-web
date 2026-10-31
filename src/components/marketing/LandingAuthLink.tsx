"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { TalkingIcon } from "./TalkingIcon";

/** The landing header's one action: "Sign in", or straight to the rooms for a returning user. */
export function LandingAuthLink() {
  const { user } = useAuth();
  return (
    <Link
      href="/practice"
      className="inline-flex h-10 items-center gap-1.5 rounded-pill border-2 border-ink bg-purple px-5 font-display text-sm font-bold text-white shadow-pop-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
    >
      {user ? (
        <>
          Your rooms <ArrowRight className="h-4 w-4" />
        </>
      ) : (
        <>
          Sign in <TalkingIcon className="h-5 w-5 text-ink" bubbleClassName="fill-lime" />
        </>
      )}
    </Link>
  );
}
