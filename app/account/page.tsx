import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Your account" };
export const dynamic = "force-dynamic";

/**
 * Three things: orders, addresses, sign out (D12). Amazon's account page is
 * twelve cards over roughly ninety links, of which exactly one is what people
 * came for. Addresses fill in at M6, when there are any.
 */
export default async function AccountPage() {
  const session = await auth();
  if (!session) redirect("/sign-in?callbackUrl=%2Faccount");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Your account</h1>
      <p className="mt-1 text-sm text-ink-600">
        Signed in as {session.user?.email}
      </p>

      <ul className="mt-8 flex flex-col gap-3">
        <li>
          <Link
            href="/orders"
            className="flex items-center justify-between rounded-lg border border-border p-4 hover:border-ink-400"
          >
            <span>
              <span className="block font-medium">Your orders</span>
              <span className="block text-sm text-ink-600">
                Track and review what you have ordered
              </span>
            </span>
            <span aria-hidden="true" className="text-ink-400">
              ›
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/account/addresses"
            className="flex items-center justify-between rounded-lg border border-border p-4 hover:border-ink-400"
          >
            <span>
              <span className="block font-medium">Your addresses</span>
              <span className="block text-sm text-ink-600">
                Where your orders are delivered
              </span>
            </span>
            <span aria-hidden="true" className="text-ink-400">
              ›
            </span>
          </Link>
        </li>
      </ul>

      <form action={signOutAction} className="mt-8">
        <button
          type="submit"
          className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:border-ink-400"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
