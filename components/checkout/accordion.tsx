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
      className={`border-t py-5 ${isOpen ? "border-ink-900" : "border-border"}`}
    >
      <div className="flex items-center justify-between gap-4">
        <h2
          id={`step-${step}-heading`}
          className={`flex items-baseline gap-3 font-display text-2xl leading-tight sm:text-[1.75rem] ${
            reached ? "" : "text-ink-400"
          }`}
        >
          <span
            aria-hidden="true"
            className={`w-6 shrink-0 font-mono text-xs ${
              isDone ? "text-success" : isOpen ? "text-ink-900" : "text-ink-400"
            }`}
          >
            {isDone ? "✓" : String(index + 1).padStart(2, "0")}
          </span>
          {STEP_LABELS[step]}
        </h2>

        {isDone ? (
          <Link
            href={href}
            className="flex min-h-11 shrink-0 items-center text-sm font-medium underline decoration-border underline-offset-4 hover:decoration-ink-900"
          >
            Change
            <span className="sr-only"> {STEP_LABELS[step].toLowerCase()}</span>
          </Link>
        ) : null}
      </div>

      {isDone ? (
        <p className="mt-1 pl-9 text-sm text-ink-600">{summary}</p>
      ) : null}

      {isOpen ? <div className="mt-5 sm:pl-9">{children}</div> : null}
    </section>
  );
}

export function stepIndex(step: CheckoutStep): number {
  return CHECKOUT_STEPS.indexOf(step);
}
