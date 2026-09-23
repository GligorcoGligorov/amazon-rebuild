"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { carts, cartItems, variants } from "@/lib/db/schema";
import { signIn, signOut } from "@/lib/auth";
import { createUser, getUserByEmail, normaliseEmail } from "@/lib/db/queries/users";
import { ensureCartForWrite } from "@/lib/db/queries/cart";
import { clearCartSession, readSessionToken } from "@/lib/actions/cart";

export type AuthFormState = {
  error?: string;
  /** Which field the message belongs to, so it can be announced next to it. */
  field?: "email" | "password" | "name" | "form";
  values?: { email?: string; name?: string };
};

const MIN_PASSWORD = 8;

/** Only redirect to our own paths — never to another origin from a query param. */
function safeCallback(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

/**
 * Folds the guest cart into the user's cart and drops the guest row (D30).
 *
 * Direction matters. The **user's** cart is the target, because it is the one
 * that has to survive sign-out; the guest cart is consumed. Nothing is lost —
 * quantities sum and clamp to stock, the same as adding does — and because the
 * guest row is deleted and the cookie cleared, a cart can never be claimed by a
 * second account.
 */
async function mergeCartsOnSignIn(userId: string): Promise<void> {
  const token = await readSessionToken();

  const guest = token
    ? (
        await db
          .select({ id: carts.id })
          .from(carts)
          .where(and(eq(carts.sessionToken, token), isNull(carts.userId)))
          .limit(1)
      )[0]
    : undefined;

  const targetId = await ensureCartForWrite({ userId, sessionToken: token ?? "" });

  if (guest && guest.id !== targetId) {
    const rows = await db
      .select({
        variantId: cartItems.variantId,
        quantity: cartItems.quantity,
        stock: variants.stock,
      })
      .from(cartItems)
      .innerJoin(variants, eq(variants.id, cartItems.variantId))
      .where(eq(cartItems.cartId, guest.id));

    for (const row of rows) {
      if (row.stock <= 0) continue;
      await db
        .insert(cartItems)
        .values({
          cartId: targetId,
          variantId: row.variantId,
          quantity: Math.min(row.quantity, row.stock),
        })
        .onConflictDoUpdate({
          target: [cartItems.cartId, cartItems.variantId],
          set: {
            quantity: sql`least(${cartItems.quantity} + ${row.quantity}, ${row.stock})`,
          },
        });
    }

    await db.delete(carts).where(eq(carts.id, guest.id));
  }

  // The guest session is spent. Clearing it means the cookie cannot point at
  // anything claimable, and sign-out will hand out a fresh one.
  await clearCartSession();
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const callbackUrl = safeCallback(formData.get("callbackUrl"));

  if (!email || !password) {
    return {
      error: "Enter your email and password.",
      field: "form",
      values: { email },
    };
  }

  // Credentials are verified here rather than by reading what signIn returns:
  // across Auth.js v5 betas it variously throws, returns a URL, or returns an
  // object with an `error`, and guessing wrong silently signs people in.
  // Checking first also keeps the failure message ours to word.
  const user = await getUserByEmail(email);
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !valid) {
    // Deliberately one message for both unknown-email and wrong-password: the
    // form must not reveal which addresses have accounts.
    return {
      error: "That email and password do not match an account.",
      field: "password",
      values: { email },
    };
  }

  // The merge runs first: signIn below performs the redirect itself, by
  // throwing, so nothing after it would execute. `redirect: false` looked
  // tidier but does not persist the session cookie in this Auth.js beta.
  await mergeCartsOnSignIn(user.id);
  revalidatePath("/", "layout");

  await signIn("credentials", { email, password, redirectTo: callbackUrl });
  // Unreachable: signIn throws NEXT_REDIRECT.
  return {};
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const callbackUrl = safeCallback(formData.get("callbackUrl"));
  const values = { email, name };

  if (!name) return { error: "Enter your name.", field: "name", values };

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address.", field: "email", values };
  }

  if (password.length < MIN_PASSWORD) {
    return {
      error: `Use at least ${MIN_PASSWORD} characters. Yours has ${password.length}.`,
      field: "password",
      values,
    };
  }

  if (await getUserByEmail(email)) {
    return {
      error: "An account already uses that email. Sign in instead.",
      field: "email",
      values,
    };
  }

  const user = await createUser({
    email: normaliseEmail(email),
    name,
    passwordHash: await bcrypt.hash(password, 10),
  });

  await mergeCartsOnSignIn(user.id);
  revalidatePath("/", "layout");

  await signIn("credentials", { email, password, redirectTo: callbackUrl });
  return {};
}

export async function signOutAction(): Promise<void> {
  // The user's cart stays in the database under their user id; what goes is the
  // browser's claim on it. Without this the next visitor to this browser — or
  // the next account created in it — inherits the cart (D30).
  await clearCartSession();
  revalidatePath("/", "layout");
  await signOut({ redirectTo: "/" });
}
