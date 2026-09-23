import Link from "next/link";
import { CHECKOUT_STEPS, STEP_LABELS, type CheckoutStep } from "@/lib/checkout";

/**
 * One step open at a time. Completed steps collapse to a one-line summary with
 * a Change link; steps not yet reached are inert (D11).
 *
 * The open step lives in the URL, so the back button walks the accordion and a
 * validation error cannot lose the shopper's place.
 */
export function CheckoutStepPanel({
  step,
  index,
  current,
  reached,
  summary,
  href,
  children,
}: {
  step: CheckoutStep;
  index: number;
  current: CheckoutStep;
  /** True once the shopper has enough state to open this step. */
  reached: boolean;
  /** One-line recap shown when the step is complete and collapsed. */
  summary?: string | null;
  href: string;
  children?: React.ReactNode;
}) {
  const isOpen = step === current;
  const isDone = Boolean(summary) && !isOpen;

  return (
    <section
      aria-labelledby={`step-${step}-heading`}
      aria-current={isOpen ? "step" : undefined}
      className={`rounded-lg border p-4 sm:p-5 ${
        isOpen ? "border-ink-900 bg-surface" : "border-border bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <h2
          id={`step-${step}-heading`}
          className={`flex items-baseline gap-2 text-base font-semibold ${
            reached ? "" : "text-ink-400"
          }`}
        >
          <span
            aria-hidden="true"
            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              isOpen
                ? "bg-ink-900 text-white"
                : isDone
                  ? "bg-success text-white"
                  : "bg-surface-sunken text-ink-400"
            }`}
          >
            {isDone ? "✓" : index + 1}
          </span>
          {STEP_LABELS[step]}
        </h2>

        {isDone ? (
          <Link
            href={href}
            className="shrink-0 text-sm text-link underline underline-offset-2"
          >
            Change
            <span className="sr-only"> {STEP_LABELS[step].toLowerCase()}</span>
          </Link>
        ) : null}
      </div>

      {isDone ? (
        <p className="mt-2 pl-8 text-sm text-ink-600">{summary}</p>
      ) : null}

      {isOpen ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

export function stepIndex(step: CheckoutStep): number {
  return CHECKOUT_STEPS.indexOf(step);
}
