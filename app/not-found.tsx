import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { NotFoundContent } from "@/components/not-found-content";

export const metadata: Metadata = { title: "Page not found" };

/**
 * Unmatched URLs land here, outside any route group — so this has to bring its
 * own chrome. A 404 without the header is a dead end with no way out of it.
 */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <NotFoundContent />
      </main>
      <SiteFooter />
    </>
  );
}
