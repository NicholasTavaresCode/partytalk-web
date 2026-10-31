import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "lime" | "purple" | "outline" | "ghost" | "danger" | "white";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-pill font-display font-bold transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2";

/** Chunky pill: 2px ink border and a hard `pop` shadow that presses in on hover. */
const pop =
  "border-2 border-ink shadow-pop-sm hover:translate-x-px hover:translate-y-px hover:shadow-none active:translate-x-0.5 active:translate-y-0.5";

const variants: Record<Variant, string> = {
  primary: cn(pop, "bg-ink text-cream"),
  lime: cn(pop, "bg-lime text-ink hover:bg-lime-light"),
  purple: cn(pop, "bg-purple text-white"),
  outline: cn(pop, "bg-white text-ink hover:bg-lime/30"),
  ghost: "text-on-surface-variant hover:bg-surface-container hover:text-ink",
  danger: cn(pop, "bg-secondary text-on-secondary"),
  white: cn(pop, "bg-white text-ink"),
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-12 px-6 text-base",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

type ButtonProps = CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type AnchorProps = CommonProps & { href: string } & Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    "href"
  >;

export function Button(props: ButtonProps | AnchorProps) {
  const { variant = "primary", size = "md", className, children } = props;
  const classes = cn(base, variants[variant], sizes[size], className);

  if ("href" in props && props.href !== undefined) {
    const { href, variant: _v, size: _s, className: _c, children: _ch, ...rest } = props;
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  const { variant: _v, size: _s, className: _c, children: _ch, ...rest } = props as ButtonProps;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
