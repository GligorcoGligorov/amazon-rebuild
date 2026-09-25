import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";

/**
 * D11: checkout is a walled garden. No nav, no search, no cart badge — nothing
 * to click but finishing or deliberately leaving. Amazon strips its checkout
 * the same way and it is the single best-designed flow on their site.
 */
export default function CheckoutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-ink-900 focus:shadow-lg"
      >
        Skip to main content
      </a>

      <header className="border-b border-border bg-page text-ink-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2">
          <Link href="/" className="inline-block py-2.5">
            <Wordmark />
          </Link>
          <p className="eyebrow">Secure checkout</p>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border bg-surface-sunken">
        <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-ink-600">
          Demo store — no payment is taken and nothing is shipped.
        </div>
      </footer>
    </>
  );
}
