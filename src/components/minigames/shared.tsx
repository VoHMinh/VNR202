"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/** Đo kích thước khung cha (trò chơi tự co giãn theo khung, không theo cửa sổ). */
export function useBox<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setBox((b) => (Math.abs(b.w - r.width) < 0.5 && Math.abs(b.h - r.height) < 0.5 ? b : { w: r.width, h: r.height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, box] as const;
}

/** Trả về hàm kết thúc chỉ chạy đúng một lần, điểm được làm tròn và kẹp trong 0–1000. */
export function useFinishOnce(onFinish: (score: number) => void) {
  const cb = useRef(onFinish);
  const done = useRef(false);
  useEffect(() => {
    cb.current = onFinish;
  });
  return useCallback((score: number) => {
    if (done.current) return false;
    done.current = true;
    cb.current(Math.round(Math.min(1000, Math.max(0, Number.isFinite(score) ? score : 0))));
    return true;
  }, []);
}

/** Bộ sinh số giả ngẫu nhiên có hạt giống: cùng mốc bắt đầu thì cùng lịch, không lệch giữa server và trình duyệt. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bỏ qua phím khi người chơi đang gõ chữ hoặc đang đứng ở một nút bấm khác. */
export function isTypingTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}

/** Hạt giấy: lốm đốm xơ giấy và vết ố, vẽ bằng nhiễu SVG nên không phụ thuộc ảnh nền. */
export const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.36 0 0 0 0 0.25 0 0 0 0 0.12 0 0 0 0.75 -0.3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Mặt bàn gỗ ván ghép: vân gỗ bằng nhiễu SVG kéo dãn theo chiều ngang, mạch ván, sắc độ từng tấm khác nhau. */
export function WoodSurface({ seed = 7, plank = 74, className }: { seed?: number; plank?: number; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg aria-hidden className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}>
      <defs>
        <filter id={`wg${uid}`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.0032 0.115" numOctaves="4" seed={seed} result="t" />
          <feColorMatrix in="t" type="matrix" values="0.5 0 0 0 0.12  0.3 0 0 0 0.065  0.15 0 0 0 0.025  0 0 0 0 1" result="c" />
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.9" numOctaves="2" seed={seed + 3} result="f" />
          <feColorMatrix in="f" type="matrix" values="0 0 0 0 0.05  0 0 0 0 0.03  0 0 0 0 0.01  0 0 0 1.4 -0.62" result="fl" />
          <feComposite in="fl" in2="c" operator="over" />
        </filter>
        <pattern id={`wp${uid}`} width="600" height={plank * 3} patternUnits="userSpaceOnUse">
          <rect y={plank} width="600" height={plank} fill="rgba(0,0,0,0.13)" />
          <rect y={plank * 2} width="600" height={plank} fill="rgba(90,45,10,0.12)" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect y={i * plank} width="600" height="2" fill="rgba(0,0,0,0.6)" />
              <rect y={i * plank + 2} width="600" height="1" fill="rgba(255,214,160,0.09)" />
            </g>
          ))}
          <rect x="230" y="0" width="2" height={plank} fill="rgba(0,0,0,0.5)" />
          <rect x="470" y={plank} width="2" height={plank} fill="rgba(0,0,0,0.5)" />
          <rect x="90" y={plank * 2} width="2" height={plank} fill="rgba(0,0,0,0.5)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" filter={`url(#wg${uid})`} />
      <rect width="100%" height="100%" fill={`url(#wp${uid})`} />
    </svg>
  );
}
