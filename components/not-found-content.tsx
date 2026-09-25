import Link from "next/link";
import { buttonClass } from "./ui/button";

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
    <div className="mx-auto flex max-w-7xl flex-col items-start px-4 pt-10 sm:px-6 sm:pt-20">
      <p aria-hidden="true" className="font-mono text-7xl tracking-tight text-ink-400 sm:text-9xl">
        404
      </p>
      <h1 className="mt-4 max-w-2xl font-display text-5xl leading-none sm:text-6xl">
        {title}
      </h1>
      <p className="mt-4 max-w-md text-ink-600">{description}</p>

      {/* A dead end needs exits, not just an apology. */}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className={buttonClass({ variant: "ink" })}>
          Go to the home page
        </Link>
        <Link href="/search" className={buttonClass({ variant: "secondary" })}>
          Browse all products
        </Link>
      </div>
    </div>
  );
}
