import { pgTable, text, integer, timestamp, uuid, index } from "drizzle-orm/pg-core";

// M1 lands `categories` only. Products, variants, carts and orders arrive with
// the milestone that needs them — see docs/ARCHITECTURE.md for the full plan.

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

export type Category = typeof categories.$inferSelect;
