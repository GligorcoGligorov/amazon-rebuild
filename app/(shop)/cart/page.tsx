import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { currentCartOwner, removeFromCartAction } from "@/lib/actions/cart";
import { getCart } from "@/lib/db/queries/cart";
import { QuantityStepper } from "@/components/quantity-stepper";
import { buttonClass } from "@/components/ui/button";
import { CatalogueNo } from "@/components/ui/catalogue-no";
import { Price } from "@/components/ui/price";
import { Receipt, ReceiptLine } from "@/components/ui/receipt";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Cart" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cart = await getCart(await currentCartOwner());
  const itemsLabel = `${cart.itemCount} ${cart.itemCount === 1 ? "item" : "items"}`;

  if (cart.itemCount === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-14">
        <p className="eyebrow">Cart · 0 items</p>
        <h1 className="mt-2 font-display text-5xl leading-none sm:text-6xl">Your cart</h1>
        <div className="mt-8 max-w-md border-t border-ink-900 pt-6">
          <p className="text-ink-600">
            Your cart is empty. Nothing has been added yet.
          </p>
          <Link href="/" className={buttonClass({ variant: "ink", className: "mt-6" })}>
            Browse categories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-10">
      <p className="eyebrow">Cart · {itemsLabel}</p>
      <h1 className="mt-2 font-display text-5xl leading-none sm:text-6xl">Your cart</h1>

      {/*
        Mobile DOM order is deliberate: the summary and the checkout button come
        before the line items, so everything needed to decide is in the first
        viewport. On desktop the summary moves beside the items.
      */}
      <div className="mt-6 grid grid-cols-1 gap-8 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
        <section
          aria-labelledby="summary-heading"
          className="lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:self-start"
        >
          <h2 id="summary-heading" className="sr-only">
            Order summary
          </h2>
          {/* The summary is the receipt (D36). Shipping and tax read `--`
              until checkout knows the address (D11). */}
          <Receipt className="lg:border-x lg:border-b lg:border-border">
            <div className="space-y-2">
              <ReceiptLine label={`Subtotal (${itemsLabel})`} value={formatPrice(cart.subtotalCents)} strong />
              <ReceiptLine label="Shipping" value="--" />
              <ReceiptLine label="Tax" value="--" note="Delivery and tax are calculated at checkout." />
            </div>
            <div className="mt-5 grid gap-2">
              <Link href="/checkout" className={buttonClass()}>
                Proceed to checkout
              </Link>
              <Link
                href="/"
                className={buttonClass({ variant: "quiet", className: "min-h-11 justify-self-center text-sm" })}
              >
                Keep shopping
              </Link>
            </div>
          </Receipt>
        </section>

        <section aria-labelledby="items-heading" className="lg:col-start-1 lg:row-start-1">
          <h2 id="items-heading" className="sr-only">
            Items in your cart
          </h2>
          <ul className="border-t border-ink-900">
            {cart.lines.map((line) => (
              <li key={line.itemId} className="flex gap-4 border-b border-border py-5">
                <Link
                  href={`/product/${line.product.slug}`}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="relative size-24 shrink-0 bg-well sm:size-28"
                >
                  <Image
                    src={line.product.image}
                    alt=""
                    fill
                    sizes="112px"
                    className="object-contain p-2"
                  />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CatalogueNo slug={line.product.slug} />
                      <h3 className="text-[0.9375rem] leading-snug font-medium">
                        <Link href={`/product/${line.product.slug}`} className="hover:underline hover:underline-offset-4">
                          {line.product.title}
                        </Link>
                      </h3>
                      {/* What was actually chosen, spelled out — not left implicit. */}
                      {line.optionSummary ? (
                        <p className="mt-0.5 text-sm text-ink-600">{line.optionSummary}</p>
                      ) : null}
                    </div>

                    <div className="shrink-0 text-right">
                      <Price cents={line.lineTotalCents} className="text-[0.9375rem]" />
                      {line.quantity > 1 ? (
                        <p className="mt-0.5 font-mono text-xs text-ink-400">
                          {formatPrice(line.priceCents)} each
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {line.quantity >= line.stock ? (
                    <p className="mt-1 text-xs text-accent-hover">Only {line.stock} in stock</p>
                  ) : null}

                  <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-3">
                    <QuantityStepper
                      itemId={line.itemId}
                      quantity={line.quantity}
                      stock={line.stock}
                      title={line.product.title}
                    />
                    {/* At quantity 1 the stepper's bin already removes the
                        line, so a second control would do the same job. Above
                        1 the minus only decrements, so Remove earns its place. */}
                    {line.quantity > 1 ? (
                      <form action={removeFromCartAction}>
                        <input type="hidden" name="itemId" value={line.itemId} />
                        <button
                          type="submit"
                          className="min-h-11 text-sm text-ink-600 underline decoration-border underline-offset-4 hover:text-ink-900 hover:decoration-ink-900"
                        >
                          Remove
                          <span className="sr-only"> {line.product.title}</span>
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
