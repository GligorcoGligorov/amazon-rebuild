"use client";

import { useSearchParams } from "next/navigation";

/**
 * A plain GET form to /search — no fetch, no client routing. Submitting
 * produces a shareable URL, the same contract the filters and the variant
 * selector use (D19).
 *
 * It is a Client Component for one reason: the input has to show the query that
 * produced the current page, so a shopper can edit "shirt" rather than retype
 * it. `useSearchParams` puts it behind a Suspense boundary, so the fallback in
 * `site-header.tsx` renders the *same form* with an empty value — search still
 * works before hydration and with JavaScript off, it just does not prefill.
 */
export function SearchBox() {
  const q = useSearchParams().get("q") ?? "";
  // `key` resets the input when the query changes via a link — a filter chip,
  // say — rather than through this form.
  return <SearchForm key={q} defaultQuery={q} />;
}

export function SearchForm({ defaultQuery = "" }: { defaultQuery?: string }) {
  return (
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
        defaultValue={defaultQuery}
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
  );
}
