"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { GoogleLogo } from "@/components/brand/GoogleLogo";

const BUTTON =
  "flex w-full items-center justify-center gap-3 rounded-pill border-2 border-ink bg-lime px-6 py-2.5 font-display text-lg font-extrabold text-ink shadow-pop transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-lime-light hover:shadow-pop-sm active:translate-x-1 active:translate-y-1 active:shadow-none";

/**
 * The landing card's call to action. Signed out, it heads to `/practice` and
 * opens Google's account chooser (One Tap / FedCM) in the same click; picking an
 * account lands you on your rooms. If Google suppresses the chooser (it does
 * after repeated dismissals), the sign-in screen there has the official button.
 * Only Google's own button can open its sign-in popup directly, so this one can't.
 */
export function LandingSignInButton() {
  const { user, signIn } = useAuth();
  const router = useRouter();

  if (user) {
    return (
      <Link href="/practice" className={BUTTON}>
        Go to your rooms <ArrowRight className="h-5 w-5" />
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={BUTTON}
      onClick={() => {
        router.push("/practice");
        void signIn().catch(() => {});
      }}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-white">
        <GoogleLogo className="h-5 w-5" />
      </span>
      Sign in with Google
    </button>
  );
}
