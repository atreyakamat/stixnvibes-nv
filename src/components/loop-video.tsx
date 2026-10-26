"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function canPlay() {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  return !window.matchMedia(QUERY).matches && !saveData;
}

// Videos wait until the page has loaded and the main thread is idle, so they
// never compete with the first paint or with hydration.
function afterLoad(fn: () => void) {
  const idle = () =>
    "requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 300);
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
}

/**
 * A muted loop that only downloads and plays while it is on screen. The poster
 * carries the frame on its own, so reduced motion and data saver get a still.
 */
export function LoopVideo({
  src,
  av1,
  poster,
  alt,
  className = "",
  priority = false,
}: {
  src: string;
  // Sharper AV1 version at a similar size; browsers without AV1 use `src`.
  av1?: string;
  // Without a poster the video fades in over whatever sits behind it.
  poster?: string;
  alt?: string;
  className?: string;
  priority?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const allowed = useSyncExternalStore(subscribe, canPlay, () => false);
  const [near, setNear] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!allowed || !el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          afterLoad(() => setNear(true));
          video.current?.play().catch(() => {});
        } else video.current?.pause();
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [allowed]);

  return (
    <div ref={box} className={`relative overflow-hidden ${className}`}>
      {poster && (
        <img
          src={poster}
          alt={alt ?? ""}
          className="absolute inset-0 size-full object-cover"
          fetchPriority={priority ? "high" : undefined}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
        />
      )}
      {allowed && near && !failed && (
        <video
          ref={video}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          aria-hidden="true"
          onPlaying={() => setPlaying(true)}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ${
            playing ? "opacity-100" : "opacity-0"
          }`}
        >
          {av1 && <source src={av1} type='video/mp4; codecs="av01.0.08M.10"' />}
          <source src={src} type="video/mp4" onError={() => setFailed(true)} />
        </video>
      )}
    </div>
  );
}
