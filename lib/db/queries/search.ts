import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "../index";
import { categories, products, variants } from "../schema";
import type { ProductCard } from "./catalog";

export const SORTS = {
  relevance: "Relevance",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  rating: "Best rated",
  "title-asc": "Name: A to Z",
} as const;

export type SortKey = keyof typeof SORTS;

export function isSortKey(value: string | undefined): value is SortKey {
  return value !== undefined && value in SORTS;
}

export type SearchParamsShape = {
  q?: string;
  category?: string;
  sort?: SortKey;
};

export type SearchResults = {
  items: ProductCard[];
  total: number;
  /** Per-category counts for the current query, ignoring the category filter. */
  facets: { slug: string; name: string; count: number }[];
};

const cardColumns = {
  id: products.id,
  slug: products.slug,
  title: products.title,
  brand: products.brand,
  images: products.images,
  rating: products.rating,
  option1Label: products.option1Label,
  minPriceCents: sql<number>`min(${variants.priceCents})::int`,
  maxPriceCents: sql<number>`max(${variants.priceCents})::int`,
  compareAtCents: sql<number | null>`max(${variants.compareAtCents})::int`,
  variantCount: sql<number>`count(${variants.id})::int`,
  totalStock: sql<number>`sum(${variants.stock})::int`,
  soleVariantId: sql<string | null>`case when count(${variants.id}) = 1 then min(${variants.id}::text) end`,
};

/**
 * Singular forms to also try for a term. Substring matching already handles
 * singular → plural ("watch" is inside "Watches"), so only the other direction
 * needs help. Three rules cover the catalog; this is deliberately not a stemmer.
 */
function singularForms(term: string): string[] {
  const forms = new Set([term]);
  if (/ies$/i.test(term) && term.length > 4) forms.add(term.slice(0, -3) + "y");
  if (/es$/i.test(term) && term.length > 3) forms.add(term.slice(0, -2));
  if (/s$/i.test(term) && !/ss$/i.test(term) && term.length > 2) {
    forms.add(term.slice(0, -1));
  }
  return [...forms];
}

/**
 * Matches title, description, brand and category name, so "apple" finds Apple
 * products and "laptops" finds the Laptops category. Every word in the query
 * must match somewhere (AND across words, OR across fields and forms) — so
 * "apple watch" narrows rather than widens.
 */
function textFilter(q: string | undefined): SQL | undefined {
  const words = q?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return undefined;

  const perWord = words.map((word) => {
    const clauses = singularForms(word).flatMap((form) => {
      const like = `%${form}%`;
      return [
        ilike(products.title, like),
        ilike(products.description, like),
        ilike(products.brand, like),
        ilike(categories.name, like),
      ];
    });
    return or(...clauses);
  });

  return and(...perWord);
}

function orderFor(sort: SortKey | undefined, hasQuery: boolean) {
  switch (sort) {
    case "price-asc":
      return asc(sql`min(${variants.priceCents})`);
    case "price-desc":
      return desc(sql`max(${variants.priceCents})`);
    case "rating":
      return desc(sql`coalesce(${products.rating}, 0)`);
    case "title-asc":
      return asc(products.title);
    default:
      // "Relevance" with no search term is arbitrary, so fall back to something
      // defensible rather than whatever Postgres returns.
      return hasQuery ? desc(sql`coalesce(${products.rating}, 0)`) : asc(products.title);
  }
}

export async function searchProducts(
  params: SearchParamsShape,
): Promise<SearchResults> {
  const text = textFilter(params.q);
  const hasQuery = Boolean(params.q?.trim());

  const categoryFilter = params.category
    ? eq(categories.slug, params.category)
    : undefined;

  const rows = await db
    .select(cardColumns)
    .from(products)
    .innerJoin(variants, eq(variants.productId, products.id))
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(text, categoryFilter))
    .groupBy(products.id)
    .orderBy(orderFor(params.sort, hasQuery));

  // Facet counts ignore the category filter, so the sidebar can show what else
  // the same search would return. Amazon does not do this; it should.
  const facetRows = await db
    .select({
      slug: categories.slug,
      name: categories.name,
      count: sql<number>`count(distinct ${products.id})::int`,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(text)
    .groupBy(categories.slug, categories.name, categories.position)
    .orderBy(asc(categories.position));

  const items: ProductCard[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    brand: row.brand,
    image: row.images[0],
    rating: row.rating,
    minPriceCents: row.minPriceCents,
    maxPriceCents: row.maxPriceCents,
    compareAtCents: row.compareAtCents,
    hasOptions: Boolean(row.option1Label) && row.variantCount > 1,
    inStock: row.totalStock > 0,
    soleVariantId: row.soleVariantId,
  }));

  return { items, total: items.length, facets: facetRows };
}
