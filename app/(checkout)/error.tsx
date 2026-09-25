"use client";

import Link from "next/link";
import { useEffect } from "react";
import { buttonClass } from "@/components/ui/button";

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
    <div className="mx-auto flex max-w-6xl flex-col items-start px-4 pt-10 sm:px-6 sm:pt-20">
      <h1 className="max-w-2xl font-display text-5xl leading-none sm:text-6xl">
        Checkout could not continue
      </h1>
      <p className="mt-4 max-w-md text-ink-600">
        Nothing was charged and your cart is still intact. Try again, or go back
        to the cart and start the checkout afresh.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className={buttonClass({ variant: "ink" })}
        >
          Try again
        </button>
        <Link
          href="/cart"
          className={buttonClass({ variant: "secondary" })}
        >
          Back to cart
        </Link>
      </div>

      {error.digest ? (
        <p className="eyebrow mt-6">
          Reference <span className="font-mono">{error.digest}</span>
        </p>
      ) : null}
    </div>
  );
}
