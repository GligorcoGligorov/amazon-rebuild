import { asc } from "drizzle-orm";
import { db } from "../index";
import { categories, type Category } from "../schema";

export async function getCategories(): Promise<Category[]> {
  return db.select().from(categories).orderBy(asc(categories.position));
}
