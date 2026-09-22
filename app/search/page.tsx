import Link from "next/link";
import type { Metadata } from "next";
import { searchProducts, isSortKey, type SortKey } from "@/lib/db/queries/search";
import { getCategories } from "@/lib/db/queries/catalog";
import { ProductCard } from "@/components/product-card";
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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        {q ? <>Results for “{q}”</> : "All products"}
      </h1>

      <p aria-live="polite" className="mt-1 text-sm text-ink-600">
        {results.total} {results.total === 1 ? "product" : "products"}
        {categoryName ? <> in {categoryName}</> : null}
      </p>

      <div className="mt-4 flex flex-col gap-4">
        <AppliedFilters {...controls} />
        <SortLinks {...controls} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[13rem_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <CategoryFacets {...controls} />
        </aside>

        <div>
          {results.items.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface-sunken p-8 text-center">
              <p className="font-medium">
                Nothing matched{q ? <> “{q}”</> : null}
                {categoryName ? <> in {categoryName}</> : null}.
              </p>
              <p className="mt-2 text-sm text-ink-600">
                Try a shorter search, or a different category.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {category ? (
                  <Link
                    href={`/search${q ? `?q=${encodeURIComponent(q)}` : ""}`}
                    className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:bg-accent-hover"
                  >
                    Search all categories
                  </Link>
                ) : null}
                <Link
                  href="/"
                  className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:border-ink-400"
                >
                  Browse categories
                </Link>
              </div>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
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
