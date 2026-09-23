import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../index";
import { carts, cartItems, products, variants, categories } from "../schema";

export type CartLine = {
  itemId: string;
  variantId: string;
  quantity: number;
  /** What the shopper picked, e.g. "Large · Black". Null if no options. */
  optionSummary: string | null;
  priceCents: number;
  lineTotalCents: number;
  stock: number;
  product: { slug: string; title: string; image: string; categorySlug: string };
};

export type CartSummary = {
  lines: CartLine[];
  /** Sum of quantities, which is what the header badge shows. */
  itemCount: number;
  subtotalCents: number;
};

export const EMPTY_CART: CartSummary = { lines: [], itemCount: 0, subtotalCents: 0 };

/**
 * Who is asking. A signed-in shopper's cart is found by user id and *only* by
 * user id — never by the cookie still sitting in their browser (D30). That is
 * what stops a signed-out visitor from seeing the last user's cart, and a new
 * account from inheriting it.
 */
export type CartOwner = { userId?: string | null; sessionToken?: string | null };

function ownerWhere(owner: CartOwner) {
  if (owner.userId) return eq(carts.userId, owner.userId);
  if (owner.sessionToken) {
    // A guest cart must still be unclaimed. Belt and braces: the cookie is
    // rotated at sign-out, so this should never match an owned row anyway.
    return and(eq(carts.sessionToken, owner.sessionToken), isNull(carts.userId));
  }
  return null;
}

/** Reads a cart. Never creates one — reads must not write. */
export async function getCart(owner: CartOwner): Promise<CartSummary> {
  const where = ownerWhere(owner);
  if (!where) return EMPTY_CART;

  const rows = await db
    .select({
      itemId: cartItems.id,
      variantId: variants.id,
      quantity: cartItems.quantity,
      option1Value: variants.option1Value,
      option2Value: variants.option2Value,
      priceCents: variants.priceCents,
      stock: variants.stock,
      productSlug: products.slug,
      productTitle: products.title,
      images: products.images,
      categorySlug: categories.slug,
    })
    .from(carts)
    .innerJoin(cartItems, eq(cartItems.cartId, carts.id))
    .innerJoin(variants, eq(variants.id, cartItems.variantId))
    .innerJoin(products, eq(products.id, variants.productId))
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(where)
    .orderBy(asc(cartItems.createdAt));

  const lines: CartLine[] = rows.map((row) => ({
    itemId: row.itemId,
    variantId: row.variantId,
    quantity: row.quantity,
    optionSummary:
      [row.option1Value, row.option2Value].filter(Boolean).join(" · ") || null,
    priceCents: row.priceCents,
    lineTotalCents: row.priceCents * row.quantity,
    stock: row.stock,
    product: {
      slug: row.productSlug,
      title: row.productTitle,
      image: row.images[0],
      categorySlug: row.categorySlug,
    },
  }));

  return {
    lines,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    subtotalCents: lines.reduce((n, l) => n + l.lineTotalCents, 0),
  };
}

/** Just the badge number, so the header does not load the whole cart. */
export async function getCartCount(owner: CartOwner): Promise<number> {
  const where = ownerWhere(owner);
  if (!where) return 0;

  const [row] = await db
    .select({ count: sql<number>`coalesce(sum(${cartItems.quantity}), 0)::int` })
    .from(carts)
    .leftJoin(cartItems, eq(cartItems.cartId, carts.id))
    .where(where);
  return row?.count ?? 0;
}

/** Finds the cart id for a mutation, creating one if there is none yet. */
export async function ensureCartForWrite(owner: {
  userId?: string | null;
  sessionToken: string;
}): Promise<string> {
  if (owner.userId) {
    const [existing] = await db
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.userId, owner.userId))
      .limit(1);
    if (existing) return existing.id;

    const [created] = await db
      .insert(carts)
      .values({ userId: owner.userId, sessionToken: null })
      .returning({ id: carts.id });
    return created.id;
  }

  const [row] = await db
    .insert(carts)
    .values({ sessionToken: owner.sessionToken })
    .onConflictDoUpdate({
      target: carts.sessionToken,
      set: { updatedAt: new Date() },
    })
    .returning({ id: carts.id });
  return row.id;
}

export async function getVariantForCart(variantId: string) {
  const [row] = await db
    .select({
      id: variants.id,
      stock: variants.stock,
      option1Value: variants.option1Value,
      option2Value: variants.option2Value,
      priceCents: variants.priceCents,
      productTitle: products.title,
      productSlug: products.slug,
      images: products.images,
    })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(eq(variants.id, variantId))
    .limit(1);
  return row ?? null;
}
