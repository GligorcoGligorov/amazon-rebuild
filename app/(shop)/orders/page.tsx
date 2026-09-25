import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getOrders } from "@/lib/db/queries/orders";
import { formatPrice } from "@/lib/format";
import { AccountBreadcrumb } from "@/components/account-breadcrumb";
import { buttonClass } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";

export const metadata: Metadata = { title: "Your orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=%2Forders");

  const orders = await getOrders(session.user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 sm:pt-10">
      <AccountBreadcrumb here="Your orders" />

      <PageTitle className="mt-6" eyebrow="Order history">
        Your orders
      </PageTitle>
      <p className="mt-3 font-mono text-sm text-ink-600">
        {orders.length} {orders.length === 1 ? "order" : "orders"}
      </p>

      {orders.length === 0 ? (
        <div className="mt-8 border-t border-ink-900 pt-6">
          <p className="text-ink-600">You have not placed any orders yet.</p>
          <Link href="/" className={buttonClass({ variant: "ink", className: "mt-6" })}>
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="mt-8 border-t border-ink-900">
          {orders.map((order) => (
            <li key={order.id} className="border-b border-border py-6">
              {/* The order's header reads like the top of a receipt. */}
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <div>
                  <dt className="eyebrow">Order placed</dt>
                  <dd className="mt-0.5 text-sm">
                    <time dateTime={order.placedAt.toISOString()}>
                      {order.placedAt.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow">Total</dt>
                  <dd className="mt-0.5 font-mono text-sm">{formatPrice(order.totalCents)}</dd>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <dt className="eyebrow">Order</dt>
                  <dd className="mt-0.5 font-mono text-sm">{order.number}</dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                <ul className="flex flex-wrap gap-2">
                  {order.items.slice(0, 4).map((item) => (
                    <li key={item.id} className="relative size-16 bg-well">
                      <Image
                        src={item.imageUrl}
                        alt={item.productTitle}
                        fill
                        sizes="64px"
                        className="object-contain p-1.5"
                      />
                    </li>
                  ))}
                  {order.items.length > 4 ? (
                    <li className="flex size-16 items-center justify-center border border-border font-mono text-xs text-ink-600">
                      +{order.items.length - 4}
                    </li>
                  ) : null}
                </ul>

                <Link
                  href={`/orders/${order.id}`}
                  className={buttonClass({ variant: "secondary", size: "sm" })}
                >
                  View order
                  <span className="sr-only"> {order.number}</span>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
