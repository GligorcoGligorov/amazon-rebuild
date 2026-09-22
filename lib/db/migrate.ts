import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

config({ path: ".env.local" });

// Migrations run against the unpooled connection: the pooler does not keep the
// session state that DDL needs.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL must be set.");

async function main() {
  await migrate(drizzle(neon(url!)), { migrationsFolder: "./drizzle" });
  console.log("migrations applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
