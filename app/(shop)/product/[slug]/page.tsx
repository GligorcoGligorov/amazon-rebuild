import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/db/queries/catalog";
import { ProductGallery } from "@/components/product-gallery";
import { VariantSelector, buildOptionStates } from "@/components/variant-selector";
import { StickyBuyBar } from "@/components/sticky-buy-bar";
import { AddToCartButton } from "@/components/add-to-cart";
import { catalogueNo, formatPrice, formatRating, optionParam } from "@/lib/format";
import { Price } from "@/components/ui/price";
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

/**
 * Resolve the chosen variant from the URL.
 *
 * With nothing specified, prefer one that is actually in stock: landing on a
 * product and being shown "Out of stock" when three other colours are available
 * is a worse first impression than it needs to be, and Amazon defaults to an
 * available option too. An explicit choice is always honoured, in stock or not.
 */
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

  if (want1 === undefined && want2 === undefined) {
    return variants.find((v) => v.stock > 0) ?? variants[0];
  }

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
  const choice = [selected.option1Value, selected.option2Value].filter(Boolean).join(" · ");
  const no = catalogueNo(product.slug);

  const specs: [string, string][] = [
    ...(no ? [["Catalogue", no] as [string, string]] : []),
    ["Department", product.category.name],
    ...(product.brand ? [["Maker", product.brand] as [string, string]] : []),
    ...(product.option1Label
      ? [["Options", [product.option1Label, product.option2Label].filter(Boolean).join(" · ")] as [string, string]]
      : []),
    ["SKU", selected.sku],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 pb-32 sm:px-6 sm:pt-8 lg:pb-12">
      <nav aria-label="Breadcrumb" className="eyebrow">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <Link href="/" className="inline-flex min-h-6 items-center hover:text-ink-900 hover:underline">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/category/${product.category.slug}`}
              className="inline-flex min-h-6 items-center hover:text-ink-900 hover:underline"
            >
              {product.category.name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          {/* The page's own crumb is its catalogue number: the title is the
              h1 directly below, and saying it twice wraps badly at 375px. */}
          <li aria-current="page" className="text-ink-900">
            {no ?? product.title}
            {no ? <span className="sr-only"> — {product.title}</span> : null}
          </li>
        </ol>
      </nav>

      {/*
        Mobile DOM order is deliberate: summary (title + price) comes before the
        gallery, so both are above the fold at 375px (D9). On desktop, explicit
        grid placement puts the gallery back on the left without reordering the
        DOM, and the buying column sticks beside it.
      */}
      <div className="mt-4 grid grid-cols-1 gap-y-6 sm:mt-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-x-16">
        <section
          aria-labelledby="product-title"
          className="lg:col-start-2 lg:row-start-1"
        >
          <p className="flex items-center gap-2">
            {no ? <span className="eyebrow text-ink-900">{no}</span> : null}
            {product.brand ? <span className="eyebrow">{product.brand}</span> : null}
            {rating ? (
              <span className="ml-auto font-mono text-xs text-ink-600">
                {rating}
                <span aria-hidden="true">★</span>
                <span className="sr-only"> out of 5 stars</span>
              </span>
            ) : null}
          </p>

          <h1
            id="product-title"
            className="mt-2 font-display text-[2.5rem] leading-[1.02] tracking-[-0.01em] sm:text-5xl"
          >
            {product.title}
          </h1>

          <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
            <Price cents={selected.priceCents} className="text-[1.75rem] sm:text-3xl" />
            {discounted ? (
              <>
                <span className="font-mono text-sm text-ink-400 line-through">
                  <span className="sr-only">was </span>
                  {formatPrice(selected.compareAtCents!)}
                </span>
                <span className="font-mono text-sm text-success">
                  Save {formatPrice(selected.compareAtCents! - selected.priceCents)}
                </span>
              </>
            ) : null}
          </p>
        </section>

        <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <ProductGallery images={product.images} title={product.title} />
        </div>

        <section
          aria-label="Purchase options"
          className="flex flex-col gap-6 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-2 lg:self-start"
        >
          <VariantSelector options={options} />

          <p className="flex items-center gap-2 text-sm font-medium">
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${inStock ? (lowStock ? "bg-accent" : "bg-success") : "bg-danger"}`}
            />
            <span className={inStock ? (lowStock ? "text-accent-hover" : "text-success") : "text-danger"}>
              {inStock
                ? lowStock
                  ? `Only ${selected.stock} left in stock`
                  : "In stock"
                : "Out of stock"}
            </span>
          </p>

          {/* Desktop buy button. Mobile gets the sticky bar instead. */}
          <div className="hidden lg:block">
            <AddToCartButton
              variantId={selected.id}
              priceCents={selected.priceCents}
              inStock={inStock}
            />
          </div>

          <div className="border-t border-ink-900 pt-6">
            <h2 className="font-display text-2xl leading-none">About this item</h2>
            <p className="mt-3 max-w-prose text-[0.9375rem] leading-relaxed text-ink-800">
              {product.description}
            </p>

            <dl className="mt-6 border-t border-border text-sm">
              {specs.map(([term, detail]) => (
                <div key={term} className="flex gap-4 border-b border-border py-2.5">
                  <dt className="w-28 shrink-0 text-ink-600">{term}</dt>
                  <dd className={term === "Catalogue" || term === "SKU" ? "min-w-0 font-mono text-[0.8125rem]" : ""}>
                    {detail}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </div>

      <StickyBuyBar
        variantId={selected.id}
        priceCents={selected.priceCents}
        inStock={inStock}
        detail={choice || null}
      />
    </div>
  );
}
