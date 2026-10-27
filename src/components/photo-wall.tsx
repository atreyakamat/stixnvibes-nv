import type { GalleryItem } from "@/lib/types";

/** Photos in a masonry wall. Each opens full size. */
export function PhotoWall({ items, label }: { items: (GalleryItem & { where?: string })[]; label: (g: GalleryItem & { where?: string }) => string }) {
  return (
    <ul className="columns-2 gap-3 md:columns-3 lg:columns-4 [&>li]:mb-3">
      {items.map((g) => (
        <li key={g.id} className="break-inside-avoid">
          <a href={g.image} target="_blank" rel="noopener" className="group block overflow-hidden rounded-2xl border border-line">
            <img src={g.image} alt={label(g)} loading="lazy" className="w-full transition-transform duration-500 group-hover:scale-[1.03]" />
            {(g.caption || g.where) && (
              <span className="block space-y-0.5 p-3 text-sm">
                {g.caption && <span className="block">{g.caption}</span>}
                {g.where && <span className="block text-xs text-mute">{g.where}</span>}
              </span>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}
