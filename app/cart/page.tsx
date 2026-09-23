import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { currentCartOwner, removeFromCartAction } from "@/lib/actions/cart";
import { getCart } from "@/lib/db/queries/cart";
import { QuantityStepper } from "@/components/quantity-stepper";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Cart" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cart = await getCart(await currentCartOwner());

  if (cart.itemCount === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your cart</h1>
        <p className="mt-2 text-ink-600">
          Your cart is empty. Nothing has been added yet.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:bg-accent-hover"
        >
          Browse categories
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your cart</h1>

      {/*
        Mobile DOM order is deliberate: the summary and the checkout button come
        before the line items, so everything needed to decide is in the first
        viewport. Amazon's mobile cart does this and their desktop one does not;
        on desktop the summary moves beside the items (D6 in FINDINGS).
      */}
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
        <section
          aria-labelledby="summary-heading"
          className="lg:col-start-2 lg:row-start-1 lg:sticky lg:top-24 lg:self-start"
        >
          <h2 id="summary-heading" className="sr-only">
            Order summary
          </h2>
          <div className="rounded-lg border border-border bg-surface-sunken p-4">
            <p className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-ink-600">
                Subtotal ({cart.itemCount} {cart.itemCount === 1 ? "item" : "items"})
              </span>
              <span className="text-xl font-bold">
                {formatPrice(cart.subtotalCents)}
              </span>
            </p>
            <p className="mt-1 text-xs text-ink-400">
              Delivery and tax are calculated at checkout.
            </p>
            <Link
              href="/checkout"
              className="mt-4 block rounded-md bg-accent px-4 py-3 text-center text-sm font-semibold text-accent-ink hover:bg-accent-hover"
            >
              Proceed to checkout
            </Link>
            <Link
              href="/"
              className="mt-2 block px-4 py-2 text-center text-sm text-link underline underline-offset-2"
            >
              Keep shopping
            </Link>
          </div>
        </section>

        <section aria-labelledby="items-heading" className="lg:col-start-1 lg:row-start-1">
          <h2 id="items-heading" className="sr-only">
            Items in your cart
          </h2>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {cart.lines.map((line) => (
              <li key={line.itemId} className="flex gap-3 p-4 sm:gap-4">
                <Link
                  href={`/product/${line.product.slug}`}
                  className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-surface-sunken sm:h-24 sm:w-24"
                >
                  <Image
                    src={line.product.image}
                    alt=""
                    fill
                    sizes="96px"
                    className="object-contain p-1"
                  />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h3 className="text-sm font-medium leading-snug">
                    <Link href={`/product/${line.product.slug}`} className="hover:underline">
                      {line.product.title}
                    </Link>
                  </h3>

                  {/* What was actually chosen, spelled out — not left implicit. */}
                  {line.optionSummary ? (
                    <p className="text-sm text-ink-600">{line.optionSummary}</p>
                  ) : null}

                  {line.quantity >= line.stock ? (
                    <p className="text-xs text-ink-400">
                      Only {line.stock} in stock
                    </p>
                  ) : null}

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <QuantityStepper
                      itemId={line.itemId}
                      quantity={line.quantity}
                      stock={line.stock}
                      title={line.product.title}
                    />
                    {/* At quantity 1 the stepper's trash icon already removes
                        the line, so a second control would do the same job.
                        Above 1 the minus only decrements, so Remove earns its
                        place. */}
                    {line.quantity > 1 ? (
                      <form action={removeFromCartAction}>
                        <input type="hidden" name="itemId" value={line.itemId} />
                        <button
                          type="submit"
                          className="text-sm text-link underline underline-offset-2"
                        >
                          Remove
                          <span className="sr-only"> {line.product.title}</span>
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold">
                    {formatPrice(line.lineTotalCents)}
                  </p>
                  {line.quantity > 1 ? (
                    <p className="mt-0.5 text-xs text-ink-400">
                      {formatPrice(line.priceCents)} each
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
