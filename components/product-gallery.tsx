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
      <div className="relative aspect-square overflow-hidden bg-well">
        <Image
          src={images[active]}
          alt={`${title} — image ${active + 1} of ${images.length}`}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 58vw"
          className="object-contain p-[10%]"
        />
      </div>

      {images.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-6 sm:overflow-visible">
          {images.map((src, i) => (
            <li key={src} className="shrink-0 sm:shrink">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={i === active}
                className={`relative block size-16 overflow-hidden bg-well sm:size-auto sm:w-full sm:aspect-square ${
                  i === active
                    ? "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-ink-900"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 64px, 120px"
                  className="object-contain p-1.5"
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
