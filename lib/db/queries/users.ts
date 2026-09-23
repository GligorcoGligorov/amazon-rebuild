import { eq } from "drizzle-orm";
import { db } from "../index";
import { users, type User } from "../schema";

/** Emails are stored lower-cased and trimmed, so sign-in is not case-sensitive. */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, normaliseEmail(email)))
    .limit(1);
  return row ?? null;
}

export async function createUser(input: {
  email: string;
  name: string;
  passwordHash: string;
}): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({
      email: normaliseEmail(input.email),
      name: input.name.trim(),
      passwordHash: input.passwordHash,
    })
    .returning();
  return row;
}
