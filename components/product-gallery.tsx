"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * A genuine interactive leaf, so it is a client component — see D2. The
 * thumbnails are real buttons in a tablist, so arrow keys and Tab both work.
 */
export function ProductGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-surface-sunken">
        <Image
          src={images[active]}
          alt={`${title} — image ${active + 1} of ${images.length}`}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain p-4"
        />
      </div>

      {images.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={i === active}
                className={`relative block h-16 w-16 overflow-hidden rounded-md border-2 bg-surface-sunken transition-colors ${
                  i === active ? "border-ink-900" : "border-border hover:border-ink-400"
                }`}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-contain p-1"
                />
                <span className="sr-only">Show image {i + 1}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
