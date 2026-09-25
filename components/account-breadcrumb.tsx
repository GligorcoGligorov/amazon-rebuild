import Link from "next/link";

/** Account › [Orders ›] here. Shared by the addresses, orders and order pages. */
export function AccountBreadcrumb({
  here,
  viaOrders = false,
}: {
  here: React.ReactNode;
  viaOrders?: boolean;
}) {
  return (
    <nav aria-label="Breadcrumb" className="eyebrow">
      <ol className="flex flex-wrap items-center gap-x-2">
        <li>
          <Link href="/account" className="hover:text-ink-900 hover:underline">
            Your account
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        {viaOrders ? (
          <>
            <li>
              <Link href="/orders" className="hover:text-ink-900 hover:underline">
                Your orders
              </Link>
            </li>
            <li aria-hidden="true">/</li>
          </>
        ) : null}
        <li aria-current="page" className="text-ink-900">
          {here}
        </li>
      </ol>
    </nav>
  );
}
