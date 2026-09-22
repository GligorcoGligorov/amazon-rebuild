import Link from "next/link";

/**
 * The search box is a plain GET form to /search — no client state, no
 * JavaScript needed. Typing and pressing Enter produces a shareable URL, which
 * is the same contract the filters and the variant selector use (D19).
 *
 * The cart badge is still a shell until M4.
 */
export function SiteHeader() {
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
        <form
          action="/search"
          method="get"
          role="search"
          className="order-last flex w-full gap-2 sm:order-none sm:w-auto sm:flex-1"
        >
          <label htmlFor="site-search" className="sr-only">
            Search products
          </label>
          <input
            id="site-search"
            name="q"
            type="search"
            placeholder="Search products"
            className="min-w-0 flex-1 rounded-md border border-transparent bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400"
          />
          <button
            type="submit"
            className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:bg-accent-hover"
          >
            Search
          </button>
        </form>

        <Link
          href="/cart"
          className="ml-auto flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium sm:ml-0"
        >
          Cart
          <span
            aria-hidden="true"
            className="inline-flex min-w-6 justify-center rounded-full bg-accent px-1.5 py-0.5 text-xs font-bold text-accent-ink"
          >
            0
          </span>
          <span className="sr-only">0 items in cart</span>
        </Link>
      </div>
    </header>
  );
}
