import Link from "next/link";
import { Suspense } from "react";
import { SearchBox, SearchForm } from "./search-box";
import { currentCartOwner } from "@/lib/actions/cart";
import { getCartCount } from "@/lib/db/queries/cart";
import { auth } from "@/lib/auth";
import { Wordmark } from "./ui/wordmark";

/**
 * The search box is a plain GET form to /search: typing and pressing Enter
 * produces a shareable URL, the same contract the filters and the variant
 * selector use (D19). It is a Client Component only so it can show the query
 * that produced the current page.
 *
 * The cart badge reads the live count for this session.
 */
export async function SiteHeader() {
  const [count, session] = await Promise.all([
    currentCartOwner().then(getCartCount),
    auth(),
  ]);
  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-page text-ink-900">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 sm:px-6 sm:py-3">
        <Link
          href="/"
          /* Not flex: making this anchor a flex container splits the
             wordmark's text into separate flex items and Chrome can compute
             the accessible name with a stray space (M7). Padding gets the
             44px target without touching the name. */
          className="inline-block py-2.5 whitespace-nowrap"
        >
          <Wordmark />
        </Link>

        {/* Order matters: on mobile this wraps to its own full-width row. */}
        {/* The fallback is the same working form with an empty value, so
            search functions before hydration and without JavaScript — it just
            does not prefill until the client knows the query. */}
        <Suspense fallback={<SearchForm />}>
          <SearchBox />
        </Suspense>

        <nav aria-label="Account and cart" className="ml-auto flex items-center gap-1">
          <Link
            href={session ? "/account" : "/sign-in"}
            className="flex min-h-11 items-center px-2 text-sm font-medium hover:underline hover:underline-offset-4"
          >
            {session ? (
              <>
                <span className="hidden sm:inline">Hi, </span>
                {firstName ?? "Account"}
              </>
            ) : (
              "Sign in"
            )}
          </Link>

          <Link
            href="/cart"
            className="flex min-h-11 items-center gap-2 pl-2 text-sm font-medium hover:underline hover:underline-offset-4"
          >
            Cart
            <span
              aria-hidden="true"
              className={`inline-flex h-6 min-w-6 items-center justify-center px-1.5 font-mono text-xs ${
                count > 0 ? "bg-ink-900 text-white" : "border border-rule-strong text-ink-600"
              }`}
            >
              {count}
            </span>
            <span className="sr-only">
              {count} {count === 1 ? "item" : "items"} in cart
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
