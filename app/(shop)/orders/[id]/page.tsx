import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getOrder } from "@/lib/db/queries/orders";
import { formatPrice } from "@/lib/format";
import { DELIVERY_OPTIONS } from "@/lib/checkout";
import { AccountBreadcrumb } from "@/components/account-breadcrumb";
import { buttonClass } from "@/components/ui/button";
import { CatalogueNo } from "@/components/ui/catalogue-no";
import { PageTitle } from "@/components/ui/page-title";
import { Price } from "@/components/ui/price";
import { Receipt, ReceiptLine } from "@/components/ui/receipt";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return { title: "Order" };
  const order = await getOrder(session.user.id, id);
  return { title: order ? `Order ${order.number}` : "Order" };
}

/**
 * Doubles as the confirmation page: `?placed=1` adds the thank-you banner.
 * One page rather than two means the link in the address bar keeps working
 * after a reload, which a dedicated /confirmation route would not.
 */
export default async function OrderPage({ params, searchParams }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(`/orders/${id}`)}`);
  }

  const order = await getOrder(session.user.id, id);
  if (!order) notFound();

  const justPlaced = (await searchParams).placed === "1";
  const delivery = DELIVERY_OPTIONS.find((o) => o.id === order.deliveryMethod);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 sm:pt-10">
      {justPlaced ? (
        <div>
          <p className="eyebrow flex items-center gap-2 text-success">
            <span aria-hidden="true" className="size-2 rounded-full bg-success" />
            Confirmed
          </p>
          <h1 className="mt-2 font-display text-5xl leading-none sm:text-6xl">
            Order <em>placed</em>
          </h1>
          <p className="mt-4 max-w-xl text-ink-600">
            Thanks. Your order is <span className="font-mono text-ink-900">{order.number}</span>{" "}
            and arrives {order.deliveryEta}. Nothing will actually be shipped — this
            is a demo.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/orders" className={buttonClass({ variant: "ink" })}>
              All your orders
            </Link>
            <Link href="/" className={buttonClass({ variant: "secondary" })}>
              Keep shopping
            </Link>
          </div>
        </div>
      ) : (
        <>
          <AccountBreadcrumb viaOrders here={<span className="font-mono">{order.number}</span>} />
          <PageTitle className="mt-6" eyebrow="Order">
            <span className="font-mono text-4xl tracking-tight sm:text-5xl">{order.number}</span>
          </PageTitle>
        </>
      )}

      <dl className="mt-10 grid grid-cols-1 gap-6 border-y border-ink-900 py-6 text-sm sm:grid-cols-3">
        <div>
          <dt className="eyebrow">Delivering to</dt>
          <dd className="mt-1.5">
            <span className="block font-medium">{order.shippingName}</span>
            <span className="block text-ink-600">{order.shippingLine1}</span>
            {order.shippingLine2 ? (
              <span className="block text-ink-600">{order.shippingLine2}</span>
            ) : null}
            <span className="block text-ink-600">
              {order.shippingCity}, {order.shippingRegion} {order.shippingPostalCode}
            </span>
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Delivery</dt>
          <dd className="mt-1.5">
            <span className="block font-medium">{delivery?.label ?? order.deliveryMethod}</span>
            <span className="block text-ink-600">Arrives {order.deliveryEta}</span>
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Payment</dt>
          <dd className="mt-1.5 text-ink-600">{order.paymentLabel}</dd>
        </div>
      </dl>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <section aria-labelledby="items-heading">
          <h2 id="items-heading" className="eyebrow border-b border-ink-900 pb-3">
            {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
          </h2>
          <ul>
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-4 border-b border-border py-4">
                <div className="relative size-16 shrink-0 bg-well">
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-contain p-1.5"
                  />
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <CatalogueNo slug={item.productSlug} />
                  {/* The snapshot is what was bought; the link is a convenience
                      and may 404 if the catalog has moved on. */}
                  <Link
                    href={`/product/${item.productSlug}`}
                    className="block font-medium hover:underline hover:underline-offset-4"
                  >
                    {item.productTitle}
                  </Link>
                  {item.variantName ? (
                    <p className="text-ink-600">{item.variantName}</p>
                  ) : null}
                  <p className="font-mono text-xs text-ink-600">
                    {formatPrice(item.unitPriceCents)} × {item.quantity}
                  </p>
                </div>
                <Price cents={item.lineTotalCents} className="shrink-0 text-sm" />
              </li>
            ))}
          </ul>
        </section>

        {/* What was paid, as the receipt it is (D36). */}
        <section aria-labelledby="totals-heading" className="lg:self-start">
          <Receipt className="border-x border-b border-border">
            <h2 id="totals-heading" className="eyebrow text-ink-900">
              Receipt
            </h2>
            <div className="mt-4 space-y-2">
              <ReceiptLine label="Items" value={formatPrice(order.subtotalCents)} />
              <ReceiptLine
                label="Shipping & handling"
                value={order.shippingCents === 0 ? "Free" : formatPrice(order.shippingCents)}
              />
              <ReceiptLine label="Tax" value={formatPrice(order.taxCents)} />
            </div>
            <div className="mt-4 border-t border-dashed border-rule-strong pt-4">
              <ReceiptLine label="Order total" value={formatPrice(order.totalCents)} strong />
            </div>
            <p className="eyebrow mt-4 flex justify-between border-t border-dashed border-rule-strong pt-3">
              <span>Almanac</span>
              <time dateTime={order.placedAt.toISOString()}>
                {order.placedAt
                  .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                  .replace("Sept", "Sep")}
              </time>
            </p>
          </Receipt>
        </section>
      </div>
    </div>
  );
}
