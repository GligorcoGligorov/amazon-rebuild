"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cartItems, carts, variants } from "@/lib/db/schema";
import { ensureCart, getVariantForCart } from "@/lib/db/queries/cart";

const COOKIE = "cart_session";
const ONE_MONTH = 60 * 60 * 24 * 30;

/** The session token as the *reader* sees it — never creates one. */
export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE)?.value;
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

  const token = await requireSessionToken();
  const cartId = await ensureCart(token);

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

/** Sets an absolute quantity. Zero removes the line, matching the trash icon. */
export async function setQuantity(itemId: string, quantity: number): Promise<void> {
  const token = await readSessionToken();
  if (!token) return;

  const next = Math.trunc(quantity);

  if (next <= 0) {
    await removeFromCart(itemId);
    return;
  }

  // Scoped to this session's cart, so an item id from elsewhere cannot be
  // edited by guessing it.
  const [owned] = await db
    .select({ id: cartItems.id, stock: variants.stock })
    .from(cartItems)
    .innerJoin(carts, eq(carts.id, cartItems.cartId))
    .innerJoin(variants, eq(variants.id, cartItems.variantId))
    .where(and(eq(cartItems.id, itemId), eq(carts.sessionToken, token)))
    .limit(1);

  if (!owned) return;

  await db
    .update(cartItems)
    .set({ quantity: Math.min(next, owned.stock) })
    .where(eq(cartItems.id, itemId));

  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export async function removeFromCart(itemId: string): Promise<void> {
  const token = await readSessionToken();
  if (!token) return;

  const [owned] = await db
    .select({ id: cartItems.id })
    .from(cartItems)
    .innerJoin(carts, eq(carts.id, cartItems.cartId))
    .where(and(eq(cartItems.id, itemId), eq(carts.sessionToken, token)))
    .limit(1);

  if (!owned) return;

  await db.delete(cartItems).where(eq(cartItems.id, itemId));

  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

/** Form-action wrappers, so the cart page works without JavaScript. */
export async function setQuantityAction(formData: FormData): Promise<void> {
  await setQuantity(
    String(formData.get("itemId")),
    Number(formData.get("quantity")),
  );
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
