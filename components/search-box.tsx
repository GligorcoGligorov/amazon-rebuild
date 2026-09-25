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
      className="order-last flex w-full sm:order-none sm:w-auto sm:max-w-xl sm:flex-1"
    >
      <label htmlFor="site-search" className="sr-only">
        Search products
      </label>
      <div className="relative min-w-0 flex-1">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        >
          <circle cx="8.5" cy="8.5" r="5.75" />
          <path d="m13 13 4.25 4.25" strokeLinecap="round" />
        </svg>
        <input
          id="site-search"
          name="q"
          type="search"
          defaultValue={defaultQuery}
          placeholder="Search goods and brands"
          className="h-11 w-full rounded-l-md border border-r-0 border-rule-strong bg-surface pr-3 pl-9 text-[0.9375rem] text-ink-900 placeholder:text-ink-400 focus:border-ink-900"
        />
      </div>
      <button
        type="submit"
        className="h-11 shrink-0 rounded-r-md bg-ink-900 px-4 text-sm font-medium text-white hover:bg-ink-800"
      >
        Search
      </button>
    </form>
  );
}
