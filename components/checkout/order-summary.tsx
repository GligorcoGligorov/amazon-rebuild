import { formatPrice } from "@/lib/format";
import { TAX_RATE, type OrderTotals } from "@/lib/checkout";

/**
 * D11: shipping and tax read `--` until they can actually be known. Amazon does
 * the same and it is the honest answer — a destination decides both, so a
 * number before that is a guess that will change.
 */
export function OrderSummary({
  totals,
  itemCount,
  heading = "Order summary",
}: {
  totals: OrderTotals;
  itemCount: number;
  heading?: string;
}) {
  // The two unknowns resolve at different moments: tax needs a destination,
  // carriage needs a speed. Saying "shipping and tax" after tax is already
  // shown would be stale copy contradicting the number beside it.
  const needsAddress = totals.taxCents === null;
  const needsSpeed = totals.shippingCents === null;

  return (
    <section
      aria-labelledby="order-summary-heading"
      className="rounded-lg border border-border bg-surface-sunken p-4"
    >
      <h2 id="order-summary-heading" className="text-sm font-semibold">
        {heading}
      </h2>

      <dl className="mt-3 flex flex-col gap-1.5 text-sm">
        <Row
          label={`Items (${itemCount})`}
          value={formatPrice(totals.subtotalCents)}
        />
        <Row
          label="Shipping & handling"
          value={
            totals.shippingCents === null
              ? null
              : totals.shippingCents === 0
                ? "Free"
                : formatPrice(totals.shippingCents)
          }
        />
        <Row
          label={`Estimated tax (${Math.round(TAX_RATE * 100)}%)`}
          value={totals.taxCents === null ? null : formatPrice(totals.taxCents)}
        />

        <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-border pt-3">
          <dt className="font-semibold">Order total</dt>
          <dd className="text-xl font-bold">{formatPrice(totals.totalCents)}</dd>
        </div>
      </dl>

      {needsAddress ? (
        <p className="mt-2 text-xs text-ink-400">
          Shipping and tax are calculated once you enter a delivery address.
        </p>
      ) : needsSpeed ? (
        <p className="mt-2 text-xs text-ink-400">
          Shipping is calculated once you choose a delivery speed.
        </p>
      ) : (
        <p className="mt-2 text-xs text-ink-400">
          Flat-rate delivery and a flat {Math.round(TAX_RATE * 100)}% tax — this is
          a demo, not a real rate engine.
        </p>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-600">{label}</dt>
      <dd className={value === null ? "text-ink-400" : undefined}>
        {value ?? (
          <>
            <span aria-hidden="true">--</span>
            <span className="sr-only">not known yet</span>
          </>
        )}
      </dd>
    </div>
  );
}
