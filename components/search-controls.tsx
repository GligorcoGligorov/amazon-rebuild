import Link from "next/link";
import { SORTS, type SortKey } from "@/lib/db/queries/search";

type Props = {
  q: string;
  category: string;
  sort: SortKey;
  categoryName: string | null;
  facets: { slug: string; name: string; count: number }[];
};

function hrefFor(base: Props, patch: Partial<Record<"q" | "category" | "sort", string>>) {
  const params = new URLSearchParams();
  const q = patch.q !== undefined ? patch.q : base.q;
  const category = patch.category !== undefined ? patch.category : base.category;
  const sort = patch.sort !== undefined ? patch.sort : base.sort;
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (sort && sort !== "relevance") params.set("sort", sort);
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

/**
 * Everything here is a link — no client state. Filters live in the URL (D19
 * again), so back, reload and sharing all work and the page stays a Server
 * Component.
 *
 * At mobile widths each control is a single horizontally-scrolling row of
 * chips, so the first product stays near the top of the screen; on desktop the
 * categories become a vertical sidebar. This is the one thing Amazon's mobile
 * search gets right, and it needs no JavaScript.
 *
 * `<details>` was tried first and does not work here: Chromium does not render
 * a closed details element's children at all, so CSS cannot force it open at
 * desktop widths.
 */

const chipBase =
  "inline-block shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors";
const chipOn = "bg-ink-900 font-semibold text-white";
const chipOff = "border border-border hover:border-ink-400";

/** One row of chips: scrolls sideways on mobile, wraps or stacks on desktop. */
const scroller =
  "-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export function AppliedFilters(props: Props) {
  const chips: { label: string; href: string }[] = [];

  if (props.q) {
    chips.push({ label: `“${props.q}”`, href: hrefFor(props, { q: "" }) });
  }
  if (props.category && props.categoryName) {
    chips.push({ label: props.categoryName, href: hrefFor(props, { category: "" }) });
  }

  if (chips.length === 0) return null;

  return (
    // Amazon shows an applied filter only as a ticked checkbox in a long rail,
    // with no summary of what is active. Ours shows removable chips (D10).
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-ink-600">Filters:</span>
      <ul className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <li key={chip.label}>
            <Link
              href={chip.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-sunken py-1 pl-3 pr-2 text-sm hover:border-ink-400"
            >
              {chip.label}
              <span aria-hidden="true" className="text-ink-400">
                ×
              </span>
              <span className="sr-only">— remove this filter</span>
            </Link>
          </li>
        ))}
      </ul>
      {chips.length > 1 ? (
        <Link href="/search" className="text-sm text-link underline underline-offset-2">
          Clear all
        </Link>
      ) : null}
    </div>
  );
}

export function CategoryFacets(props: Props) {
  if (props.facets.length === 0) return null;

  return (
    <nav aria-labelledby="facet-heading">
      <h2
        id="facet-heading"
        className="mb-2 text-sm font-semibold text-ink-600 lg:text-ink-900"
      >
        Category
      </h2>
      <ul className={`${scroller} lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0`}>
        <li>
          <Link
            href={hrefFor(props, { category: "" })}
            aria-current={props.category === "" ? "true" : undefined}
            className={`${chipBase} whitespace-nowrap lg:w-full ${
              props.category === ""
                ? chipOn
                : `${chipOff} lg:border-0 lg:hover:bg-surface-sunken`
            }`}
          >
            All categories
          </Link>
        </li>
        {props.facets.map((facet) => (
          <li key={facet.slug}>
            <Link
              href={hrefFor(props, { category: facet.slug })}
              aria-current={props.category === facet.slug ? "true" : undefined}
              className={`${chipBase} whitespace-nowrap lg:w-full ${
                props.category === facet.slug
                  ? chipOn
                  : `${chipOff} lg:border-0 lg:hover:bg-surface-sunken`
              }`}
            >
              {facet.name}{" "}
              <span
                className={
                  props.category === facet.slug ? "text-white/70" : "text-ink-400"
                }
              >
                ({facet.count})
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SortLinks(props: Props) {
  return (
    <div>
      <h2 id="sort-label" className="mb-2 text-sm font-semibold text-ink-600">
        Sort
      </h2>
      <ul
        aria-labelledby="sort-label"
        className={`${scroller} lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0`}
      >
        {(Object.keys(SORTS) as SortKey[]).map((key) => (
          <li key={key}>
            <Link
              href={hrefFor(props, { sort: key })}
              aria-current={props.sort === key ? "true" : undefined}
              className={`${chipBase} whitespace-nowrap ${
                props.sort === key ? chipOn : chipOff
              }`}
            >
              {SORTS[key]}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
