import Image from "next/image";
import Link from "next/link";
import type { ProductCard as Card } from "@/lib/db/queries/catalog";
import { formatPrice, formatRating } from "@/lib/format";

export function ProductCard({ product }: { product: Card }) {
  const rating = formatRating(product.rating);
  const hasRange = product.minPriceCents !== product.maxPriceCents;
  const discounted =
    product.compareAtCents !== null && product.compareAtCents > product.minPriceCents;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface transition-shadow hover:shadow-md">
      <div className="relative aspect-square bg-surface-sunken">
        <Image
          src={product.image}
          alt=""
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain p-3"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.brand ? (
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
            {product.brand}
          </p>
        ) : null}

        <h3 className="text-sm font-medium leading-snug">
          {/* Stretched link: the whole card is the target, but only the title
              text is in the accessibility tree as the link name. Controls that
              sit above it need `relative z-10` to stay clickable. */}
          <Link href={`/product/${product.slug}`} className="after:absolute after:inset-0">
            {product.title}
          </Link>
        </h3>

        {rating ? (
          <p className="text-xs text-ink-600">
            <span aria-hidden="true">★</span> {rating}
            <span className="sr-only"> out of 5 stars</span>
          </p>
        ) : null}

        <div className="mt-auto pt-2">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-base font-semibold">
              {hasRange ? "From " : ""}
              {formatPrice(product.minPriceCents)}
            </span>
            {discounted && !hasRange ? (
              <span className="text-xs text-ink-400 line-through">
                {formatPrice(product.compareAtCents!)}
              </span>
            ) : null}
          </p>

          <div className="mt-2">
            {!product.inStock ? (
              <p className="text-xs text-ink-600">Out of stock</p>
            ) : product.hasOptions ? (
              // Amazon shows "See options" rather than an add button when a
              // product has choices to make. Ours does the same — it falls out
              // of the schema, since there is no single variant to add.
              <p className="text-xs text-ink-600">See options</p>
            ) : (
              // Nothing to choose, so the cart is one click away from the grid.
              <AddToCartButton />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/** Inert until M4 wires the cart, like the buttons on the product page. */
function AddToCartButton() {
  return (
    <button
      type="button"
      disabled
      className="relative z-10 w-full rounded-md bg-accent px-3 py-2 text-xs font-semibold text-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
    >
      Add to cart
    </button>
  );
}
