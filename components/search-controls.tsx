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
 * chips, so the first product stays near the top of the screen (D23); on
 * desktop the categories become a ruled index down the side, the same shape as
 * the home page's department list. No JavaScript.
 *
 * `<details>` was tried first and does not work here: Chromium does not render
 * a closed details element's children at all, so CSS cannot force it open at
 * desktop widths.
 */

const chipBase =
  "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm transition-colors";
const chipOn = "border border-ink-900 bg-ink-900 text-white";
const chipOff = "border border-rule-strong bg-surface hover:border-ink-900";

/** From 1024px a facet stops being a chip and becomes a ruled index row. */
const facetRow =
  "lg:flex lg:min-h-11 lg:w-full lg:justify-between lg:rounded-none lg:border-0 lg:border-b lg:border-border lg:bg-transparent lg:px-0";

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
    // Every active filter is stated and removable on its own.
    <div className="flex flex-wrap items-center gap-2">
      <span className="eyebrow">Filters:</span>
      <ul className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <li key={chip.label}>
            <Link
              href={chip.href}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-900 bg-surface pr-2.5 pl-3 text-sm hover:bg-ink-900 hover:text-white"
            >
              {chip.label}
              <span aria-hidden="true">×</span>
              <span className="sr-only">— remove this filter</span>
            </Link>
          </li>
        ))}
      </ul>
      {chips.length > 1 ? (
        <Link
          href="/search"
          className="inline-flex min-h-10 items-center text-sm underline decoration-border underline-offset-4 hover:decoration-ink-900"
        >
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
      <h2 id="facet-heading" className="eyebrow mb-2 lg:mb-0 lg:border-b lg:border-ink-900 lg:pb-3">
        Category
      </h2>
      <ul className={`${scroller} lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:px-0`}>
        <li>
          <Link
            href={hrefFor(props, { category: "" })}
            aria-current={props.category === "" ? "true" : undefined}
            className={`${chipBase} whitespace-nowrap ${facetRow} ${
              props.category === ""
                ? `${chipOn} lg:font-medium lg:text-ink-900`
                : `${chipOff} lg:hover:underline lg:hover:underline-offset-4`
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
              className={`${chipBase} whitespace-nowrap ${facetRow} ${
                props.category === facet.slug
                  ? `${chipOn} lg:font-medium lg:text-ink-900`
                  : `${chipOff} lg:hover:underline lg:hover:underline-offset-4`
              }`}
            >
              <span>
                {props.category === facet.slug ? (
                  <span aria-hidden="true" className="mr-1.5 hidden lg:inline">
                    →
                  </span>
                ) : null}
                {facet.name}
              </span>
              <span
                className={`font-mono text-xs ${
                  props.category === facet.slug ? "text-white/70 lg:text-ink-600" : "text-ink-400"
                }`}
              >
                {facet.count}
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
      <h2 id="sort-label" className="eyebrow mb-2">
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
