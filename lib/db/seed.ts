import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { asc, eq, like, or, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  addresses,
  carts,
  categories,
  orderItems,
  orders,
  products,
  users,
  variants,
} from "./schema";
import { DEMO_EMAIL, DEMO_NAME, DEMO_PASSWORD } from "../demo-account";
import { deliveryEta, DEMO_PAYMENT_LABEL, taxCentsFor } from "../checkout";

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

/**
 * Variant shape per category. Three kinds, and the schema and UI handle all of
 * them: two dimensions (clothing, footwear, devices), one dimension (accessories
 * that only vary by colour), and none at all — a product that is simply itself,
 * which the grid offers to add to the cart directly rather than sending to the
 * product page for options (D21).
 *
 * Devices never get a clothing size.
 */
const OPTIONS: Record<string, OptionPlan> = {
  // Two dimensions — size and colour.
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
  tops: {
    label1: "Size",
    values1: ["XS", "S", "M", "L", "XL"],
    label2: "Colour",
    values2: ["Black", "White", "Rose"],
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

  // Two dimensions — storage and colour. Never a size.
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
  tablets: {
    label1: "Storage",
    values1: ["128GB", "256GB", "512GB"],
    label2: "Colour",
    values2: ["Silver", "Graphite"],
  },

  // One dimension — colour only.
  sunglasses: {
    label1: "Colour",
    values1: ["Black", "Tortoise", "Gold"],
    label2: null,
    values2: [],
  },
  "mens-watches": {
    label1: "Colour",
    values1: ["Silver", "Gold", "Black"],
    label2: null,
    values2: [],
  },
  "womens-watches": {
    label1: "Colour",
    values1: ["Silver", "Rose Gold", "Black"],
    label2: null,
    values2: [],
  },
  "womens-bags": {
    label1: "Colour",
    values1: ["Black", "Tan", "Red"],
    label2: null,
    values2: [],
  },

  // No options at all — one sellable unit, added straight from the grid.
  "mobile-accessories": { label1: null, values1: [], label2: null, values2: [] },
};

const CATEGORY_NAMES: Record<string, { name: string; position: number }> = {
  "mens-shirts": { name: "Men's Shirts", position: 10 },
  tops: { name: "Tops", position: 15 },
  "womens-dresses": { name: "Women's Dresses", position: 20 },
  "mens-shoes": { name: "Men's Shoes", position: 30 },
  "womens-shoes": { name: "Women's Shoes", position: 40 },
  "womens-bags": { name: "Women's Bags", position: 45 },
  sunglasses: { name: "Sunglasses", position: 48 },
  "mens-watches": { name: "Men's Watches", position: 52 },
  "womens-watches": { name: "Women's Watches", position: 54 },
  laptops: { name: "Laptops", position: 60 },
  tablets: { name: "Tablets", position: 65 },
  smartphones: { name: "Smartphones", position: 70 },
  "mobile-accessories": { name: "Phone Accessories", position: 80 },
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
  const tiers: Record<string, number> = {
    "128GB": 1,
    "256GB": 1.08,
    "512GB": 1.18,
    "1TB": 1.3,
    "2TB": 1.55,
  };
  const tier = tiers[option1];
  return tier ? Math.round(basePence * tier) : basePence;
}

/**
 * Every option combination for a plan, as [value1, value2] pairs. Handles all
 * three shapes: two dimensions, one, or none at all (a single [null, null]).
 */
function combinations(plan: OptionPlan): [string | null, string | null][] {
  if (!plan.label1) return [[null, null]];
  if (!plan.label2) return plan.values1.map((v1) => [v1, null]);
  return plan.values1.flatMap(
    (v1) => plan.values2.map((v2) => [v1, v2] as [string, string]),
  );
}

async function main() {
  const db = drizzle(neon(url!));

  // --- demo account -------------------------------------------------------
  // Seeded so a reviewer can reach checkout without signing up. The password
  // is published on the sign-in page on purpose — see lib/demo-account.ts.
  const [demoUser] = await db
    .insert(users)
    .values({
      email: DEMO_EMAIL,
      name: DEMO_NAME,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { name: sql`excluded.name`, passwordHash: sql`excluded.password_hash` },
    })
    .returning({ id: users.id });

  // The demo account is shared, so whatever the last visitor left in its cart
  // would greet the next one. Re-seeding clears it. Cart items cascade.
  await db.delete(carts).where(eq(carts.userId, demoUser.id));

  // The e2e suite signs up throwaway accounts on the reserved .test TLD, and
  // it runs against the deployed site too. Sweep them up so the database is
  // the catalog plus the demo account, not a pile of test debris.
  await db.delete(users).where(sql`${users.email} like '%@example.test'`);
  await db.delete(carts).where(sql`${carts.userId} is null and ${carts.updatedAt} < now() - interval '1 day'`);

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

      for (const [v1, v2] of combinations(plan)) {
        const priceCents = priceForVariant(baseCents, v1);
        // Deterministic per-combination stock, so some variants are genuinely
        // out of stock and the selector's third state has something to show.
        // A product with no options is never seeded out of stock — there would
        // be no other combination to switch to.
        const roll = hashUnit(`${productSlug}|${v1 ?? ""}|${v2 ?? ""}`);
        const stock =
          plan.label1 === null
            ? Math.max(1, api.stock)
            : roll < 0.18
              ? 0
              : Math.max(1, Math.round(roll * api.stock));

        const skuParts = [productSlug, v1, v2].filter(Boolean).map((x) => slugify(x!));
        rows.push({
          productId: product.id,
          sku: skuParts.join("-").toUpperCase(),
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

  // --- demo history -------------------------------------------------------
  // A reviewer signing in should land on a filled account, not three empty
  // pages. Two past orders and a saved address, rebuilt from scratch each run
  // so re-seeding is still idempotent.
  await db.delete(orders).where(eq(orders.userId, demoUser.id));
  await db.delete(addresses).where(eq(addresses.userId, demoUser.id));

  const [demoAddress] = await db
    .insert(addresses)
    .values({
      userId: demoUser.id,
      fullName: DEMO_NAME,
      line1: "27 Kingsway",
      line2: "Flat 4",
      city: "Brooklyn",
      region: "NY",
      postalCode: "11201",
      country: "United States",
    })
    .returning({ id: addresses.id });

  // Matched on slug *prefix*: every slug ends in the dummyjson product id, and
  // hardcoding those would make the history silently vanish if the API renumbers.
  const historyPlan = [
    {
      daysAgo: 16,
      method: "standard" as const,
      shippingCents: 0,
      prefixes: ["apple-airpods-", "amazon-echo-plus-"],
    },
    {
      daysAgo: 4,
      method: "express" as const,
      shippingCents: 1299,
      prefixes: ["nike-air-jordan-1-"],
    },
  ];

  let historyCount = 0;

  for (const plan of historyPlan) {
    const picked = await db
      .select({
        variantId: variants.id,
        priceCents: variants.priceCents,
        option1Value: variants.option1Value,
        option2Value: variants.option2Value,
        slug: products.slug,
        title: products.title,
        images: products.images,
      })
      .from(products)
      .innerJoin(variants, eq(variants.productId, products.id))
      .where(or(...plan.prefixes.map((prefix) => like(products.slug, `${prefix}%`))))
      .orderBy(asc(products.slug), asc(variants.position));

    // One variant per product — the first, deterministically.
    const bySlug = new Map<string, (typeof picked)[number]>();
    for (const row of picked) if (!bySlug.has(row.slug)) bySlug.set(row.slug, row);
    const lines = [...bySlug.values()];
    if (lines.length === 0) {
      throw new Error(
        `Demo history: no products matched ${plan.prefixes.join(", ")}. ` +
          "The catalog slugs have changed — update historyPlan.",
      );
    }

    const subtotalCents = lines.reduce((n, l) => n + l.priceCents, 0);
    const taxCents = taxCentsFor(subtotalCents);
    const placedAt = new Date(Date.now() - plan.daysAgo * 24 * 60 * 60 * 1000);

    const [order] = await db
      .insert(orders)
      .values({
        number: `8X-DEMO${historyCount + 1}`,
        userId: demoUser.id,
        status: "placed",
        shippingName: DEMO_NAME,
        shippingLine1: "27 Kingsway",
        shippingLine2: "Flat 4",
        shippingCity: "Brooklyn",
        shippingRegion: "NY",
        shippingPostalCode: "11201",
        shippingCountry: "United States",
        deliveryMethod: plan.method,
        deliveryEta: deliveryEta(plan.method, placedAt),
        paymentLabel: DEMO_PAYMENT_LABEL,
        subtotalCents,
        shippingCents: plan.shippingCents,
        taxCents,
        totalCents: subtotalCents + plan.shippingCents + taxCents,
        placedAt,
      })
      .returning({ id: orders.id });

    await db.insert(orderItems).values(
      lines.map((line) => ({
        orderId: order.id,
        variantId: line.variantId,
        productSlug: line.slug,
        productTitle: line.title,
        variantName:
          [line.option1Value, line.option2Value].filter(Boolean).join(" · ") || null,
        imageUrl: line.images[0],
        unitPriceCents: line.priceCents,
        quantity: 1,
      })),
    );

    historyCount++;
  }

  console.log(
    `seeded ${categoryRows.length} categories, ${productCount} products, ` +
      `${variantCount} variants, and the ${DEMO_EMAIL} demo account ` +
      `with ${historyCount} past orders and ${demoAddress ? 1 : 0} saved address`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
