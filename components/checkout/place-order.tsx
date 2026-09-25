"use client";

import { useActionState } from "react";
import { placeOrderAction, type PlaceOrderState } from "@/lib/actions/checkout";
import { formatPrice } from "@/lib/format";
import { buttonClass } from "@/components/ui/button";

const initial: PlaceOrderState = {};

/**
 * The only irreversible button in the app, so it says what it will do and how
 * much it will cost, and it disables itself while the transaction runs — a
 * double click must not try to place two orders.
 */
export function PlaceOrderButton({
  addressId,
  delivery,
  totalCents,
}: {
  addressId: string;
  delivery: string;
  totalCents: number;
}) {
  const [state, formAction, pending] = useActionState(placeOrderAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="address" value={addressId} />
      <input type="hidden" name="delivery" value={delivery} />

      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-danger px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={buttonClass({ className: "w-full" })}
      >
        {pending ? (
          "Placing order…"
        ) : (
          // One span, so the button's flex gap does not double the space.
          <span>
            Place order — <span className="font-mono">{formatPrice(totalCents)}</span>
          </span>
        )}
      </button>

      <p className="text-center text-xs text-ink-600">
        This is a demo. No payment is taken and nothing will be shipped.
      </p>
    </form>
  );
}
