import Link from "next/link";
import { Suspense } from "react";
import { SearchBox, SearchForm } from "./search-box";
import { readSessionToken } from "@/lib/actions/cart";
import { getCartCount } from "@/lib/db/queries/cart";

/**
 * The search box is a plain GET form to /search: typing and pressing Enter
 * produces a shareable URL, the same contract the filters and the variant
 * selector use (D19). It is a Client Component only so it can show the query
 * that produced the current page.
 *
 * The cart badge reads the live count for this session.
 */
export async function SiteHeader() {
  const count = await getCartCount(await readSessionToken());

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-ink-900 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight whitespace-nowrap"
        >
          8x<span className="text-accent">store</span>
        </Link>

        {/* Order matters: on mobile this wraps to its own full-width row. */}
        {/* The fallback is the same working form with an empty value, so
            search functions before hydration and without JavaScript — it just
            does not prefill until the client knows the query. */}
        <Suspense fallback={<SearchForm />}>
          <SearchBox />
        </Suspense>

        <Link
          href="/cart"
          className="ml-auto flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium sm:ml-0"
        >
          Cart
          <span
            aria-hidden="true"
            className="inline-flex min-w-6 justify-center rounded-full bg-accent px-1.5 py-0.5 text-xs font-bold text-accent-ink"
          >
            {count}
          </span>
          <span className="sr-only">
            {count} {count === 1 ? "item" : "items"} in cart
          </span>
        </Link>
      </div>
    </header>
  );
}
