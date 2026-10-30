"use client";

import { AnimatePresence, motion } from "motion/react";
import Image, { getImageProps } from "next/image";
import { useEffect, useRef } from "react";
import { ART, ART_LICENSE, type ArtId } from "@/game/data/art";
import { gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/cn";

/** Tông màu phim áp lên ảnh đơn sắc: lửa, lạnh, ánh nến, bình minh, ảnh in cũ. */
export type FilmTone = "ember" | "cold" | "candle" | "dawn" | "sepia" | "print";

const FILTER: Record<FilmTone, string> = {
  ember: "sepia(1) saturate(2.6) hue-rotate(-24deg) brightness(0.62) contrast(1.18)",
  cold: "grayscale(1) sepia(0.4) hue-rotate(172deg) saturate(1.7) brightness(0.52) contrast(1.22)",
  candle: "sepia(1) saturate(1.8) hue-rotate(-10deg) brightness(0.5) contrast(1.2)",
  dawn: "sepia(0.9) saturate(2) hue-rotate(-16deg) brightness(0.8) contrast(1.08)",
  sepia: "sepia(0.62) saturate(1.1) contrast(1.06) brightness(0.96)",
  print: "sepia(0.25) contrast(1.04)",
};

/** Chuyển động máy quay chậm (Ken Burns). x, y: độ lệch theo phần trăm khung, s: tỉ lệ phóng. */
export interface Camera {
  from: { x?: number; y?: number; s: number };
  to: { x?: number; y?: number; s: number };
}

export const PULL_OUT: Camera = { from: { s: 1.18 }, to: { s: 1.04 } };
export const PUSH_IN: Camera = { from: { s: 1.03 }, to: { s: 1.16 } };
/** Tiến dần về một điểm (x, y tính theo phần trăm khung, dương là sang phải/xuống dưới). */
export const zoomTo = (x: number, y: number, s = 1.38): Camera => ({ from: { s: 1.06 }, to: { x: -x, y: -y, s } });

/** Ảnh tư liệu chiếu như phim: tông màu, máy quay chậm, hiện dần từ ảnh mờ. */
export function FilmImage({
  id,
  tone = "sepia",
  camera = PULL_OUT,
  duration = 16,
  sizes = "100vw",
  eager = false,
  fit = "cover",
  className,
}: {
  id: ArtId;
  tone?: FilmTone;
  camera?: Camera | null;
  duration?: number;
  sizes?: string;
  eager?: boolean;
  fit?: "cover" | "contain";
  className?: string;
}) {
  const art = ART[id];
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current || !camera || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        ref.current,
        { scale: camera.from.s, xPercent: camera.from.x ?? 0, yPercent: camera.from.y ?? 0 },
        { scale: camera.to.s, xPercent: camera.to.x ?? 0, yPercent: camera.to.y ?? 0, duration, ease: "power1.out" },
      );
    },
    { dependencies: [id], scope: ref, revertOnUpdate: true },
  );

  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      <div ref={ref} className="absolute inset-0 will-change-transform">
        <Image
          src={art.src}
          alt={art.caption}
          fill
          sizes={sizes}
          placeholder="blur"
          blurDataURL={art.lqip}
          loading={eager ? "eager" : "lazy"}
          className={fit === "cover" ? "object-cover" : "object-contain"}
          style={{ objectPosition: art.focus ?? "50% 50%", filter: FILTER[tone] }}
        />
      </div>
    </div>
  );
}

/** Chuỗi ảnh tư liệu chiếu nối nhau, chuyển cảnh mờ dần. index do nơi dùng điều khiển. */
export function FilmReel({ ids, index, tone = "ember", seconds = 8 }: { ids: ArtId[]; index: number; tone?: FilmTone; seconds?: number }) {
  const id = ids[index % ids.length];
  useEffect(() => preloadArt([ids[(index + 1) % ids.length]]), [ids, index]);
  return (
    <AnimatePresence initial={false}>
      <motion.div key={id} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.8, ease: "easeInOut" }}>
        <FilmImage id={id} tone={tone} camera={index % 2 ? PUSH_IN : PULL_OUT} duration={seconds + 2} eager={index === 0} />
      </motion.div>
    </AnimatePresence>
  );
}

/** Lớp hiệu ứng máy chiếu phim: hạt nhiễu, vệt xước, chớp sáng, viền tối, vệt sáng lọt. */
export function FilmFx({ leak, strong = false, className }: { leak?: "warm" | "cold"; strong?: boolean; className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="film-vignette absolute inset-0" />
      {leak && <div className={cn("film-leak absolute -inset-1/4", leak === "cold" && "film-leak-cold")} />}
      <div className={cn("film-grain absolute -inset-1/2", strong && "opacity-[0.16]")} />
      <div className="film-scratch absolute inset-y-0 left-[22%] w-px" />
      <div className="film-scratch film-scratch-b absolute inset-y-0 left-[71%] w-px" />
      <div className="film-flicker absolute inset-0" />
    </div>
  );
}

/** Dòng chú thích ảnh tư liệu kèm nguồn. */
export function ArtCaption({ id, className, short = false }: { id: ArtId; className?: string; short?: boolean }) {
  const art = ART[id];
  return (
    <span className={cn("block text-[10.5px] leading-snug", className)} title={`${art.caption}. Nguồn: ${art.credit}. ${art.license ?? ART_LICENSE}.`}>
      {art.caption}
      {!short && <span className="opacity-70"> · {art.credit}</span>}
    </span>
  );
}

/** Tải trước ảnh của màn sắp tới để khi mở ra là có ngay (dùng đúng srcset như thẻ ảnh thật). */
export function preloadArt(ids: ArtId[], sizes = "100vw") {
  if (typeof window === "undefined") return;
  for (const id of ids) {
    const art = ART[id];
    const { props } = getImageProps({ src: art.src, alt: "", fill: true, sizes });
    const img = new window.Image();
    if (props.sizes) img.sizes = props.sizes;
    if (props.srcSet) img.srcset = props.srcSet;
    img.src = props.src;
  }
}
