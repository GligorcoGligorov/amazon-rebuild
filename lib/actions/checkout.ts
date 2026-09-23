"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { txDb } from "@/lib/db/pool";
import {
  addresses,
  cartItems,
  carts,
  orderItems,
  orders,
  products,
  users,
  variants,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { getAddress } from "@/lib/db/queries/orders";
import {
  DEMO_PAYMENT_LABEL,
  deliveryEta,
  generateOrderNumber,
  isDeliveryMethod,
  shippingCentsFor,
  taxCentsFor,
  type DeliveryMethod,
} from "@/lib/checkout";

export type AddressFormState = {
  error?: string;
  field?: "fullName" | "line1" | "city" | "region" | "postalCode" | "form";
  values?: Record<string, string>;
};

/**
 * The signed-in user, verified to still exist. A JWT outlives the row it points
 * at, and writing an address or an order against a missing user is a 500 rather
 * than a redirect to sign in.
 */
async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/sign-in?callbackUrl=%2Fcheckout");

  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) redirect("/sign-in?callbackUrl=%2Fcheckout");

  return row.id;
}

const REQUIRED: { name: AddressFormState["field"]; label: string }[] = [
  { name: "fullName", label: "Enter the recipient's full name." },
  { name: "line1", label: "Enter a street address." },
  { name: "city", label: "Enter a city." },
  { name: "region", label: "Enter a state or region." },
  { name: "postalCode", label: "Enter a postal code." },
];

/** Saves a delivery address, then advances the accordion to the next step. */
export async function saveAddressAction(
  _prev: AddressFormState,
  formData: FormData,
): Promise<AddressFormState> {
  const userId = await requireUserId();

  const values: Record<string, string> = {};
  for (const key of ["fullName", "line1", "line2", "city", "region", "postalCode"]) {
    values[key] = String(formData.get(key) ?? "").trim();
  }

  for (const field of REQUIRED) {
    if (!values[field.name!]) {
      return { error: field.label, field: field.name, values };
    }
  }

  const [saved] = await db
    .insert(addresses)
    .values({
      userId,
      fullName: values.fullName,
      line1: values.line1,
      line2: values.line2 || null,
      city: values.city,
      region: values.region,
      postalCode: values.postalCode,
      country: "United States",
    })
    .returning({ id: addresses.id });

  revalidatePath("/account/addresses");
  redirect(`/checkout?step=delivery&address=${saved.id}`);
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("addressId"));
  await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
  revalidatePath("/account/addresses");
}

export type PlaceOrderState = { error?: string };

/**
 * Places the order in one transaction: snapshot the lines, decrement stock,
 * empty the cart. Either all of it happens or none of it does (D32).
 *
 * Stock is re-checked inside the transaction with `FOR UPDATE`, because a cart
 * can sit for days and the catalog moves underneath it. Two people checking out
 * the last unit at the same time is exactly what the row lock is for.
 */
export async function placeOrderAction(
  _prev: PlaceOrderState,
  formData: FormData,
): Promise<PlaceOrderState> {
  const userId = await requireUserId();

  const addressId = String(formData.get("address") ?? "");
  const methodRaw = String(formData.get("delivery") ?? "");

  const address = addressId ? await getAddress(userId, addressId) : null;
  if (!address) {
    return { error: "Choose a delivery address before placing the order." };
  }
  if (!isDeliveryMethod(methodRaw)) {
    return { error: "Choose a delivery speed before placing the order." };
  }
  const method: DeliveryMethod = methodRaw;

  let orderId: string;

  try {
    orderId = await txDb.transaction(async (tx) => {
      const [cart] = await tx
        .select({ id: carts.id })
        .from(carts)
        .where(eq(carts.userId, userId))
        .limit(1);
      if (!cart) throw new CheckoutError("Your cart is empty.");

      // Lock the variant rows for the duration, so stock cannot move between
      // the check and the decrement.
      const lines = await tx
        .select({
          variantId: variants.id,
          quantity: cartItems.quantity,
          stock: variants.stock,
          priceCents: variants.priceCents,
          option1Value: variants.option1Value,
          option2Value: variants.option2Value,
          productSlug: products.slug,
          productTitle: products.title,
          images: products.images,
        })
        .from(cartItems)
        .innerJoin(variants, eq(variants.id, cartItems.variantId))
        .innerJoin(products, eq(products.id, variants.productId))
        .where(eq(cartItems.cartId, cart.id))
        .for("update", { of: variants });

      if (lines.length === 0) throw new CheckoutError("Your cart is empty.");

      const short = lines.filter((l) => l.stock < l.quantity);
      if (short.length > 0) {
        const first = short[0];
        throw new CheckoutError(
          first.stock === 0
            ? `${first.productTitle} sold out while it was in your cart. Remove it to continue.`
            : `Only ${first.stock} left of ${first.productTitle}. Reduce the quantity to continue.`,
        );
      }

      const subtotalCents = lines.reduce((n, l) => n + l.priceCents * l.quantity, 0);
      const shippingCents = shippingCentsFor(method, subtotalCents);
      const taxCents = taxCentsFor(subtotalCents);

      const [order] = await tx
        .insert(orders)
        .values({
          number: generateOrderNumber(),
          userId,
          status: "placed",
          shippingName: address.fullName,
          shippingLine1: address.line1,
          shippingLine2: address.line2,
          shippingCity: address.city,
          shippingRegion: address.region,
          shippingPostalCode: address.postalCode,
          shippingCountry: address.country,
          deliveryMethod: method,
          deliveryEta: deliveryEta(method),
          paymentLabel: DEMO_PAYMENT_LABEL,
          subtotalCents,
          shippingCents,
          taxCents,
          totalCents: subtotalCents + shippingCents + taxCents,
        })
        .returning({ id: orders.id });

      await tx.insert(orderItems).values(
        lines.map((line) => ({
          orderId: order.id,
          variantId: line.variantId,
          productSlug: line.productSlug,
          productTitle: line.productTitle,
          variantName:
            [line.option1Value, line.option2Value].filter(Boolean).join(" · ") || null,
          imageUrl: line.images[0],
          unitPriceCents: line.priceCents,
          quantity: line.quantity,
        })),
      );

      for (const line of lines) {
        await tx
          .update(variants)
          .set({ stock: sql`${variants.stock} - ${line.quantity}` })
          .where(eq(variants.id, line.variantId));
      }

      await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));

      return order.id;
    });
  } catch (error) {
    if (error instanceof CheckoutError) return { error: error.message };
    throw error;
  }

  revalidatePath("/", "layout");
  revalidatePath("/orders");
  redirect(`/orders/${orderId}?placed=1`);
}

/** A failure the shopper can act on, as opposed to a bug. */
class CheckoutError extends Error {}
