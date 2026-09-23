"use client";

import Link from "next/link";
import { useEffect } from "react";

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
    <div className="mx-auto flex max-w-lg flex-col items-start px-4 py-16 sm:py-24">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Something went wrong
      </h1>
      <p className="mt-3 text-ink-600">
        That page failed to load. Your cart and account are unaffected.
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
          href="/"
          className="rounded-md border border-border px-4 py-2.5 text-sm font-semibold hover:border-ink-400"
        >
          Go to the home page
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
