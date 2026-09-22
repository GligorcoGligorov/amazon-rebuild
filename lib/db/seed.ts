import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import { categories, products, variants } from "./schema";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL must be set.");

/**
 * Catalog seed. Source is the dummyjson.com product API (D14) — real titles,
 * descriptions and photography. It has no variant data, so variants are
 * synthesised per category below.
 *
 * Re-runnable: every insert upserts on a natural key.
 */

type OptionPlan = {
  label1: string | null;
  values1: string[];
  label2: string | null;
  values2: string[];
};

// Variant shape per category. Clothing and footwear get size and colour;
// devices get storage and colour, and never a size.
const OPTIONS: Record<string, OptionPlan> = {
  "mens-shirts": {
    label1: "Size",
    values1: ["S", "M", "L", "XL"],
    label2: "Colour",
    values2: ["Black", "White", "Navy"],
  },
  "womens-dresses": {
    label1: "Size",
    values1: ["XS", "S", "M", "L"],
    label2: "Colour",
    values2: ["Black", "Burgundy", "Ivory"],
  },
  "mens-shoes": {
    label1: "Size",
    values1: ["8", "9", "10", "11", "12"],
    label2: "Colour",
    values2: ["Black", "White"],
  },
  "womens-shoes": {
    label1: "Size",
    values1: ["5", "6", "7", "8", "9"],
    label2: "Colour",
    values2: ["Black", "Tan"],
  },
  laptops: {
    label1: "Storage",
    values1: ["512GB", "1TB", "2TB"],
    label2: "Colour",
    values2: ["Silver", "Space Grey"],
  },
  smartphones: {
    label1: "Storage",
    values1: ["128GB", "256GB", "512GB"],
    label2: "Colour",
    values2: ["Black", "Silver", "Blue"],
  },
};

const CATEGORY_NAMES: Record<string, { name: string; position: number }> = {
  "mens-shirts": { name: "Men's Shirts", position: 10 },
  "womens-dresses": { name: "Women's Dresses", position: 20 },
  "mens-shoes": { name: "Men's Shoes", position: 30 },
  "womens-shoes": { name: "Women's Shoes", position: 40 },
  laptops: { name: "Laptops", position: 50 },
  smartphones: { name: "Smartphones", position: 60 },
};

const SLUGS = Object.keys(CATEGORY_NAMES);

type ApiProduct = {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  brand?: string;
  images: string[];
  thumbnail: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Deterministic pseudo-random in [0,1) from a string, so reruns are stable. */
function hashUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * Price for a variant, in cents. The base price is the product's; higher
 * storage tiers cost more, so that switching a variant visibly changes the
 * price the way it does on a real store.
 */
function priceForVariant(basePence: number, option1: string | null): number {
  if (!option1) return basePence;
  const tier = { "256GB": 1.08, "512GB": 1.18, "1TB": 1.3, "2TB": 1.55 }[option1];
  return tier ? Math.round(basePence * tier) : basePence;
}

async function main() {
  const db = drizzle(neon(url!));

  // --- categories -----------------------------------------------------------
  // Tile image is the first image of the category's first product, so the home
  // page shows real photography rather than an empty box.
  const fetched = new Map<string, ApiProduct[]>();
  for (const slug of SLUGS) {
    const res = await fetch(
      `https://dummyjson.com/products/category/${slug}?limit=100`,
    );
    if (!res.ok) throw new Error(`dummyjson ${slug}: HTTP ${res.status}`);
    const body = (await res.json()) as { products: ApiProduct[] };
    if (!body.products?.length) throw new Error(`dummyjson ${slug}: no products`);
    fetched.set(slug, body.products);
  }

  const categoryRows = SLUGS.map((slug) => ({
    slug,
    name: CATEGORY_NAMES[slug].name,
    position: CATEGORY_NAMES[slug].position,
    imageUrl: fetched.get(slug)![0].images[0] ?? fetched.get(slug)![0].thumbnail,
  }));

  const insertedCategories = await db
    .insert(categories)
    .values(categoryRows)
    .onConflictDoUpdate({
      target: categories.slug,
      set: {
        name: sql`excluded.name`,
        position: sql`excluded.position`,
        imageUrl: sql`excluded.image_url`,
      },
    })
    .returning({ id: categories.id, slug: categories.slug });

  const categoryIdBySlug = new Map(
    insertedCategories.map((c) => [c.slug, c.id] as const),
  );

  // --- products and variants ------------------------------------------------
  let productCount = 0;
  let variantCount = 0;

  for (const slug of SLUGS) {
    const plan = OPTIONS[slug];
    const categoryId = categoryIdBySlug.get(slug)!;

    for (const api of fetched.get(slug)!) {
      const productSlug = `${slugify(api.title)}-${api.id}`;
      const [product] = await db
        .insert(products)
        .values({
          slug: productSlug,
          title: api.title,
          description: api.description,
          brand: api.brand ?? null,
          categoryId,
          images: api.images.length ? api.images : [api.thumbnail],
          rating: Math.round(api.rating * 100),
          option1Label: plan.label1,
          option2Label: plan.label2,
        })
        .onConflictDoUpdate({
          target: products.slug,
          set: {
            title: sql`excluded.title`,
            description: sql`excluded.description`,
            brand: sql`excluded.brand`,
            categoryId: sql`excluded.category_id`,
            images: sql`excluded.images`,
            rating: sql`excluded.rating`,
            option1Label: sql`excluded.option1_label`,
            option2Label: sql`excluded.option2_label`,
          },
        })
        .returning({ id: products.id });

      const baseCents = Math.round(api.price * 100);
      const discounted = api.discountPercentage > 0;

      const rows: (typeof variants.$inferInsert)[] = [];
      let position = 0;

      for (const v1 of plan.values1) {
        for (const v2 of plan.values2) {
          const priceCents = priceForVariant(baseCents, v1);
          // Deterministic per-combination stock, so some variants are genuinely
          // out of stock and the selector's third state has something to show.
          const roll = hashUnit(`${productSlug}|${v1}|${v2}`);
          const stock = roll < 0.18 ? 0 : Math.max(1, Math.round(roll * api.stock));

          rows.push({
            productId: product.id,
            sku: `${productSlug}-${slugify(v1)}-${slugify(v2)}`.toUpperCase(),
            option1Value: v1,
            option2Value: v2,
            priceCents,
            compareAtCents: discounted
              ? Math.round(priceCents / (1 - api.discountPercentage / 100))
              : null,
            stock,
            position: position++,
          });
        }
      }

      await db
        .insert(variants)
        .values(rows)
        .onConflictDoUpdate({
          target: variants.sku,
          set: {
            priceCents: sql`excluded.price_cents`,
            compareAtCents: sql`excluded.compare_at_cents`,
            stock: sql`excluded.stock`,
            position: sql`excluded.position`,
          },
        });

      productCount++;
      variantCount += rows.length;
    }
  }

  console.log(
    `seeded ${categoryRows.length} categories, ${productCount} products, ${variantCount} variants`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
