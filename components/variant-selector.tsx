import Link from "next/link";
import type { Variant } from "@/lib/db/schema";
import { optionParam } from "@/lib/format";

export type OptionState = {
  label: string;
  param: string;
  values: { value: string; available: boolean; selected: boolean; href: string }[];
};

/**
 * Selection lives in the URL, not client state. That keeps the page a Server
 * Component, makes a chosen variant shareable, and makes the back button work —
 * which is the exit criterion for M2.
 *
 * Three states per value: selected, available, and
 * out-of-stock. Out-of-stock values are shown, never hidden, so the range stays
 * legible (see research/FINDINGS.md).
 */
export function buildOptionStates(
  slug: string,
  option1Label: string | null,
  option2Label: string | null,
  variants: Variant[],
  selected: Variant,
): OptionState[] {
  const states: OptionState[] = [];

  const dimensions = [
    { label: option1Label, key: "option1Value" as const, other: "option2Value" as const },
    { label: option2Label, key: "option2Value" as const, other: "option1Value" as const },
  ];

  for (const dim of dimensions) {
    if (!dim.label) continue;

    const seen = new Set<string>();
    const values: OptionState["values"] = [];

    for (const variant of variants) {
      const value = variant[dim.key];
      if (!value || seen.has(value)) continue;
      seen.add(value);

      // Available if some variant with this value, holding the other dimension
      // at its current selection, is in stock.
      const otherValue = selected[dim.other];
      const match = variants.find(
        (v) => v[dim.key] === value && v[dim.other] === otherValue,
      );
      const available = (match ?? variants.find((v) => v[dim.key] === value))!.stock > 0;

      const params = new URLSearchParams();
      const first = dim.key === "option1Value" ? value : selected.option1Value;
      const second = dim.key === "option2Value" ? value : selected.option2Value;
      if (option1Label && first) params.set(optionParam(option1Label), first);
      if (option2Label && second) params.set(optionParam(option2Label), second);

      values.push({
        value,
        available,
        selected: selected[dim.key] === value,
        href: `/product/${slug}?${params.toString()}`,
      });
    }

    states.push({ label: dim.label, param: optionParam(dim.label), values });
  }

  return states;
}

export function VariantSelector({ options }: { options: OptionState[] }) {
  if (options.length === 0) return null;

  return (
    <div className="flex flex-col gap-5">
      {options.map((option) => {
        const current = option.values.find((v) => v.selected);
        return (
          <fieldset key={option.label}>
            <legend className="mb-2.5 text-sm">
              <span className="text-ink-600">{option.label}: </span>
              <span className="font-medium">{current?.value ?? "—"}</span>
            </legend>

            <ul className="flex flex-wrap gap-2">
              {option.values.map((value) => (
                <li key={value.value}>
                  <Link
                    href={value.href}
                    scroll={false}
                    aria-current={value.selected ? "true" : undefined}
                    className={[
                      "inline-flex min-h-11 min-w-12 items-center justify-center rounded-md border px-4 text-sm transition-colors",
                      value.selected
                        ? "border-ink-900 bg-ink-900 font-medium text-white"
                        : value.available
                          ? "border-rule-strong bg-surface hover:border-ink-900"
                          : // Shown, not hidden: dashed and struck through, so
                            // the range stays legible and the state is not
                            // carried by colour alone (D16).
                            "border-dashed border-rule-strong text-ink-400 line-through decoration-ink-400",
                    ].join(" ")}
                  >
                    {value.value}
                    {!value.available ? (
                      <span className="sr-only"> — out of stock</span>
                    ) : null}
                    {value.selected ? <span className="sr-only"> — selected</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </fieldset>
        );
      })}
    </div>
  );
}
