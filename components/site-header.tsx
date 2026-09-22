import Link from "next/link";

/**
 * The search input and cart badge are shells until M3 and M4 respectively.
 * They are rendered now so the layout is settled before features land on it —
 * but the input is deliberately disabled rather than a dead box that swallows
 * typing, and the badge reads zero rather than a fake number.
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
        <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
          <label htmlFor="site-search" className="sr-only">
            Search products
          </label>
          <input
            id="site-search"
            type="search"
            placeholder="Search products"
            disabled
            aria-describedby="site-search-hint"
            className="w-full rounded-md border border-transparent bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 disabled:cursor-not-allowed disabled:opacity-70"
          />
          <span id="site-search-hint" className="sr-only">
            Search is not available yet
          </span>
        </div>

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
