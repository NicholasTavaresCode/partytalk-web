import { cn } from "@/lib/cn";

/**
 * A speech bubble with typing dots: the "let's talk" icon on the landing's
 * Sign in button. It wiggles every few seconds and its dots type in turn, to
 * draw the eye; both hold still under `prefers-reduced-motion`.
 */
export function TalkingIcon({
  className,
  bubbleClassName = "fill-white",
}: {
  className?: string;
  /** The bubble's fill; its outline and dots take the text colour. */
  bubbleClassName?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinejoin="round"
      aria-hidden
      className={cn("shrink-0 motion-safe:animate-nudge", className)}
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" className={bubbleClassName} />
      {[8, 12, 16].map((cx, i) => (
        <circle
          key={cx}
          cx={cx}
          cy={12}
          r={1.5}
          fill="currentColor"
          stroke="none"
          className="motion-safe:animate-typing-dot"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </svg>
  );
}
