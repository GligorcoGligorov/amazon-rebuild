"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cartItems, carts, variants } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { ensureCartForWrite, getVariantForCart, type CartOwner } from "@/lib/db/queries/cart";

const COOKIE = "cart_session";
const ONE_MONTH = 60 * 60 * 24 * 30;

/** The session token as the *reader* sees it — never creates one. */
export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE)?.value;
}

/**
 * Who the current cart belongs to. Signed in means the user's cart, full stop;
 * the cookie is ignored (D30).
 */
export async function currentCartOwner(): Promise<CartOwner> {
  const [session, sessionToken] = await Promise.all([auth(), readSessionToken()]);
  return session?.user?.id
    ? { userId: session.user.id }
    : { sessionToken: sessionToken ?? null };
}

/** Rotates the guest session at sign-out, so the next visitor starts empty. */
export async function clearCartSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

async function requireSessionToken(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing) return existing;

  const token = crypto.randomUUID();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_MONTH,
  });
  return token;
}

export type CartActionResult =
  | { ok: true; title: string; optionSummary: string | null; image: string }
  | { ok: false; error: string };

/**
 * Adds one variant to the cart. Quantity is clamped to available stock rather
 * than rejected outright — adding 3 when 2 remain should give you 2 and say so,
 * not fail.
 */
export async function addToCart(
  variantId: string,
  quantity = 1,
): Promise<CartActionResult> {
  const variant = await getVariantForCart(variantId);
  if (!variant) return { ok: false, error: "That item no longer exists." };
  if (variant.stock <= 0) return { ok: false, error: "That option is out of stock." };

  const session = await auth();
  const userId = session?.user?.id ?? null;
  // A signed-in shopper still gets a session token, so the cookie exists if
  // they later sign out — but their cart is found by user id.
  const token = await requireSessionToken();
  const cartId = await ensureCartForWrite({ userId, sessionToken: token });

  const wanted = Math.max(1, Math.trunc(quantity));

  // One row per variant: adding the same variant again increments, and the
  // total is capped at stock in the same statement to avoid a read-then-write
  // race between two tabs.
  await db
    .insert(cartItems)
    .values({ cartId, variantId, quantity: Math.min(wanted, variant.stock) })
    .onConflictDoUpdate({
      target: [cartItems.cartId, cartItems.variantId],
      set: {
        quantity: sql`least(${cartItems.quantity} + ${wanted}, ${variant.stock})`,
      },
    });

  revalidatePath("/cart");
  revalidatePath("/", "layout");

  return {
    ok: true,
    title: variant.productTitle,
    optionSummary:
      [variant.option1Value, variant.option2Value].filter(Boolean).join(" · ") || null,
    image: variant.images[0],
  };
}

/**
 * Every mutation is scoped to the caller's own cart, so an item id belonging to
 * someone else cannot be edited by guessing it.
 */
async function ownedItem(itemId: string) {
  const owner = await currentCartOwner();
  const where = owner.userId
    ? eq(carts.userId, owner.userId)
    : owner.sessionToken
      ? and(eq(carts.sessionToken, owner.sessionToken), isNull(carts.userId))
      : null;
  if (!where) return null;

  const [row] = await db
    .select({ id: cartItems.id, stock: variants.stock })
    .from(cartItems)
    .innerJoin(carts, eq(carts.id, cartItems.cartId))
    .innerJoin(variants, eq(variants.id, cartItems.variantId))
    .where(and(eq(cartItems.id, itemId), where))
    .limit(1);
  return row ?? null;
}

/** Sets an absolute quantity. Zero removes the line, matching the trash icon. */
export async function setQuantity(itemId: string, quantity: number): Promise<void> {
  const next = Math.trunc(quantity);
  if (next <= 0) {
    await removeFromCart(itemId);
    return;
  }

  const owned = await ownedItem(itemId);
  if (!owned) return;

  await db
    .update(cartItems)
    .set({ quantity: Math.min(next, owned.stock) })
    .where(eq(cartItems.id, itemId));

  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export async function removeFromCart(itemId: string): Promise<void> {
  const owned = await ownedItem(itemId);
  if (!owned) return;

  await db.delete(cartItems).where(eq(cartItems.id, itemId));

  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

/** Form-action wrappers, so the cart page works without JavaScript. */
export async function setQuantityAction(formData: FormData): Promise<void> {
  await setQuantity(String(formData.get("itemId")), Number(formData.get("quantity")));
}

export async function removeFromCartAction(formData: FormData): Promise<void> {
  await removeFromCart(String(formData.get("itemId")));
}

export async function addToCartAction(formData: FormData): Promise<void> {
  await addToCart(
    String(formData.get("variantId")),
    Number(formData.get("quantity") ?? 1),
  );
}
