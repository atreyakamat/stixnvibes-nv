"use client";

import { useState } from "react";

export function Gallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div>
      <div className="ice grid aspect-square place-items-center overflow-hidden rounded-[2rem] border border-line p-10 md:p-16">
        {current ? (
          <img
            key={current}
            src={current}
            alt={images.length > 1 ? `${name}, photo ${active + 1} of ${images.length}` : name}
            fetchPriority="high"
            className="drop-in sticker-shadow max-h-full w-auto object-contain"
          />
        ) : (
          <span className="label text-mute">Photo coming soon</span>
        )}
      </div>
      {images.length > 1 && (
        <ul className="mt-3 flex gap-2" aria-label="Photos">
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === active}
                className={`grid size-20 place-items-center rounded-xl border bg-surface p-2 transition-colors ${
                  i === active ? "border-lemon" : "border-line hover:border-paper/40"
                }`}
              >
                <img src={src} alt="" loading="lazy" className="max-h-full w-auto object-contain" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
