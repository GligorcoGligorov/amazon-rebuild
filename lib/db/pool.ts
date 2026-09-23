import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

/**
 * A second connection, over WebSockets, used **only** where a real transaction
 * is needed — placing an order (D32). The HTTP driver the rest of the app uses
 * is faster and simpler but cannot do multi-statement transactions at all.
 *
 * Node 22 has a global WebSocket, so this needs no `ws` package.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

export const pool = new Pool({ connectionString });
export const txDb = drizzle(pool, { schema });
