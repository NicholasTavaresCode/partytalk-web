import { Mic, Video, Smile, PhoneOff } from "lucide-react";
import { ParticipantAvatar } from "@/components/practice/ParticipantAvatar";
import { cn } from "@/lib/cn";

const PEOPLE = [
  { name: "Lucas", flag: "🇧🇷", speaking: true },
  { name: "Mei", flag: "🇨🇳" },
  { name: "Omar", flag: "🇪🇬" },
  { name: "Sofia", flag: "🇪🇸" },
];

/** Decorative "live room" card used as the hero visual. Pure CSS animation. */
export function RoomPreview({ className }: { className?: string }) {
  return (
    <div className={cn("w-full max-w-md", className)}>
      <div className="rounded-3xl border border-outline-variant bg-white p-5 shadow-[0_24px_70px_-20px_rgba(0,30,64,0.35)]">
        {/* header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-secondary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-secondary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" /> Live
            </span>
            <span className="text-sm font-semibold text-on-surface">Sunday Coffee Chat</span>
          </div>
          <span className="rounded-pill bg-surface-container px-2 py-0.5 text-[11px] font-bold text-on-surface-variant">
            A2
          </span>
        </div>

        {/* participants */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {PEOPLE.map((p) => (
            <div
              key={p.name}
              className={cn(
                "flex items-center gap-2.5 rounded-2xl border p-2.5",
                p.speaking ? "border-emerald-300 bg-emerald-50/60" : "border-outline-variant bg-surface-container-low",
              )}
            >
              <ParticipantAvatar name={p.name} flag={p.flag} speaking={p.speaking} size={38} showFlag />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-on-surface">{p.name}</p>
                {p.speaking ? (
                  <span className="flex items-end gap-0.5" aria-hidden>
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className="w-0.5 animate-pulse rounded-full bg-emerald-500"
                        style={{ height: 6 + ((i * 5) % 12), animationDelay: `${i * 120}ms` }}
                      />
                    ))}
                  </span>
                ) : (
                  <p className="text-[11px] text-on-surface-variant">{p.flag} listening</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* AI host guidance */}
        <div className="mt-3 rounded-2xl bg-primary p-3.5 text-on-primary">
          <div className="flex items-center gap-2">
            <ParticipantAvatar name="Aria" isAI size={26} />
            <span className="text-xs font-bold">Aria</span>
            <span className="rounded-pill bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              AI host
            </span>
          </div>
          <p className="mt-2 text-sm leading-snug text-white/90">
            “Nice! Small tip — use the past tense:{" "}
            <span className="font-semibold text-tertiary-fixed underline decoration-tertiary-fixed/70 decoration-2 underline-offset-2">
              I went to the beach.
            </span>
            ”
          </p>
        </div>

        {/* controls */}
        <div className="mt-4 flex items-center justify-center gap-2.5">
          {[Mic, Video, Smile].map((Icon, i) => (
            <span
              key={i}
              className="grid h-10 w-10 place-items-center rounded-full bg-surface-container text-on-surface-variant"
            >
              <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
            </span>
          ))}
          <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-on-secondary">
            <PhoneOff style={{ width: 18, height: 18 }} />
          </span>
        </div>
      </div>
    </div>
  );
}
