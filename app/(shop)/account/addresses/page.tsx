import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getAddresses } from "@/lib/db/queries/orders";
import { deleteAddressAction } from "@/lib/actions/checkout";
import { formatAddress } from "@/lib/checkout";
import { AccountBreadcrumb as Breadcrumb } from "@/components/account-breadcrumb";
import { buttonClass } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";

export const metadata: Metadata = { title: "Your addresses" };
export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=%2Faccount%2Faddresses");

  const addresses = await getAddresses(session.user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
      <Breadcrumb here="Your addresses" />

      <PageTitle
        className="mt-6"
        eyebrow={`${addresses.length} saved ${addresses.length === 1 ? "address" : "addresses"}`}
      >
        Your addresses
      </PageTitle>

      {addresses.length === 0 ? (
        <div className="mt-8 border-t border-ink-900 pt-6">
          <p className="text-ink-600">
            No saved addresses yet. The one you enter at checkout is kept here.
          </p>
          <Link href="/cart" className={buttonClass({ variant: "secondary", className: "mt-6" })}>
            Go to cart
          </Link>
        </div>
      ) : (
        <ul className="mt-8 border-t border-ink-900">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="flex items-start justify-between gap-4 border-b border-border py-5"
            >
              <div className="min-w-0 text-[0.9375rem]">
                <p className="font-medium">{address.fullName}</p>
                <p className="mt-0.5 text-ink-600">{formatAddress(address)}</p>
              </div>
              {/* A plain form, so removing an address needs no JavaScript. */}
              <form action={deleteAddressAction} className="shrink-0">
                <input type="hidden" name="addressId" value={address.id} />
                <button
                  type="submit"
                  className="min-h-11 text-sm text-ink-600 underline decoration-border underline-offset-4 hover:text-danger hover:decoration-danger"
                >
                  Remove
                  <span className="sr-only"> address for {address.fullName}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
