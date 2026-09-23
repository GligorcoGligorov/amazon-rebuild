import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "Your orders" };
export const dynamic = "force-dynamic";

/** Behind the wall from M5; M6 fills it with real orders. */
export default async function OrdersPage() {
  const session = await auth();
  if (!session) redirect("/sign-in?callbackUrl=%2Forders");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
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
      <p className="mt-2 text-ink-600">
        You have not placed any orders yet.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:bg-accent-hover"
      >
        Start shopping
      </Link>
    </div>
  );
}
