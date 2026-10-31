import { cn } from "@/lib/cn";

interface LogoProps {
  className?: string;
  /** Render for placement on a dark (ink) surface: the pop shadow would vanish there. */
  onDark?: boolean;
}

/**
 * The PartyTalk mark: a speech bubble (conversation) with three dots (a live
 * chat) in a lime disc with an ink keyline and pop shadow, plus a purple spark
 * (the AI host).
 */
export function Logo({ className, onDark = false }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("h-9 w-9", className)}
      role="img"
      aria-label="PartyTalk"
    >
      {!onDark && <circle cx="51" cy="51" r="44" fill="#141517" />}
      <circle cx="46" cy="46" r="42" fill="#d2e823" stroke="#141517" strokeWidth="5" />
      <path
        d="M31 30h30a8 8 0 0 1 8 8v16a8 8 0 0 1-8 8H47L36 71V62h-5a8 8 0 0 1-8-8V38a8 8 0 0 1 8-8z"
        fill="#141517"
      />
      <circle cx="37" cy="46" r="3.6" fill="#d2e823" />
      <circle cx="46" cy="46" r="3.6" fill="#d2e823" />
      <circle cx="55" cy="46" r="3.6" fill="#d2e823" />
      <path
        d="M80 6l3 7.6 7.4 2.8-7.4 3L80 27l-3-7.6-7.4-3 7.4-2.8z"
        fill="#7924ff"
        stroke="#141517"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
