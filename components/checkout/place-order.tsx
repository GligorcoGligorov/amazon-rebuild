"use client";

import { useActionState } from "react";
import { placeOrderAction, type PlaceOrderState } from "@/lib/actions/checkout";
import { formatPrice } from "@/lib/format";

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
          className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-ink hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Placing order…" : `Place order — ${formatPrice(totalCents)}`}
      </button>

      <p className="text-xs text-ink-400">
        This is a demo. No payment is taken and nothing will be shipped.
      </p>
    </form>
  );
}
