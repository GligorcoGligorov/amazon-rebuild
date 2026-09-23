import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "Your addresses" };
export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const session = await auth();
  if (!session) redirect("/sign-in?callbackUrl=%2Faccount%2Faddresses");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-600">
        <Link href="/account" className="hover:underline">
          Your account
        </Link>
        <span aria-hidden="true"> › </span>
        <span aria-current="page" className="font-medium text-ink-900">
          Your addresses
        </span>
      </nav>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Your addresses</h1>
      <p className="mt-2 text-ink-600">
        No saved addresses yet. The one you enter at checkout is kept here.
      </p>
      <Link
        href="/cart"
        className="mt-6 inline-block rounded-md border border-border px-4 py-2 text-sm font-semibold hover:border-ink-400"
      >
        Go to cart
      </Link>
    </div>
  );
}
