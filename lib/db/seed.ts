import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import { categories } from "./schema";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL must be set.");

// The six dummyjson categories the catalog is built from (D14). M2 pulls the
// products; M1 only needs the taxonomy so the home page has something real to
// read. Category images are chosen by M2 — left null rather than guessed.
const rows = [
  { slug: "mens-shirts", name: "Men's Shirts", position: 10 },
  { slug: "womens-dresses", name: "Women's Dresses", position: 20 },
  { slug: "mens-shoes", name: "Men's Shoes", position: 30 },
  { slug: "womens-shoes", name: "Women's Shoes", position: 40 },
  { slug: "laptops", name: "Laptops", position: 50 },
  { slug: "smartphones", name: "Smartphones", position: 60 },
];

async function main() {
  const db = drizzle(neon(url!));
  await db
    .insert(categories)
    .values(rows)
    .onConflictDoUpdate({
      target: categories.slug,
      // `excluded` is the row we tried to insert — re-running the seed updates
      // existing rows instead of failing on the unique slug.
      set: { name: sql`excluded.name`, position: sql`excluded.position` },
    });
  console.log(`seeded ${rows.length} categories`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
