import { formatPrice } from "@/lib/format";

/**
 * Every price in the store goes through here, so every price is set in mono
 * (D36). `from` marks the low end of a variant range; `compareAt` is only shown
 * when it is actually higher.
 */
export function Price({
  cents,
  from = false,
  compareAt = null,
  nowrap = false,
  className = "",
}: {
  cents: number;
  from?: boolean;
  compareAt?: number | null;
  /** Keep price and sale price on one line — for narrow grid cards. */
  nowrap?: boolean;
  className?: string;
}) {
  const discounted = !from && compareAt !== null && compareAt > cents;
  return (
    <span
      className={`inline-flex items-baseline gap-x-2 ${nowrap ? "whitespace-nowrap" : "flex-wrap"} ${className}`}
    >
      <span className="font-mono tracking-tight">
        {from ? <span className="font-sans text-[0.85em] text-ink-600">From </span> : null}
        {formatPrice(cents)}
      </span>
      {discounted ? (
        <span className="font-mono text-[0.8em] text-ink-400 line-through">
          <span className="sr-only">was </span>
          {formatPrice(compareAt)}
        </span>
      ) : null}
    </span>
  );
}
