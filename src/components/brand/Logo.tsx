import { cn } from "@/lib/cn";

interface LogoProps {
  className?: string;
  /** Render for placement on a dark (navy) surface. */
  onDark?: boolean;
}

/**
 * The PartyTalk mark: a speech bubble (conversation) with three dots (a live
 * chat) and a gold spark (the AI host). Recreated from the Stitch logo asset.
 */
export function Logo({ className, onDark = false }: LogoProps) {
  const bubble = onDark ? "#ffffff" : "#003366";
  const dots = onDark ? "#001e40" : "#ffffff";

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("h-9 w-9", className)}
      role="img"
      aria-label="PartyTalk"
    >
      <path
        d="M28 26h44a10 10 0 0 1 10 10v22a10 10 0 0 1-10 10H50L36 82V68h-8a10 10 0 0 1-10-10V36a10 10 0 0 1 10-10z"
        fill={bubble}
      />
      <circle cx="38" cy="47" r="4.5" fill={dots} />
      <circle cx="50" cy="47" r="4.5" fill={dots} />
      <circle cx="62" cy="47" r="4.5" fill={dots} />
      <path
        d="M79 10l2.6 6.6L88 19l-6.4 2.6L79 28l-2.6-6.4L70 19l6.4-2.4z"
        fill="#ffe16d"
      />
    </svg>
  );
}
