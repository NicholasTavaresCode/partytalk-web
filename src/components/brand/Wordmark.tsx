import { cn } from "@/lib/cn";
import { Logo } from "./Logo";

interface WordmarkProps {
  className?: string;
  onDark?: boolean;
  logoClassName?: string;
  textClassName?: string;
}

export function Wordmark({ className, onDark, logoClassName, textClassName }: WordmarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Logo onDark={onDark} className={cn("h-9 w-9 shrink-0", logoClassName)} />
      <span
        className={cn(
          "font-display text-[21px] font-extrabold leading-none tracking-tight",
          onDark ? "text-white" : "text-ink",
          textClassName,
        )}
      >
        PartyTalk
      </span>
    </span>
  );
}
