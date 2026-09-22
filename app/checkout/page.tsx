import Link from "next/link";
import type { Metadata } from "next";
import { readSessionToken } from "@/lib/actions/cart";
import { getCart } from "@/lib/db/queries/cart";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

/**
 * M4 ships this so the drawer's Checkout button leads somewhere real rather
 * than a 404. M5 puts the auth wall in front of it; M6 replaces it with the
 * four-step accordion.
 */
export default async function CheckoutPage() {
  const cart = await getCart(await readSessionToken());

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>

      {cart.itemCount === 0 ? (
        <>
          <p className="mt-2 text-ink-600">
            There is nothing to check out — your cart is empty.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:bg-accent-hover"
          >
            Browse categories
          </Link>
        </>
      ) : (
        <>
          <p className="mt-2 text-ink-600">
            {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"},{" "}
            <span className="font-semibold text-ink-900">
              {formatPrice(cart.subtotalCents)}
            </span>
            .
          </p>
          <p className="mt-4 rounded-lg border border-border bg-surface-sunken p-4 text-sm text-ink-600">
            Payment and delivery arrive in the next update. Your cart is saved
            until then.
          </p>
          <Link
            href="/cart"
            className="mt-6 inline-block rounded-md border border-border px-4 py-2 text-sm font-semibold hover:border-ink-400"
          >
            Back to cart
          </Link>
        </>
      )}
    </div>
  );
}
