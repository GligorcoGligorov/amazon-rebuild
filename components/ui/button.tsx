type Variant = "primary" | "secondary" | "ink" | "quiet";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  // Clay is reserved for the step that moves money forward: add, checkout, pay.
  primary: "bg-accent text-accent-ink hover:bg-accent-hover",
  ink: "bg-ink-900 text-white hover:bg-ink-800",
  secondary: "border border-ink-900 text-ink-900 hover:bg-ink-900 hover:text-white",
  quiet: "text-ink-900 underline decoration-border underline-offset-4 hover:decoration-ink-900",
};

const sizes: Record<Size, string> = {
  md: "min-h-12 px-6 text-[0.9375rem]",
  sm: "min-h-10 px-4 text-sm",
};

/**
 * Class names rather than a component, because the same look goes on a
 * <button>, a <Link> and a form submit.
 */
export function buttonClass({
  variant = "primary",
  size = "md",
  className = "",
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return `${base} ${variants[variant]} ${variant === "quiet" ? "" : sizes[size]} ${className}`;
}
