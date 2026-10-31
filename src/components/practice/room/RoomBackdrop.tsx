import { MessageCircle, MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

/** Soft brand-colored glows that wander slowly behind everything. */
const GLOWS = [
  { cls: "-left-[12%] -top-[18%] h-[60vmax] w-[60vmax]", color: "#d2e823", duration: "26s", delay: "0s" },
  { cls: "-right-[18%] top-[10%] h-[55vmax] w-[55vmax]", color: "#7924ff", duration: "31s", delay: "-9s" },
  { cls: "-bottom-[30%] left-[20%] h-[50vmax] w-[50vmax]", color: "#ff522b", duration: "23s", delay: "-15s" },
];

/**
 * Speech bubbles and sparkles rising along the room's edges, behind the tiles.
 * Negative delays put them mid-flight on arrival instead of all starting at the bottom.
 */
const FLOATERS = [
  { Icon: MessageCircle, left: "3%", size: 26, duration: "19s", delay: "-2s", cls: "text-purple/40" },
  { Icon: Sparkles, left: "9%", size: 16, duration: "23s", delay: "-13s", cls: "text-coral/60" },
  { Icon: MessageSquare, left: "6%", size: 18, duration: "27s", delay: "-21s", cls: "text-ink/20" },
  { Icon: MessageSquare, left: "92%", size: 24, duration: "21s", delay: "-6s", cls: "text-coral/45" },
  { Icon: Sparkles, left: "88%", size: 18, duration: "25s", delay: "-17s", cls: "text-purple/50" },
  { Icon: MessageCircle, left: "95%", size: 16, duration: "18s", delay: "-11s", cls: "text-ink/20" },
];

/**
 * The live room's ambience: drifting glows, the landing's dot texture and a few
 * floating bubbles. Decorative only, and still for people who prefer reduced
 * motion (the floaters then stay hidden below the fold).
 */
export function RoomBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {GLOWS.map((g) => (
        <div
          key={g.color}
          className={cn(
            "absolute rounded-full opacity-[0.22] will-change-transform motion-safe:animate-drift dark:opacity-[0.14]",
            g.cls,
          )}
          style={{
            background: `radial-gradient(closest-side, ${g.color}, transparent)`,
            animationDuration: g.duration,
            animationDelay: g.delay,
          }}
        />
      ))}

      <div className="bg-dots absolute inset-0" />

      {FLOATERS.map(({ Icon, left, size, duration, delay, cls }, i) => (
        <span
          key={i}
          className="absolute -bottom-12 motion-safe:animate-rise"
          style={{ left, animationDuration: duration, animationDelay: delay }}
        >
          <span className="block motion-safe:animate-sway" style={{ animationDelay: `${i * -0.7}s` }}>
            <Icon className={cls} style={{ width: size, height: size }} strokeWidth={2.25} />
          </span>
        </span>
      ))}
    </div>
  );
}
