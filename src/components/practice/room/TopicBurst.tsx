import { cn } from "@/lib/cn";

const COLORS = ["bg-purple", "bg-coral", "bg-ink-fixed", "bg-white"];
const SHAPES = ["h-2.5 w-1.5 rounded-sm", "h-2 w-2 rounded-full", "h-1.5 w-3 rounded-sm"];
const PIECES = 18;

/** Where each piece flies: spread all round, wider than tall, at uneven distances. */
const CONFETTI = Array.from({ length: PIECES }, (_, i) => {
  const angle = (i / PIECES) * 2 * Math.PI + (i % 2 ? 0.18 : -0.12);
  const distance = 80 + ((i * 37) % 70);
  return {
    x: Math.round(Math.cos(angle) * distance * 1.9),
    y: Math.round(Math.sin(angle) * distance * 0.9),
    r: ((i * 97) % 540) - 270,
    color: COLORS[i % COLORS.length],
    shape: SHAPES[i % SHAPES.length],
    delay: (i % 4) * 30,
  };
});

/**
 * A burst of confetti from the middle of the host banner when a new topic is
 * revealed. Render it keyed by the line's id so each reveal plays it once.
 */
export function TopicBurst() {
  return (
    <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-20 hidden motion-safe:block">
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className={cn("absolute block motion-safe:animate-confetti", c.color, c.shape)}
          style={
            {
              "--x": `${c.x}px`,
              "--y": `${c.y}px`,
              "--r": `${c.r}deg`,
              animationDelay: `${c.delay}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}
