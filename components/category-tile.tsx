import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/lib/db/schema";

export function CategoryTile({ category }: { category: Category }) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="group relative block overflow-hidden rounded-lg border border-border bg-surface-sunken"
    >
      <div className="relative aspect-[4/3]">
        {category.imageUrl ? (
          <Image
            src={category.imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-surface-sunken" />
        )}
        {/* Scrim keeps the label readable over any photograph. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <h3 className="absolute inset-x-0 bottom-0 p-4 text-lg font-semibold text-white">
          {category.name}
        </h3>
      </div>
    </Link>
  );
}
