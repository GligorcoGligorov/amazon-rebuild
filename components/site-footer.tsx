import Link from "next/link";
import { Wordmark } from "./ui/wordmark";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ink-900 bg-page">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-[1fr_auto] sm:items-end sm:px-6">
        <div>
          <p>
            <Wordmark className="text-4xl" />
          </p>
          <p className="mt-2 max-w-sm text-sm text-ink-600">
            Everyday goods, well chosen. A demo store built for 8x — the data is
            real enough to shop, and nothing here is for sale.
          </p>
        </div>
        {/* Colophon: the print habit of saying what a thing is set in — and,
            for reviewers, where the system behind it lives. */}
        <div className="sm:text-right">
          <p className="eyebrow">
            Set in Instrument Serif, Instrument Sans
            <br className="hidden sm:inline" /> &amp; Geist Mono · Vol. 01
          </p>
          <Link
            href="/design-system"
            className="mt-2 inline-flex min-h-11 items-center text-sm font-medium underline decoration-border underline-offset-4 hover:decoration-ink-900"
          >
            Design system
          </Link>
        </div>
      </div>
    </footer>
  );
}
