import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  index,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Addresses and orders arrive with M6 — see docs/ARCHITECTURE.md.

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Stored lower-cased and trimmed, so sign-in is not case-sensitive.
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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

/**
 * A cart belongs either to a browser session or to a user, never ambiguously
 * to both (D30).
 *
 * - Guest cart: `session_token` set, `user_id` null.
 * - User cart:  `user_id` set, `session_token` null.
 *
 * Sign-in folds the guest cart into the user's and drops the guest row, so a
 * cart can never be claimed twice. Sign-out clears the cookie, so the next
 * visitor starts empty rather than inheriting whoever was here last.
 */
export const carts = pgTable(
  "carts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Null once the cart belongs to a user.
    sessionToken: text("session_token").unique(),
    // Null while the cart belongs to a browser session.
    userId: uuid("user_id")
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("carts_session_idx").on(t.sessionToken),
    index("carts_user_idx").on(t.userId),
    // Exactly one owner. The application enforces this too, but the bug that
    // made a signed-out visitor see the last user's cart came from a row that
    // had both — so the database refuses to store one now.
    check(
      "carts_owner_exclusive",
      sql`(${t.userId} is null) <> (${t.sessionToken} is null)`,
    ),
  ],
);

/**
 * Line items reference a variant, never a product — the variant is the
 * sellable unit (D7). One row per variant per cart, so adding the same variant
 * twice increments rather than duplicating.
 */
export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("cart_items_cart_idx").on(t.cartId),
    unique("cart_items_cart_variant_key").on(t.cartId, t.variantId),
  ],
);

export const cartsRelations = relations(carts, ({ one, many }) => ({
  items: many(cartItems),
  user: one(users, { fields: [carts.userId], references: [users.id] }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  variant: one(variants, {
    fields: [cartItems.variantId],
    references: [variants.id],
  }),
}));

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
export type User = typeof users.$inferSelect;
export type Cart = typeof carts.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
