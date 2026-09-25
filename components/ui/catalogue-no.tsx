import { catalogueNo } from "@/lib/format";

export function CatalogueNo({ slug, className = "" }: { slug: string; className?: string }) {
  const no = catalogueNo(slug);
  return no ? <span className={`eyebrow ${className}`}>{no}</span> : null;
}
