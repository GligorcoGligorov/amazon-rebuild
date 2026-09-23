"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Failing mid-checkout is the worst moment to lose someone, so this says
 * plainly that nothing was charged and points back at the cart, which still
 * holds everything.
 */
export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-start px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        Checkout could not continue
      </h1>
      <p className="mt-3 text-ink-600">
        Nothing was charged and your cart is still intact. Try again, or go back
        to the cart and start the checkout afresh.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-hover"
        >
          Try again
        </button>
        <Link
          href="/cart"
          className="rounded-md border border-border px-4 py-2.5 text-sm font-semibold hover:border-ink-400"
        >
          Back to cart
        </Link>
      </div>

      {error.digest ? (
        <p className="mt-6 text-xs text-ink-400">
          Reference <span className="font-mono">{error.digest}</span>
        </p>
      ) : null}
    </div>
  );
}
