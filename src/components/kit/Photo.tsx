"use client";

import type { ArtId } from "@/game/data/art";
import { ART } from "@/game/data/art";
import { FilmImage, PULL_OUT, type Camera } from "@/components/fx/Film";
import { cn } from "@/lib/cn";

/** Ảnh tư liệu in trên giấy ảnh viền trắng, dán băng dính ở hai góc, kèm chú thích đánh máy. */
export function Photo({
  id,
  className,
  rotate = -1.5,
  caption = true,
  camera = PULL_OUT,
  sizes = "(max-width: 1024px) 100vw, 480px",
  eager = false,
}: {
  id: ArtId;
  className?: string;
  rotate?: number;
  caption?: boolean;
  camera?: Camera | null;
  sizes?: string;
  eager?: boolean;
}) {
  const art = ART[id];
  return (
    <figure className={cn("print relative flex flex-col", className)} style={{ transform: `rotate(${rotate}deg)` }}>
      <span aria-hidden className="tape absolute -left-3 -top-2 z-10 h-6 w-16 -rotate-[24deg]" />
      <span aria-hidden className="tape absolute -right-3 -top-2 z-10 h-6 w-16 rotate-[22deg]" />
      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#2a2219]">
        <FilmImage id={id} tone="print" camera={camera} duration={18} sizes={sizes} eager={eager} />
        <div aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_0_0_40px_rgba(40,25,10,0.45)]" />
      </div>
      {caption && (
        <figcaption className="mt-1.5 line-clamp-2 font-type text-[10.5px] leading-snug text-ink-2" title={`${art.caption}. ${art.credit}`}>
          {art.short ?? art.caption}
        </figcaption>
      )}
    </figure>
  );
}
