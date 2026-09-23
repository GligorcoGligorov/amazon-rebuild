import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { currentCartOwner } from "@/lib/actions/cart";
import { getCart } from "@/lib/db/queries/cart";
import { getAddress, getAddresses } from "@/lib/db/queries/orders";
import { CheckoutStepPanel, stepIndex } from "@/components/checkout/accordion";
import { OrderSummary } from "@/components/checkout/order-summary";
import { AddressForm } from "@/components/checkout/address-form";
import { PlaceOrderButton } from "@/components/checkout/place-order";
import { formatPrice } from "@/lib/format";
import {
  DELIVERY_OPTIONS,
  DEMO_PAYMENT_LABEL,
  deliveryEta,
  formatAddress,
  isCheckoutStep,
  isDeliveryMethod,
  shippingCentsFor,
  totalsFor,
  type CheckoutStep,
  type DeliveryMethod,
} from "@/lib/checkout";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function CheckoutPage({ searchParams }: Props) {
  // The wall sits here and at /orders (D13).
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=%2Fcheckout");
  const userId = session.user.id;

  const params = await searchParams;
  const cart = await getCart(await currentCartOwner());

  if (cart.itemCount === 0) return <EmptyCheckout />;

  const [saved, address] = await Promise.all([
    getAddresses(userId),
    one(params.address) ? getAddress(userId, one(params.address)) : Promise.resolve(null),
  ]);

  const deliveryRaw = one(params.delivery);
  const delivery: DeliveryMethod | null = isDeliveryMethod(deliveryRaw)
    ? deliveryRaw
    : null;
  const paid = one(params.paid) === "1";

  // A step is only reachable once the steps before it are answered. Asking for
  // ?step=review with no address lands on address instead of a broken page.
  const furthest: CheckoutStep = !address
    ? "address"
    : !delivery
      ? "delivery"
      : !paid
        ? "payment"
        : "review";

  const requested = one(params.step);
  const current: CheckoutStep =
    isCheckoutStep(requested) && stepIndex(requested) <= stepIndex(furthest)
      ? requested
      : furthest;

  const totals = totalsFor(cart.subtotalCents, address, delivery);

  const hrefFor = (step: CheckoutStep) => {
    const q = new URLSearchParams({ step });
    if (address) q.set("address", address.id);
    if (delivery) q.set("delivery", delivery);
    if (paid) q.set("paid", "1");
    return `/checkout?${q.toString()}`;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        Secure checkout
      </h1>

      {/* Summary first on mobile — the same reasoning as the cart. */}
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_19rem]">
        <div className="lg:col-start-2 lg:row-start-1 lg:sticky lg:top-6 lg:self-start">
          <OrderSummary totals={totals} itemCount={cart.itemCount} />
        </div>

        <div className="flex flex-col gap-3 lg:col-start-1 lg:row-start-1">
          <CheckoutStepPanel
            step="address"
            index={0}
            current={current}
            reached
            href={hrefFor("address")}
            summary={address ? `${address.fullName}, ${formatAddress(address)}` : null}
          >
            {saved.length > 0 ? (
              <div className="mb-6">
                <h3 className="text-sm font-medium">Use a saved address</h3>
                <ul className="mt-2 flex flex-col gap-2">
                  {saved.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/checkout?step=delivery&address=${item.id}`}
                        className="block rounded-md border border-border p-3 text-sm hover:border-ink-400"
                      >
                        <span className="font-medium">{item.fullName}</span>
                        <span className="mt-0.5 block text-ink-600">
                          {formatAddress(item)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm font-medium">Or add a new one</p>
              </div>
            ) : null}
            <AddressForm />
          </CheckoutStepPanel>

          <CheckoutStepPanel
            step="delivery"
            index={1}
            current={current}
            reached={Boolean(address)}
            href={hrefFor("delivery")}
            summary={
              delivery
                ? `${DELIVERY_OPTIONS.find((o) => o.id === delivery)!.label} — arrives ${deliveryEta(delivery)}`
                : null
            }
          >
            <ul className="flex flex-col gap-2">
              {DELIVERY_OPTIONS.map((option) => {
                const cost = shippingCentsFor(option.id, cart.subtotalCents);
                const q = new URLSearchParams({ step: "payment", delivery: option.id });
                if (address) q.set("address", address.id);
                return (
                  <li key={option.id}>
                    <Link
                      href={`/checkout?${q.toString()}`}
                      className="flex items-start justify-between gap-4 rounded-md border border-border p-3 hover:border-ink-400"
                    >
                      <span>
                        <span className="block text-sm font-medium">
                          {option.label} — arrives {deliveryEta(option.id)}
                        </span>
                        <span className="block text-sm text-ink-600">
                          {option.description}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold">
                        {cost === 0 ? "Free" : formatPrice(cost)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CheckoutStepPanel>

          <CheckoutStepPanel
            step="payment"
            index={2}
            current={current}
            reached={Boolean(address && delivery)}
            href={hrefFor("payment")}
            summary={paid ? DEMO_PAYMENT_LABEL : null}
          >
            <PaymentStep
              href={(() => {
                const q = new URLSearchParams({ step: "review", paid: "1" });
                if (address) q.set("address", address.id);
                if (delivery) q.set("delivery", delivery);
                return `/checkout?${q.toString()}`;
              })()}
            />
          </CheckoutStepPanel>

          <CheckoutStepPanel
            step="review"
            index={3}
            current={current}
            reached={Boolean(address && delivery && paid)}
            href={hrefFor("review")}
          >
            <ul className="flex flex-col gap-3">
              {cart.lines.map((line) => (
                <li key={line.itemId} className="flex gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-surface-sunken">
                    <Image
                      src={line.product.image}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-contain p-1"
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium">{line.product.title}</p>
                    {line.optionSummary ? (
                      <p className="text-ink-600">{line.optionSummary}</p>
                    ) : null}
                    <p className="text-ink-600">Quantity {line.quantity}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">
                    {formatPrice(line.lineTotalCents)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-6">
              {address && delivery ? (
                <PlaceOrderButton
                  addressId={address.id}
                  delivery={delivery}
                  totalCents={totals.totalCents}
                />
              ) : null}
            </div>
          </CheckoutStepPanel>
        </div>
      </div>

      <p className="mt-6 text-sm">
        <Link href="/cart" className="text-link underline underline-offset-2">
          Back to cart
        </Link>
      </p>
    </div>
  );
}

function PaymentStep({ href }: { href: string }) {
  return (
    <div>
      {/* We never collect card details, not even fake ones (D31). */}
      <div className="rounded-md border-2 border-ink-900 p-3">
        <p className="text-sm font-medium">{DEMO_PAYMENT_LABEL}</p>
        <p className="mt-0.5 text-sm text-ink-600">
          The only method in this demo. No card is charged.
        </p>
      </div>

      {/* Shown, not hidden, with its reason attached — the pattern Amazon uses
          for an ineligible payment plan. */}
      <div className="mt-2 rounded-md border border-dashed border-border p-3 opacity-60">
        <p className="text-sm font-medium text-ink-400">Pay in instalments</p>
        <p className="mt-0.5 text-sm text-ink-400">
          Not available — this demo does not process real payments.
        </p>
      </div>

      <Link
        href={href}
        className="mt-4 inline-block rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-ink hover:bg-accent-hover"
      >
        Use this payment method
      </Link>
    </div>
  );
}

function EmptyCheckout() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Secure checkout</h1>
      <p className="mt-2 text-ink-600">
        There is nothing to check out — your cart is empty.
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
