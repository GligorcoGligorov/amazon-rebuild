import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth";
import { getAddresses, getOrders } from "@/lib/db/queries/orders";
import { buttonClass } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";

export const metadata: Metadata = { title: "Your account" };
export const dynamic = "force-dynamic";

/**
 * Three things: orders, addresses, sign out (D12). Set as a short index, the
 * same shape as the home page's departments, with a count on each.
 */
export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=%2Faccount");

  const [orders, addresses] = await Promise.all([
    getOrders(session.user.id),
    getAddresses(session.user.id),
  ]);

  const rows = [
    {
      href: "/orders",
      title: "Your orders",
      body: "Track and review what you have ordered",
      count: orders.length,
      unit: orders.length === 1 ? "order" : "orders",
    },
    {
      href: "/account/addresses",
      title: "Your addresses",
      body: "Where your orders are delivered",
      count: addresses.length,
      unit: addresses.length === 1 ? "address" : "addresses",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 sm:pt-14">
      <PageTitle eyebrow={<>Signed in as <span className="normal-case">{session.user.email}</span></>}>
        Your account
      </PageTitle>

      <ul className="mt-8 border-t border-ink-900">
        {rows.map((row, i) => (
          <li key={row.href} className="border-b border-border">
            <Link href={row.href} className="group flex items-center gap-4 py-5">
              <span aria-hidden="true" className="w-5 shrink-0 font-mono text-xs text-ink-400">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-2xl leading-tight group-hover:italic sm:text-3xl">
                  {row.title}
                </span>
                <span className="mt-0.5 block text-sm text-ink-600">{row.body}</span>
              </span>
              <span className="shrink-0 font-mono text-xs text-ink-600">
                {row.count}
                <span className="sr-only"> {row.unit}</span>
              </span>
              <span
                aria-hidden="true"
                className="shrink-0 text-ink-400 transition-transform group-hover:translate-x-1 group-hover:text-ink-900"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <form action={signOutAction} className="mt-8">
        <button type="submit" className={buttonClass({ variant: "secondary", size: "sm" })}>
          Sign out
        </button>
      </form>
    </div>
  );
}
