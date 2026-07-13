import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "gold" | "outline" | "ghost" | "danger" | "white";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-container shadow-sm",
  gold: "bg-tertiary-fixed text-on-tertiary-fixed hover:bg-tertiary-fixed-dim",
  outline: "border border-outline text-on-surface hover:border-primary hover:text-primary",
  ghost: "text-on-surface-variant hover:bg-surface-container",
  danger: "bg-secondary text-on-secondary hover:bg-secondary-container",
  white: "bg-white text-primary hover:bg-white/90 shadow-sm",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
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
