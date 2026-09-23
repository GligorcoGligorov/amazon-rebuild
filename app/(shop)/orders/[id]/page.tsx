import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getOrder } from "@/lib/db/queries/orders";
import { formatPrice } from "@/lib/format";
import { DELIVERY_OPTIONS } from "@/lib/checkout";

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
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      {justPlaced ? (
        <div className="mb-6 rounded-lg border border-success/40 bg-success/5 p-5">
          <h1 className="text-xl font-semibold text-success sm:text-2xl">
            <span aria-hidden="true">✓</span> Order placed
          </h1>
          <p className="mt-1 text-sm text-ink-600">
            Thanks. Your order is <span className="font-mono">{order.number}</span> and
            arrives {order.deliveryEta}. Nothing will actually be shipped — this is a
            demo.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/orders"
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:bg-accent-hover"
            >
              All your orders
            </Link>
            <Link
              href="/"
              className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:border-ink-400"
            >
              Keep shopping
            </Link>
          </div>
        </div>
      ) : (
        <>
          <nav aria-label="Breadcrumb" className="text-sm text-ink-600">
            <Link href="/account" className="hover:underline">
              Your account
            </Link>
            <span aria-hidden="true"> › </span>
            <Link href="/orders" className="hover:underline">
              Your orders
            </Link>
            <span aria-hidden="true"> › </span>
            <span aria-current="page" className="font-medium text-ink-900">
              {order.number}
            </span>
          </nav>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Order <span className="font-mono">{order.number}</span>
          </h1>
        </>
      )}

      <dl className="mt-6 grid grid-cols-1 gap-4 rounded-lg border border-border p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-400">
            Delivering to
          </dt>
          <dd className="mt-1">
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
          <dt className="text-xs uppercase tracking-wide text-ink-400">Delivery</dt>
          <dd className="mt-1">
            <span className="block font-medium">{delivery?.label ?? order.deliveryMethod}</span>
            <span className="block text-ink-600">Arrives {order.deliveryEta}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-400">Payment</dt>
          <dd className="mt-1 text-ink-600">{order.paymentLabel}</dd>
        </div>
      </dl>

      <h2 className="mt-8 text-base font-semibold">
        {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
      </h2>
      <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-3 p-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-surface-sunken">
              <Image
                src={item.imageUrl}
                alt=""
                fill
                sizes="64px"
                className="object-contain p-1"
              />
            </div>
            <div className="min-w-0 flex-1 text-sm">
              {/* The snapshot is what was bought; the link is a convenience and
                  may 404 if the catalog has moved on. */}
              <Link
                href={`/product/${item.productSlug}`}
                className="font-medium hover:underline"
              >
                {item.productTitle}
              </Link>
              {item.variantName ? (
                <p className="text-ink-600">{item.variantName}</p>
              ) : null}
              <p className="text-ink-600">
                {formatPrice(item.unitPriceCents)} × {item.quantity}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold">
              {formatPrice(item.lineTotalCents)}
            </p>
          </li>
        ))}
      </ul>

      <dl className="mt-6 ml-auto flex max-w-xs flex-col gap-1.5 text-sm">
        <Row label="Items" value={formatPrice(order.subtotalCents)} />
        <Row
          label="Shipping & handling"
          value={order.shippingCents === 0 ? "Free" : formatPrice(order.shippingCents)}
        />
        <Row label="Tax" value={formatPrice(order.taxCents)} />
        <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-border pt-2">
          <dt className="font-semibold">Order total</dt>
          <dd className="text-lg font-bold">{formatPrice(order.totalCents)}</dd>
        </div>
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-600">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
