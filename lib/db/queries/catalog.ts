import { asc, eq, sql, desc } from "drizzle-orm";
import { db } from "../index";
import { categories, products, variants, type Category, type Variant } from "../schema";

export type { Category };

/** What a grid card needs. One row per product — never a row per variant. */
export type ProductCard = {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  image: string;
  rating: number | null;
  minPriceCents: number;
  maxPriceCents: number;
  compareAtCents: number | null;
  /** True when the product has choices to make, so the card links instead of adding. */
  hasOptions: boolean;
  inStock: boolean;
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
};

type CardRow = {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  images: string[];
  rating: number | null;
  option1Label: string | null;
  minPriceCents: number;
  maxPriceCents: number;
  compareAtCents: number | null;
  variantCount: number;
  totalStock: number;
};

function toCard(row: CardRow): ProductCard {
  return {
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
  };
}

export async function getCategories(): Promise<Category[]> {
  return db.select().from(categories).orderBy(asc(categories.position));
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const [row] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function getProductsInCategory(categoryId: string): Promise<ProductCard[]> {
  const rows = await db
    .select(cardColumns)
    .from(products)
    .innerJoin(variants, eq(variants.productId, products.id))
    .where(eq(products.categoryId, categoryId))
    .groupBy(products.id)
    .orderBy(asc(products.title));
  return rows.map(toCard);
}

/** Home page shelf. Highest-rated first, so the grid opens on the good stuff. */
export async function getFeaturedProducts(limit = 8): Promise<ProductCard[]> {
  const rows = await db
    .select(cardColumns)
    .from(products)
    .innerJoin(variants, eq(variants.productId, products.id))
    .groupBy(products.id)
    .orderBy(desc(products.rating))
    .limit(limit);
  return rows.map(toCard);
}

export type ProductDetail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  brand: string | null;
  images: string[];
  rating: number | null;
  option1Label: string | null;
  option2Label: string | null;
  category: { slug: string; name: string };
  variants: Variant[];
};

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const [row] = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      description: products.description,
      brand: products.brand,
      images: products.images,
      rating: products.rating,
      option1Label: products.option1Label,
      option2Label: products.option2Label,
      categorySlug: categories.slug,
      categoryName: categories.name,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(eq(products.slug, slug))
    .limit(1);

  if (!row) return null;

  const productVariants = await db
    .select()
    .from(variants)
    .where(eq(variants.productId, row.id))
    .orderBy(asc(variants.position));

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    brand: row.brand,
    images: row.images,
    rating: row.rating,
    option1Label: row.option1Label,
    option2Label: row.option2Label,
    category: { slug: row.categorySlug, name: row.categoryName },
    variants: productVariants,
  };
}

/** Slugs for `generateStaticParams`, and for the e2e suite to pick a real product. */
export async function getAllProductSlugs(): Promise<string[]> {
  const rows = await db.select({ slug: products.slug }).from(products);
  return rows.map((r) => r.slug);
}
