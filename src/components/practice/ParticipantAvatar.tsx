import { cn } from "@/lib/cn";

function hue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface AvatarProps {
  name: string;
  flag?: string;
  isAI?: boolean;
  speaking?: boolean;
  size?: number;
  showFlag?: boolean;
  className?: string;
}

export function ParticipantAvatar({
  name,
  flag,
  isAI,
  speaking,
  size = 44,
  showFlag = false,
  className,
}: AvatarProps) {
  const h = hue(name);
  const background = isAI
    ? "linear-gradient(135deg, #7924ff 0%, #5a12d6 70%, #d2e823 150%)"
    : `linear-gradient(135deg, hsl(${h} 62% 42%), hsl(${(h + 40) % 360} 66% 55%))`;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        speaking && "ring-2 ring-lime ring-offset-2 ring-offset-white",
        className,
      )}
      style={{ width: size, height: size, background, fontSize: size * 0.36 }}
    >
      {isAI ? "✦" : initials(name)}
      {showFlag && flag && (
        <span
          className="absolute -bottom-1 -right-1 grid place-items-center rounded-full bg-card shadow-sm"
          style={{ width: size * 0.42, height: size * 0.42, fontSize: size * 0.24 }}
        >
          {flag}
        </span>
      )}
    </span>
  );
}
