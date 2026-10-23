"use client";

import { useRef, type PointerEvent } from "react";

// A sticker that lifts and tilts toward the pointer, with a light sheen that
// follows it. Pure transforms; nothing happens on touch or reduced motion.
export function TiltSticker({
  src,
  alt = "",
  className = "",
  rotate = 0,
  width,
  height,
}: {
  src: string;
  alt?: string;
  className?: string;
  rotate?: number;
  width: number;
  height: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(700px) rotate(${rotate}deg) rotateX(${-py * 18}deg) rotateY(${px * 18}deg) translateZ(30px) scale(1.04)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = `rotate(${rotate}deg)`;
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ transform: `rotate(${rotate}deg)` }}
      className={`transition-transform duration-500 ease-out-expo ${className}`}
    >
      <img src={src} alt={alt} width={width} height={height} loading="lazy" draggable={false} className="sticker-shadow h-auto w-full" />
    </div>
  );
}
