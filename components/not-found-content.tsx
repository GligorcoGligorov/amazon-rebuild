import Link from "next/link";

/**
 * Shared by the root 404 (unmatched URLs) and the shop 404 (a `notFound()`
 * from a product, category or order). Both need the same content; only the
 * chrome around them differs, because the root layout has none.
 */
export function NotFoundContent({
  title = "We can't find that page",
  description = "The link may be out of date, or the item may no longer be in the catalog.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start px-4 py-16 sm:py-24">
      <p className="text-sm font-semibold uppercase tracking-wide text-ink-400">
        404
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h1>
      <p className="mt-3 text-ink-600">{description}</p>

      {/* A dead end needs exits, not just an apology. */}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-hover"
        >
          Go to the home page
        </Link>
        <Link
          href="/search"
          className="rounded-md border border-border px-4 py-2.5 text-sm font-semibold hover:border-ink-400"
        >
          Browse all products
        </Link>
      </div>
    </div>
  );
}
