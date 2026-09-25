"use client";

import Link from "next/link";
import { useEffect } from "react";
import { buttonClass } from "@/components/ui/button";

/**
 * Anything that throws below the shop layout. The message is deliberately not
 * shown — a raw error string helps nobody and can leak internals — but the
 * digest is, because that is what identifies it in the logs.
 */
export default function ShopError({
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
    <div className="mx-auto flex max-w-7xl flex-col items-start px-4 pt-10 sm:px-6 sm:pt-20">
      <h1 className="max-w-2xl font-display text-5xl leading-none sm:text-6xl">
        Something went wrong
      </h1>
      <p className="mt-4 max-w-md text-ink-600">
        That page failed to load. Your cart and account are unaffected.
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
          href="/"
          className={buttonClass({ variant: "secondary" })}
        >
          Go to the home page
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
