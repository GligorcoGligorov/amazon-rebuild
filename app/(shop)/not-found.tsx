import type { Metadata } from "next";
import { NotFoundContent } from "@/components/not-found-content";

export const metadata: Metadata = { title: "Not found" };

/** A `notFound()` from a product, category or order. Chrome comes from the group layout. */
export default function ShopNotFound() {
  return <NotFoundContent />;
}
