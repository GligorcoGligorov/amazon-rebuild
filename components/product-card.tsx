import Image from "next/image";
import Link from "next/link";
import type { ProductCard as Card } from "@/lib/db/queries/catalog";
import { formatRating } from "@/lib/format";
import { AddToCartButton } from "./add-to-cart";
import { CatalogueNo } from "./ui/catalogue-no";
import { Price } from "./ui/price";

const footerAction =
  "flex min-h-10 w-full items-center justify-center rounded-md border text-sm font-medium";

/**
 * No box, no shadow: a photo on the neutral well, then type. Every card in
 * every category sits on the same well, so a laptop and a dress read as one
 * catalogue (D36).
 *
 * Every card ends in the same two rows — price, then one 40px action — pinned
 * to the bottom, so prices and actions line up across a grid row whatever the
 * title length or the product's state.
 */
export function ProductCard({ product }: { product: Card }) {
  const rating = formatRating(product.rating);
  const hasRange = product.minPriceCents !== product.maxPriceCents;

  return (
    <article className="group relative flex h-full flex-col">
      <div className="relative aspect-square overflow-hidden bg-well">
        <Image
          src={product.image}
          alt=""
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain p-[12%] transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
      </div>

      <div className="flex flex-1 flex-col pt-3">
        {/* Meta row carries the rating, so the price row never has to share
            its width with it — at 375px a sale price and a rating do not fit
            on one line together. */}
        <p className="flex min-w-0 items-center gap-2">
          <CatalogueNo slug={product.slug} className="shrink-0" />
          {product.brand ? (
            <span className="eyebrow min-w-0 truncate text-ink-400">{product.brand}</span>
          ) : null}
          {rating ? (
            <span className="ml-auto shrink-0 font-mono text-[0.6875rem] text-ink-600">
              {rating}
              <span aria-hidden="true">★</span>
              <span className="sr-only"> out of 5 stars</span>
            </span>
          ) : null}
        </p>

        {/* Two lines reserved, so a one-line title does not lift its price. */}
        <h3 className="mt-1 line-clamp-2 min-h-[2.75em] text-[0.9375rem] leading-snug font-medium">
          {/* Stretched link: the whole card is the target, but only the title
              text is in the accessibility tree as the link name. Controls that
              sit above it need `relative z-10` to stay clickable. */}
          <Link
            href={`/product/${product.slug}`}
            className="after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-4"
          >
            {product.title}
          </Link>
        </h3>

        <div className="mt-auto pt-2">
          <Price
            cents={product.minPriceCents}
            from={hasRange}
            compareAt={product.compareAtCents}
            nowrap
            className="text-sm sm:text-[0.9375rem]"
          />

          <div className="mt-3">
            {!product.inStock ? (
              <p className={`${footerAction} border-dashed border-rule-strong text-ink-400`}>
                Out of stock
              </p>
            ) : product.hasOptions ? (
              // Looks like a button, and is one in effect: it sits under the
              // stretched title link, so clicking it opens the product page to
              // choose (D7). Not a second link, so each card stays one tab stop.
              <p
                className={`${footerAction} border-ink-900 transition-colors group-hover:bg-ink-900 group-hover:text-white`}
              >
                See options
                <span aria-hidden="true" className="ml-1.5">→</span>
              </p>
            ) : product.soleVariantId ? (
              // Nothing to choose, so the cart is one click away from the grid.
              // `relative z-10` keeps it above the stretched card link.
              <div className="relative z-10">
                <AddToCartButton
                  variantId={product.soleVariantId}
                  priceCents={product.minPriceCents}
                  inStock={product.inStock}
                  variant="secondary"
                  size="sm"
                  slug={product.slug}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
