import { formatPrice } from "@/lib/format";

/**
 * Mobile only. Amazon's mobile product page puts Add to cart nearly 1,800px
 * down and offers no sticky bar — see D9. This keeps price and the buy action
 * reachable at any scroll position.
 *
 * Inert until M4 wires the cart; the button is disabled rather than absent so
 * the layout it occupies is already settled.
 */
export function StickyBuyBar({
  priceCents,
  inStock,
  title,
}: {
  priceCents: number;
  inStock: boolean;
  title: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-lg font-bold leading-none">{formatPrice(priceCents)}</p>
          <p className="mt-1 truncate text-xs text-ink-400">
            Cart opens in the next update
          </p>
        </div>
        <button
          type="button"
          disabled
          className="ml-auto shrink-0 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {inStock ? "Add to cart" : "Out of stock"}
          <span className="sr-only"> — {title}</span>
        </button>
      </div>
    </div>
  );
}
