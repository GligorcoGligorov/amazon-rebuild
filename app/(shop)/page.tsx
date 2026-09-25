import Image from "next/image";
import Link from "next/link";
import {
  getCategories,
  getFeaturedProducts,
  type ProductCard as ProductCardData,
} from "@/lib/db/queries/catalog";
import { searchProducts } from "@/lib/db/queries/search";
import { ProductCard } from "@/components/product-card";
import { buttonClass } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { catalogueNo } from "@/lib/format";

export const dynamic = "force-dynamic";

/** "Autumn 2026". The masthead dates itself like a printed edition. */
function edition(date: Date): string {
  const seasons = ["Winter", "Spring", "Summer", "Autumn"];
  const season = seasons[Math.floor(((date.getMonth() + 1) % 12) / 3)];
  return `${season} ${date.getFullYear()}`;
}

const PRINCIPLES: [string, React.ReactNode][] = [
  ["No sponsored rows", "Results are ranked by what you asked for, never by who paid."],
  ["Every option priced", "Each size, colour and storage tier carries its own price and stock."],
  [
    "Totals you can trust",
    <>
      Shipping and tax read <span className="font-mono text-ink-900">--</span> until they can
      be known, never a guess.
    </>,
  ],
];

/**
 * One product in the first screen, so there is something to buy before any
 * scrolling. A single link: a compact row under the buttons on mobile, a
 * portrait card beside the headline from 1024px.
 */
function HeroPick({ product }: { product: ProductCardData }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex items-center gap-4 border-y border-ink-900 py-4 lg:flex-col lg:items-stretch lg:gap-0 lg:border-y-0 lg:py-0"
    >
      <span className="relative size-24 shrink-0 bg-well lg:aspect-[4/5] lg:size-auto">
        <Image
          src={product.image}
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 96px, 320px"
          className="object-contain p-2 transition-transform duration-500 ease-out group-hover:scale-[1.04] lg:p-[12%]"
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col lg:pt-4">
        <span className="eyebrow flex gap-2">
          <span className="text-accent-hover">The pick</span>
          <span aria-hidden="true">·</span>
          <span>{catalogueNo(product.slug)}</span>
        </span>
        <span className="mt-1 font-display text-2xl leading-tight group-hover:italic lg:text-3xl">
          {product.title}
        </span>
        <span className="mt-2 flex items-center justify-between gap-3">
          <Price
            cents={product.minPriceCents}
            from={product.minPriceCents !== product.maxPriceCents}
            nowrap
          />
          <span className="text-sm font-medium underline decoration-border underline-offset-4 group-hover:decoration-ink-900">
            View<span className="hidden sm:inline"> product</span>
            <span aria-hidden="true"> →</span>
          </span>
        </span>
      </span>
    </Link>
  );
}

export default async function HomePage() {
  // The unfiltered search already counts every department, so the index and
  // the masthead read their numbers from it rather than a new query.
  const [categories, featured, all] = await Promise.all([
    getCategories(),
    getFeaturedProducts(9),
    searchProducts({}),
  ]);
  // The hero's pick: the best-rated product that can be bought and has options
  // to choose from, so the first thing on the page is buyable and shows off
  // per-option pricing. The shelf below skips it rather than repeat it.
  const pick = featured.find((p) => p.inStock && p.hasOptions) ?? featured[0];
  const shelf = featured.filter((p) => p !== pick).slice(0, 8);
  const countBySlug = new Map(all.facets.map((f) => [f.slug, f.count]));

  return (
    <>
      {/* Masthead */}
      <section className="mx-auto max-w-7xl px-4 pt-6 pb-14 sm:px-6 sm:pt-10 sm:pb-24">
        <p className="eyebrow flex justify-between gap-4 border-b border-ink-900 pb-3">
          <span className="whitespace-nowrap">Vol. 01 · {edition(new Date())}</span>
          <span className="whitespace-nowrap">
            {all.total} goods<span className="hidden sm:inline"> · {categories.length} departments</span>
          </span>
        </p>

        <div className="mt-8 grid gap-10 sm:mt-14 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end lg:gap-16">
          <div>
            <p className="font-display text-[3.25rem] leading-[0.95] tracking-[-0.02em] sm:text-[7.5rem] lg:text-[8.5rem]">
              Everyday goods,
              <br />
              <em>well</em> chosen.
            </p>
            <p className="mt-8 max-w-md text-base text-ink-600 sm:mt-10 sm:text-lg">
              Clothing, shoes, watches, laptops and phones. Every piece numbered,
              every option priced, and not a single sponsored row.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/search" className={buttonClass({ variant: "ink" })}>
                Browse all goods
              </Link>
              <a href="#departments" className={buttonClass({ variant: "quiet", className: "min-h-11" })}>
                See departments
              </a>
            </div>
          </div>

          {pick ? <HeroPick product={pick} /> : null}
        </div>
      </section>

      {/* Department index — a catalogue's contents page. */}
      <section
        id="departments"
        aria-labelledby="categories-heading"
        className="mx-auto max-w-7xl scroll-mt-28 px-4 sm:px-6"
      >
        <div className="flex items-end justify-between gap-4 pb-4">
          <div>
            <p className="eyebrow">Index</p>
            <h1 id="categories-heading" className="mt-1 font-display text-4xl leading-none sm:text-5xl">
              Shop by category
            </h1>
          </div>
          <p className="eyebrow hidden sm:block">Departments 01–{String(categories.length).padStart(2, "0")}</p>
        </div>

        <ol className="grid border-t border-ink-900 sm:grid-flow-col sm:grid-cols-2 sm:gap-x-12 sm:[grid-template-rows:repeat(7,auto)]">
          {categories.map((category, i) => {
            const count = countBySlug.get(category.slug) ?? 0;
            return (
              <li key={category.id} className="border-b border-border">
                <Link
                  href={`/category/${category.slug}`}
                  className="group flex items-center gap-4 py-3"
                >
                  <span aria-hidden="true" className="w-5 shrink-0 font-mono text-xs text-ink-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="relative size-14 shrink-0 bg-well">
                    {category.imageUrl ? (
                      <Image
                        src={category.imageUrl}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-contain p-1.5"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1 font-display text-2xl leading-tight group-hover:italic sm:text-[1.75rem]">
                    {category.name}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-ink-600">
                    {count}
                    <span className="sr-only"> goods</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-ink-400 transition-transform group-hover:translate-x-1 group-hover:text-ink-900"
                  >
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Top rated */}
      <section
        aria-labelledby="featured-heading"
        className="mx-auto mt-20 max-w-7xl px-4 sm:mt-28 sm:px-6"
      >
        <div className="flex items-end justify-between gap-4 border-b border-ink-900 pb-4">
          <div>
            <p className="eyebrow">Selected by rating</p>
            <h2 id="featured-heading" className="mt-1 font-display text-4xl leading-none sm:text-5xl">
              Top rated
            </h2>
          </div>
          <Link
            href="/search?sort=rating"
            className={buttonClass({ variant: "quiet", className: "min-h-11 text-sm" })}
          >
            See all
          </Link>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
          {shelf.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </section>

      {/* House rules — the product decisions, stated where a shopper sees them. */}
      <section aria-labelledby="principles-heading" className="mx-auto mt-24 max-w-7xl px-4 sm:mt-32 sm:px-6">
        <h2 id="principles-heading" className="eyebrow border-b border-ink-900 pb-3">
          House rules
        </h2>
        <ol className="grid gap-8 pt-6 sm:grid-cols-3 sm:gap-12">
          {PRINCIPLES.map(([title, body], i) => (
            <li key={title}>
              <p aria-hidden="true" className="font-mono text-xs text-ink-400">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-2 font-display text-2xl leading-tight">{title}</h3>
              <p className="mt-2 text-sm text-ink-600">{body}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
