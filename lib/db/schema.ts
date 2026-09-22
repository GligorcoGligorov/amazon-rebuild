import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Carts, orders and users arrive with the milestones that need them —
// see docs/ARCHITECTURE.md for the full plan.

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    // Remote image, served from cdn.dummyjson.com — see D14.
    imageUrl: text("image_url"),
    // Controls tile order on the home page. Low numbers first.
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("categories_position_idx").on(t.position)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    brand: text("brand"),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    // Gallery, first image first. Always at least one.
    images: text("images").array().notNull(),
    rating: integer("rating"), // stored ×100, e.g. 283 = 2.83 stars

    // The variant dimensions this product uses, in selector order. Null means
    // the product has no choices to make and carries exactly one variant.
    // Generic on purpose: "Size"/"Colour" for clothing, "Storage"/"Colour" for
    // devices, and one dimension where that is all a product has.
    option1Label: text("option1_label"),
    option2Label: text("option2_label"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("products_category_idx").on(t.categoryId)],
);

/**
 * The sellable unit. Price and stock live here, never on `products` — see D7.
 * A product with no options still gets exactly one row, with null option values.
 */
export const variants = pgTable(
  "variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(),
    option1Value: text("option1_value"),
    option2Value: text("option2_value"),
    priceCents: integer("price_cents").notNull(),
    // Struck-through "was" price. Null when the variant is not discounted.
    compareAtCents: integer("compare_at_cents"),
    stock: integer("stock").notNull().default(0),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("variants_product_idx").on(t.productId),
    // One row per combination. `nullsNotDistinct` matters: without it Postgres
    // treats every NULL as unique, so a no-options product could take two
    // (null, null) rows. The seed is re-runnable and must not duplicate.
    unique("variants_product_options_key")
      .on(t.productId, t.option1Value, t.option2Value)
      .nullsNotDistinct(),
  ],
);

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  variants: many(variants),
}));

export const variantsRelations = relations(variants, ({ one }) => ({
  product: one(products, {
    fields: [variants.productId],
    references: [products.id],
  }),
}));

export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Variant = typeof variants.$inferSelect;
