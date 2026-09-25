import { setQuantityAction, removeFromCartAction } from "@/lib/actions/cart";

/**
 * Plain forms posting to Server Actions, so this works without JavaScript.
 *
 * At quantity 1 the minus becomes a bin: decrementing and removing are one
 * gesture.
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
    <div className="inline-flex items-center rounded-md border border-ink-900">
      {quantity <= 1 ? (
        <form action={removeFromCartAction}>
          <input type="hidden" name="itemId" value={itemId} />
          <button
            type="submit"
            className="flex size-11 items-center justify-center text-ink-600 hover:bg-well hover:text-danger"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M3.5 5.5h13M8 5.5V3.75h4V5.5M5 5.5l.75 11h8.5l.75-11M8.5 8.5v5.5M11.5 8.5v5.5" />
            </svg>
            <span className="sr-only">Remove {title} from cart</span>
          </button>
        </form>
      ) : (
        <form action={setQuantityAction}>
          <input type="hidden" name="itemId" value={itemId} />
          <input type="hidden" name="quantity" value={quantity - 1} />
          <button
            type="submit"
            className="flex size-11 items-center justify-center text-lg leading-none hover:bg-well"
          >
            <span aria-hidden="true">−</span>
            <span className="sr-only">Decrease quantity of {title}</span>
          </button>
        </form>
      )}

      <span className="w-8 text-center font-mono text-sm">
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
          className="flex size-11 items-center justify-center text-lg leading-none hover:bg-well disabled:cursor-not-allowed disabled:opacity-30"
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
