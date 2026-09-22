import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cart" };

// M1 ships the empty state only, so the header's cart link does not lead to a
// 404. M4 adds line items, the quantity stepper and the summary above them.
export default function CartPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Your cart
      </h1>
      <p className="mt-2 text-ink-600">
        Your cart is empty. Nothing has been added yet.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:bg-accent-hover"
      >
        Browse categories
      </Link>
    </div>
  );
}
