import Link from "next/link";
import type { Metadata } from "next";
import { searchProducts, isSortKey, type SortKey } from "@/lib/db/queries/search";
import { getCategories } from "@/lib/db/queries/catalog";
import { ProductCard } from "@/components/product-card";
import { buttonClass } from "@/components/ui/button";
import {
  AppliedFilters,
  CategoryFacets,
  SortLinks,
} from "@/components/search-controls";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = one((await searchParams).q).trim();
  return { title: q ? `“${q}”` : "Search" };
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = one(params.q).trim();
  const category = one(params.category);
  const sortRaw = one(params.sort);
  const sort: SortKey = isSortKey(sortRaw) ? sortRaw : "relevance";

  const [results, allCategories] = await Promise.all([
    searchProducts({ q, category, sort }),
    getCategories(),
  ]);

  const categoryName =
    allCategories.find((c) => c.slug === category)?.name ?? null;

  const controls = {
    q,
    category,
    sort,
    categoryName,
    facets: results.facets,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-10">
      <p className="eyebrow">{q ? "Search" : categoryName ? "Department" : "The catalogue"}</p>
      {/* With a query the heading is the query; with only a category filter it
          is the category. "All products" is for the unfiltered page alone. */}
      <h1 className="mt-2 font-display text-4xl leading-none break-words sm:text-6xl">
        {q ? <>Results for “{q}”</> : (categoryName ?? "All products")}
      </h1>

      <p aria-live="polite" className="mt-3 font-mono text-sm text-ink-600">
        {results.total} {results.total === 1 ? "product" : "products"}
        {q && categoryName ? <> in {categoryName}</> : null}
      </p>

      <div className="mt-6 flex flex-col gap-4 border-t border-ink-900 pt-5 lg:flex-row lg:items-start lg:justify-between">
        <SortLinks {...controls} />
        <AppliedFilters {...controls} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <CategoryFacets {...controls} />
        </aside>

        <div>
          {results.items.length === 0 ? (
            <div className="border-y border-border py-12">
              <p className="font-display text-3xl leading-tight">
                Nothing matched{q ? <> “{q}”</> : null}
                {categoryName ? <> in {categoryName}</> : null}.
              </p>
              <p className="mt-2 text-sm text-ink-600">
                Try a shorter search, or a different category.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {category ? (
                  <Link
                    href={`/search${q ? `?q=${encodeURIComponent(q)}` : ""}`}
                    className={buttonClass({ variant: "ink" })}
                  >
                    Search all categories
                  </Link>
                ) : null}
                <Link href="/" className={buttonClass({ variant: "secondary" })}>
                  Browse categories
                </Link>
              </div>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
              {results.items.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
