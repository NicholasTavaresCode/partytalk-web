"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

/** The landing header's one action: "Sign in", or straight to the rooms for a returning user. */
export function LandingAuthLink() {
  const { user } = useAuth();
  return (
    <Link
      href="/practice"
      className="inline-flex h-9 items-center gap-1.5 rounded-pill px-4 text-sm font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/10"
    >
      {user ? (
        <>
          Your rooms <ArrowRight className="h-4 w-4" />
        </>
      ) : (
        "Sign in"
      )}
    </Link>
  );
}
