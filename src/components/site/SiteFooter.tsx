import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";

const COLUMNS = [
  {
    title: "Practice",
    links: [
      { label: "Group rooms", href: "/practice" },
      { label: "Create a room", href: "/practice" },
      { label: "How it works", href: "/#how" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/#" },
      { label: "Blog", href: "/#" },
      { label: "Help centre", href: "/#" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-outline-variant bg-white">
      <div className="mx-auto grid max-w-content gap-10 px-6 py-14 lg:grid-cols-[1.4fr_repeat(2,1fr)] lg:px-8">
        <div className="max-w-xs">
          <Wordmark />
          <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">
            Practise speaking a new language in small live rooms, guided by a friendly AI host.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-pill border border-outline-variant bg-surface-container-low px-3 py-1 text-xs font-medium text-on-surface-variant">
            <span className="h-2 w-2 rounded-full bg-tertiary-fixed-dim" />
            English available now · more languages soon
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="text-label-caps font-label-caps uppercase text-on-surface-variant">
              {col.title}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-on-surface-variant transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-outline-variant">
        <div className="mx-auto flex max-w-content flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-on-surface-variant sm:flex-row lg:px-8">
          <p>© {2026} PartyTalk. Practice makes fluent.</p>
          <div className="flex gap-5">
            <Link href="/#" className="hover:text-primary">
              Privacy
            </Link>
            <Link href="/#" className="hover:text-primary">
              Terms
            </Link>
            <Link href="/#" className="hover:text-primary">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
