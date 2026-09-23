import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getOrders } from "@/lib/db/queries/orders";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Your orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=%2Forders");

  const orders = await getOrders(session.user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-600">
        <Link href="/account" className="hover:underline">
          Your account
        </Link>
        <span aria-hidden="true"> › </span>
        <span aria-current="page" className="font-medium text-ink-900">
          Your orders
        </span>
      </nav>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Your orders</h1>
      <p className="mt-1 text-sm text-ink-600">
        {orders.length} {orders.length === 1 ? "order" : "orders"}
      </p>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-lg border border-border bg-surface-sunken p-8 text-center">
          <p className="font-medium">You have not placed any orders yet.</p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:bg-accent-hover"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {orders.map((order) => (
            <li key={order.id} className="rounded-lg border border-border">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border bg-surface-sunken px-4 py-3 text-sm">
                <span>
                  <span className="block text-xs uppercase tracking-wide text-ink-400">
                    Order placed
                  </span>
                  <time dateTime={order.placedAt.toISOString()}>
                    {order.placedAt.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                </span>
                <span>
                  <span className="block text-xs uppercase tracking-wide text-ink-400">
                    Total
                  </span>
                  <span className="font-semibold">{formatPrice(order.totalCents)}</span>
                </span>
                <span>
                  <span className="block text-xs uppercase tracking-wide text-ink-400">
                    Order
                  </span>
                  <span className="font-mono">{order.number}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-start gap-4 p-4">
                <ul className="flex flex-wrap gap-2">
                  {order.items.slice(0, 4).map((item) => (
                    <li
                      key={item.id}
                      className="relative h-16 w-16 overflow-hidden rounded-md border border-border bg-surface-sunken"
                    >
                      <Image
                        src={item.imageUrl}
                        alt={item.productTitle}
                        fill
                        sizes="64px"
                        className="object-contain p-1"
                      />
                    </li>
                  ))}
                  {order.items.length > 4 ? (
                    <li className="flex h-16 w-16 items-center justify-center rounded-md border border-border text-xs text-ink-600">
                      +{order.items.length - 4}
                    </li>
                  ) : null}
                </ul>

                <div className="ml-auto">
                  <Link
                    href={`/orders/${order.id}`}
                    className="inline-block rounded-md border border-border px-4 py-2 text-sm font-semibold hover:border-ink-400"
                  >
                    View order
                    <span className="sr-only"> {order.number}</span>
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
