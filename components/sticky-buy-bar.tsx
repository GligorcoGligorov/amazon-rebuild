import { formatPrice } from "@/lib/format";
import { AddToCartButton } from "./add-to-cart";

/**
 * Mobile only. Amazon's mobile product page puts Add to cart nearly 1,800px
 * down and offers no sticky bar — see D9. This keeps price and the buy action
 * reachable at any scroll position.
 */
export function StickyBuyBar({
  variantId,
  priceCents,
  inStock,
}: {
  variantId: string;
  priceCents: number;
  inStock: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <p className="text-lg font-bold leading-none">{formatPrice(priceCents)}</p>
        <div className="ml-auto w-40 shrink-0">
          <AddToCartButton
            variantId={variantId}
            priceCents={priceCents}
            inStock={inStock}
          />
        </div>
      </div>
    </div>
  );
}
