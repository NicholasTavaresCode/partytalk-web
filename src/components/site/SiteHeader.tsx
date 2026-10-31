"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { IELTS_ENABLED } from "@/lib/features";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";

const NAV = [
  { label: "Group Practice", href: "/practice" },
  ...(IELTS_ENABLED ? [{ label: "IELTS Prep", href: "/ielts" }] : []),
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between px-6 lg:px-8">
        <Link href="/" aria-label="PartyTalk home" className="rounded-lg">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active =
              item.href.startsWith("/") &&
              !item.href.includes("#") &&
              pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-[15px] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button href="/practice" variant="ghost" size="sm">
            Sign in
          </Button>
          <Button href="/practice" size="sm">
            Get started
          </Button>
        </div>

        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-outline-variant/70 bg-white md:hidden">
          <div className="mx-auto flex max-w-content flex-col gap-1 px-6 py-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-on-surface hover:bg-surface-container"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              <Button href="/practice" variant="outline" size="sm" className="flex-1">
                Sign in
              </Button>
              <Button href="/practice" size="sm" className="flex-1">
                Get started
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
