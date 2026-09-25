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
import { buttonClass } from "@/components/ui/button";
import { CatalogueNo } from "@/components/ui/catalogue-no";
import { Price } from "@/components/ui/price";
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
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10">
      <p className="eyebrow">
        Step {stepIndex(current) + 1} of 4 · {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}
      </p>
      <h1 className="mt-2 font-display text-5xl leading-none sm:text-6xl">Secure checkout</h1>

      {/* Summary first on mobile — the same reasoning as the cart. */}
      <div className="mt-6 grid grid-cols-1 gap-8 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
        <div className="lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1 lg:self-start">
          <OrderSummary totals={totals} itemCount={cart.itemCount} />
        </div>

        <div className="flex flex-col border-b border-border lg:col-start-1 lg:row-start-1">
          <CheckoutStepPanel
            step="address"
            index={0}
            current={current}
            reached
            href={hrefFor("address")}
            summary={address ? `${address.fullName}, ${formatAddress(address)}` : null}
          >
            {saved.length > 0 ? (
              <div className="mb-8">
                <h3 className="eyebrow">Use a saved address</h3>
                <ul className="mt-3 flex flex-col gap-2">
                  {saved.map((item) => (
                    <li key={item.id}>
                      <ChoiceRow href={`/checkout?step=delivery&address=${item.id}`}>
                        <span className="block text-sm font-medium">{item.fullName}</span>
                        <span className="mt-0.5 block text-sm text-ink-600">
                          {formatAddress(item)}
                        </span>
                      </ChoiceRow>
                    </li>
                  ))}
                </ul>
                <p className="eyebrow mt-8">Or add a new one</p>
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
                    <ChoiceRow
                      href={`/checkout?${q.toString()}`}
                      aside={cost === 0 ? "Free" : formatPrice(cost)}
                    >
                      <span className="block text-sm font-medium">
                        {option.label} — arrives {deliveryEta(option.id)}
                      </span>
                      <span className="mt-0.5 block text-sm text-ink-600">
                        {option.description}
                      </span>
                    </ChoiceRow>
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
                <li key={line.itemId} className="flex gap-4">
                  <div className="relative size-16 shrink-0 bg-well">
                    <Image
                      src={line.product.image}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-contain p-1.5"
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <CatalogueNo slug={line.product.slug} />
                    <p className="font-medium">{line.product.title}</p>
                    {line.optionSummary ? (
                      <p className="text-ink-600">{line.optionSummary}</p>
                    ) : null}
                    <p className="text-ink-600">
                      Quantity <span className="font-mono">{line.quantity}</span>
                    </p>
                  </div>
                  <Price cents={line.lineTotalCents} className="shrink-0 text-sm" />
                </li>
              ))}
            </ul>

            <div className="mt-6 border-t border-dashed border-rule-strong pt-6">
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

      <p className="mt-4">
        <Link
          href="/cart"
          className={buttonClass({ variant: "quiet", className: "min-h-11 text-sm" })}
        >
          <span aria-hidden="true">←</span> Back to cart
        </Link>
      </p>
    </div>
  );
}

/**
 * One selectable row — a saved address, a delivery speed. Each is a link to
 * the next step's URL, so choosing is navigating and the back button undoes
 * it (D11). The empty ring says "pick one" without a form.
 */
function ChoiceRow({
  href,
  aside,
  children,
}: {
  href: string;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-md border border-rule-strong bg-surface p-4 hover:border-ink-900"
    >
      <span
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 rounded-full border border-ink-400 group-hover:border-[5px] group-hover:border-ink-900"
      />
      <span className="min-w-0 flex-1">{children}</span>
      {aside ? <span className="shrink-0 font-mono text-sm">{aside}</span> : null}
    </Link>
  );
}

function PaymentStep({ href }: { href: string }) {
  return (
    <div>
      {/* We never collect card details, not even fake ones (D31). */}
      <div className="flex items-start gap-3 rounded-md border border-ink-900 bg-surface p-4">
        <span aria-hidden="true" className="mt-0.5 size-4 shrink-0 rounded-full border-[5px] border-ink-900" />
        <span>
          <span className="block text-sm font-medium">{DEMO_PAYMENT_LABEL}</span>
          <span className="mt-0.5 block text-sm text-ink-600">
            The only method in this demo. No card is charged.
          </span>
        </span>
      </div>

      {/* Shown, not hidden, with its reason attached. */}
      <div className="mt-2 flex items-start gap-3 rounded-md border border-dashed border-rule-strong p-4">
        <span aria-hidden="true" className="mt-0.5 size-4 shrink-0 rounded-full border border-dashed border-ink-400" />
        <span>
          <span className="block text-sm font-medium text-ink-400 line-through">Pay in instalments</span>
          <span className="mt-0.5 block text-sm text-ink-400">
            Not available — this demo does not process real payments.
          </span>
        </span>
      </div>

      <Link href={href} className={buttonClass({ className: "mt-5 w-full sm:w-auto" })}>
        Use this payment method
      </Link>
    </div>
  );
}

function EmptyCheckout() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-14">
      <p className="eyebrow">Checkout</p>
      <h1 className="mt-2 font-display text-5xl leading-none sm:text-6xl">Secure checkout</h1>
      <div className="mt-8 max-w-md border-t border-ink-900 pt-6">
        <p className="text-ink-600">There is nothing to check out — your cart is empty.</p>
        <Link href="/" className={buttonClass({ variant: "ink", className: "mt-6" })}>
          Browse categories
        </Link>
      </div>
    </div>
  );
}
