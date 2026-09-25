import { AddToCartButton } from "./add-to-cart";
import { Price } from "./ui/price";

/**
 * Mobile only. Keeps price and the buy action reachable at any scroll position
 * (D9), and names the chosen options so the shopper knows which one they are
 * adding without scrolling back up.
 */
export function StickyBuyBar({
  variantId,
  priceCents,
  inStock,
  detail,
  slug,
}: {
  variantId: string;
  priceCents: number;
  inStock: boolean;
  detail: string | null;
  slug: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-900 bg-page lg:hidden">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <Price cents={priceCents} className="text-lg leading-none" />
          {detail ? <p className="mt-1 truncate text-xs text-ink-600">{detail}</p> : null}
        </div>
        <div className="ml-auto w-44 shrink-0">
          <AddToCartButton
            variantId={variantId}
            priceCents={priceCents}
            inStock={inStock}
            slug={slug}
          />
        </div>
      </div>
    </div>
  );
}
