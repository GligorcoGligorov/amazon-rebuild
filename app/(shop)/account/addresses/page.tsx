import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getAddresses } from "@/lib/db/queries/orders";
import { deleteAddressAction } from "@/lib/actions/checkout";
import { formatAddress } from "@/lib/checkout";

export const metadata: Metadata = { title: "Your addresses" };
export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=%2Faccount%2Faddresses");

  const addresses = await getAddresses(session.user.id);

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

      {addresses.length === 0 ? (
        <>
          <p className="mt-2 text-ink-600">
            No saved addresses yet. The one you enter at checkout is kept here.
          </p>
          <Link
            href="/cart"
            className="mt-6 inline-block rounded-md border border-border px-4 py-2 text-sm font-semibold hover:border-ink-400"
          >
            Go to cart
          </Link>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-600">
            {addresses.length} saved {addresses.length === 1 ? "address" : "addresses"}
          </p>
          <ul className="mt-6 flex flex-col gap-3">
            {addresses.map((address) => (
              <li
                key={address.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-border p-4"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{address.fullName}</p>
                  <p className="mt-0.5 text-ink-600">{formatAddress(address)}</p>
                </div>
                {/* A plain form, so removing an address needs no JavaScript. */}
                <form action={deleteAddressAction} className="shrink-0">
                  <input type="hidden" name="addressId" value={address.id} />
                  <button
                    type="submit"
                    className="text-sm text-link underline underline-offset-2"
                  >
                    Remove
                    <span className="sr-only"> address for {address.fullName}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
