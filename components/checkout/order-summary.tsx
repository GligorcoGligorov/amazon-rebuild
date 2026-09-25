import { formatPrice } from "@/lib/format";
import { TAX_RATE, type OrderTotals } from "@/lib/checkout";
import { Receipt, ReceiptLine } from "@/components/ui/receipt";

/**
 * D11: shipping and tax read `--` until they can actually be known — a
 * destination decides both, so a number before that is a guess that will
 * change. Set as the receipt (D36), where `--` sits on a leader like a line
 * still to be filled in.
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
    <section aria-labelledby="order-summary-heading">
      <Receipt className="lg:border-x lg:border-b lg:border-border">
        <h2 id="order-summary-heading" className="eyebrow text-ink-900">
          {heading}
        </h2>

        <div className="mt-4 space-y-2">
          <ReceiptLine label={`Items (${itemCount})`} value={formatPrice(totals.subtotalCents)} />
          <ReceiptLine
            label="Shipping & handling"
            value={
              totals.shippingCents === null
                ? unknown
                : totals.shippingCents === 0
                  ? "Free"
                  : formatPrice(totals.shippingCents)
            }
          />
          <ReceiptLine
            label={`Estimated tax (${Math.round(TAX_RATE * 100)}%)`}
            value={totals.taxCents === null ? unknown : formatPrice(totals.taxCents)}
          />
        </div>

        <div className="mt-4 border-t border-dashed border-rule-strong pt-4">
          <ReceiptLine label="Order total" value={formatPrice(totals.totalCents)} strong />
        </div>

        <p className="mt-3 text-xs text-ink-600">
          {needsAddress
            ? "Shipping and tax are calculated once you enter a delivery address."
            : needsSpeed
              ? "Shipping is calculated once you choose a delivery speed."
              : `Flat-rate delivery and a flat ${Math.round(TAX_RATE * 100)}% tax — this is a demo, not a real rate engine.`}
        </p>
      </Receipt>
    </section>
  );
}

const unknown = (
  <>
    <span aria-hidden="true">--</span>
    <span className="sr-only">not known yet</span>
  </>
);
