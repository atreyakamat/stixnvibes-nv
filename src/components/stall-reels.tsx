import { LoopVideo } from "./loop-video";

const CLIPS = [1, 2, 3, 4, 5, 6].map((n) => ({
  src: `/stall/clip-${n}.mp4`,
  av1: `/stall/clip-${n}.av1.mp4`,
  poster: `/stall/clip-${n}.webp`,
}));

const TILT = [-2, 1.5, -1, 2, -1.5, 1];

/**
 * Clips from our stalls. Each plays only while on screen and after the page
 * has loaded, so the shop stays as fast as before. Phones get four.
 */
export function StallReels() {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-6 md:gap-4">
      {CLIPS.map((c, i) => (
        <li key={c.src} className={i > 3 ? "hidden md:block" : ""} style={{ rotate: `${TILT[i]}deg` }}>
          <LoopVideo
            src={c.src}
            av1={c.av1}
            poster={c.poster}
            alt="Students picking stickers and posters at a Stix N Vibes stall"
            className="aspect-[9/16] rounded-[1.25rem] ring-1 ring-paper/10"
          />
        </li>
      ))}
    </ul>
  );
}
