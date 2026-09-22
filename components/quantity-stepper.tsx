import { setQuantityAction, removeFromCartAction } from "@/lib/actions/cart";

/**
 * Plain forms posting to Server Actions, so this works without JavaScript.
 *
 * At quantity 1 the minus becomes a trash icon: decrementing and removing are
 * one gesture, which is the detail Amazon's cart gets right.
 */
export function QuantityStepper({
  itemId,
  quantity,
  stock,
  title,
}: {
  itemId: string;
  quantity: number;
  stock: number;
  title: string;
}) {
  const atMax = quantity >= stock;

  return (
    <div className="inline-flex items-center rounded-md border-2 border-accent">
      {quantity <= 1 ? (
        <form action={removeFromCartAction}>
          <input type="hidden" name="itemId" value={itemId} />
          <button
            type="submit"
            className="flex h-9 w-9 items-center justify-center rounded-l-sm text-ink-600 hover:bg-surface-sunken"
          >
            <span aria-hidden="true">🗑</span>
            <span className="sr-only">Remove {title} from cart</span>
          </button>
        </form>
      ) : (
        <form action={setQuantityAction}>
          <input type="hidden" name="itemId" value={itemId} />
          <input type="hidden" name="quantity" value={quantity - 1} />
          <button
            type="submit"
            className="flex h-9 w-9 items-center justify-center rounded-l-sm text-lg leading-none hover:bg-surface-sunken"
          >
            <span aria-hidden="true">−</span>
            <span className="sr-only">Decrease quantity of {title}</span>
          </button>
        </form>
      )}

      <span className="w-9 text-center text-sm font-semibold tabular-nums">
        {quantity}
        <span className="sr-only"> in cart</span>
      </span>

      <form action={setQuantityAction}>
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="quantity" value={quantity + 1} />
        <button
          type="submit"
          disabled={atMax}
          title={atMax ? `Only ${stock} in stock` : undefined}
          className="flex h-9 w-9 items-center justify-center rounded-r-sm text-lg leading-none hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span aria-hidden="true">+</span>
          <span className="sr-only">
            Increase quantity of {title}
            {atMax ? ` — only ${stock} in stock` : ""}
          </span>
        </button>
      </form>
    </div>
  );
}
