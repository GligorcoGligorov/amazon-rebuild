import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/db/queries/catalog";
import { ProductGallery } from "@/components/product-gallery";
import { VariantSelector, buildOptionStates } from "@/components/variant-selector";
import { StickyBuyBar } from "@/components/sticky-buy-bar";
import { AddToCartButton } from "@/components/add-to-cart";
import { formatPrice, formatRating, optionParam } from "@/lib/format";
import type { Variant } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return { title: product?.title ?? "Product" };
}

/** Resolve the chosen variant from the URL, falling back to the first in stock. */
function resolveVariant(
  variants: Variant[],
  option1Label: string | null,
  option2Label: string | null,
  search: Record<string, string | string[] | undefined>,
): Variant {
  const pick = (label: string | null) => {
    if (!label) return undefined;
    const raw = search[optionParam(label)];
    return Array.isArray(raw) ? raw[0] : raw;
  };

  const want1 = pick(option1Label);
  const want2 = pick(option2Label);

  const exact = variants.find(
    (v) =>
      (want1 === undefined || v.option1Value === want1) &&
      (want2 === undefined || v.option2Value === want2),
  );

  return exact ?? variants.find((v) => v.stock > 0) ?? variants[0];
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const search = await searchParams;
  const selected = resolveVariant(
    product.variants,
    product.option1Label,
    product.option2Label,
    search,
  );

  const options = buildOptionStates(
    product.slug,
    product.option1Label,
    product.option2Label,
    product.variants,
    selected,
  );

  const rating = formatRating(product.rating);
  const inStock = selected.stock > 0;
  const lowStock = inStock && selected.stock <= 5;
  const discounted =
    selected.compareAtCents !== null && selected.compareAtCents > selected.priceCents;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:py-8 lg:pb-10">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-600">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:underline">
              Home
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <Link href={`/category/${product.category.slug}`} className="hover:underline">
              {product.category.name}
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" className="font-medium text-ink-900">
            {product.title}
          </li>
        </ol>
      </nav>

      {/*
        Mobile DOM order is deliberate: summary (title + price) comes before the
        gallery, so both are above the fold at 375px. Amazon buries the price
        below a full-screen image and an ad — see D9. On desktop, explicit grid
        placement puts the gallery back on the left without reordering the DOM.
      */}
      <div className="mt-4 grid grid-cols-1 gap-x-10 gap-y-6 lg:grid-cols-2">
        <section
          aria-labelledby="product-title"
          className="lg:col-start-2 lg:row-start-1"
        >
          {product.brand ? (
            <p className="text-sm font-medium uppercase tracking-wide text-ink-400">
              {product.brand}
            </p>
          ) : null}

          <h1
            id="product-title"
            className="mt-1 text-xl font-semibold leading-tight tracking-tight sm:text-2xl"
          >
            {product.title}
          </h1>

          {rating ? (
            <p className="mt-2 text-sm text-ink-600">
              <span aria-hidden="true">★</span> {rating}
              <span className="sr-only"> out of 5 stars</span>
            </p>
          ) : null}

          <p className="mt-3 flex flex-wrap items-baseline gap-x-3">
            <span className="text-2xl font-bold sm:text-3xl">
              {formatPrice(selected.priceCents)}
            </span>
            {discounted ? (
              <>
                <span className="text-sm text-ink-400 line-through">
                  {formatPrice(selected.compareAtCents!)}
                </span>
                <span className="text-sm font-semibold text-success">
                  Save{" "}
                  {formatPrice(selected.compareAtCents! - selected.priceCents)}
                </span>
              </>
            ) : null}
          </p>
        </section>

        <div className="lg:col-start-1 lg:row-start-1 lg:row-span-2">
          <ProductGallery images={product.images} title={product.title} />
        </div>

        <section
          aria-label="Purchase options"
          className="flex flex-col gap-6 lg:col-start-2 lg:row-start-2"
        >
          <VariantSelector options={options} />

          <div>
            <p
              className={`text-sm font-semibold ${inStock ? "text-success" : "text-danger"}`}
            >
              {inStock
                ? lowStock
                  ? `Only ${selected.stock} left in stock`
                  : "In stock"
                : "Out of stock"}
            </p>
            <p className="mt-1 text-xs text-ink-400">SKU {selected.sku}</p>
          </div>

          {/* Desktop buy button. Mobile gets the sticky bar instead. */}
          <div className="hidden lg:block">
            <AddToCartButton
              variantId={selected.id}
              priceCents={selected.priceCents}
              inStock={inStock}
            />
          </div>

          <div className="border-t border-border pt-6">
            <h2 className="text-base font-semibold">About this item</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              {product.description}
            </p>
          </div>
        </section>
      </div>

      <StickyBuyBar
        variantId={selected.id}
        priceCents={selected.priceCents}
        inStock={inStock}
      />
    </div>
  );
}
