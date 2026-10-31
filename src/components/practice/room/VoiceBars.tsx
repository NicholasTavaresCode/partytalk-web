import { cn } from "@/lib/cn";

/**
 * Meet-style "someone is talking" chip: three bars in a lime disc. With a
 * `level` the bars follow the mic; without one they loop a gentle bounce.
 */
export function VoiceBars({
  level,
  size = 28,
  className,
}: {
  level?: number;
  size?: number;
  className?: string;
}) {
  const scales =
    level === undefined
      ? [undefined, undefined, undefined]
      : [0.35 + level * 0.5, 0.35 + Math.min(1, level * 1.4) * 0.65, 0.35 + level * 0.5];

  return (
    <span
      role="img"
      aria-label="Speaking"
      className={cn("grid place-items-center rounded-full bg-lime text-ink-fixed", className)}
      style={{ width: size, height: size }}
    >
      <span className="flex items-center gap-[2px]" style={{ height: size * 0.45 }}>
        {scales.map((s, i) => (
          <span
            key={i}
            className={cn("block w-[3px] origin-center rounded-full bg-current", s === undefined && "animate-voice-bar")}
            style={{
              height: "100%",
              transform: s === undefined ? undefined : `scaleY(${s})`,
              transition: s === undefined ? undefined : "transform 90ms linear",
              animationDelay: s === undefined ? `${i * 0.15}s` : undefined,
            }}
          />
        ))}
      </span>
    </span>
  );
}
