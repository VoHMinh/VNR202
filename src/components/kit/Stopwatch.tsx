"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/sfx";

/**
 * Đồng hồ bấm giờ kiểu cũ. Thời gian tính từ `startedAt` (mốc thời gian thật), nên tải lại trang cũng không được thêm giờ.
 * Gọi `onExpire` đúng một lần khi hết giờ.
 */
export function Stopwatch({
  seconds,
  startedAt,
  running = true,
  onExpire,
  size = 64,
  className,
}: {
  seconds: number;
  startedAt: number;
  running?: boolean;
  onExpire?: () => void;
  size?: number;
  className?: string;
}) {
  const [left, setLeft] = useState(seconds);
  const fired = useRef(false);
  const lastTick = useRef(-1);
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  });

  useEffect(() => {
    fired.current = false;
    lastTick.current = -1;
  }, [startedAt]);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const tick = () => {
      const l = Math.max(0, seconds - (Date.now() - startedAt) / 1000);
      setLeft(l);
      const whole = Math.ceil(l);
      if (whole <= 5 && whole > 0 && whole !== lastTick.current) {
        lastTick.current = whole;
        sfx.tick();
      }
      if (l <= 0) {
        if (!fired.current) {
          fired.current = true;
          expire.current?.();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seconds, startedAt, running]);

  const frac = 1 - left / seconds;
  const urgent = left <= 5;
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size * 1.12 }} role="timer" aria-label={`Còn ${Math.ceil(left)} giây`}>
      <svg viewBox="0 0 100 112" className="h-full w-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)]">
        <defs>
          <radialGradient id="sw-brass" cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#f6dc9a" />
            <stop offset="0.45" stopColor="#c9993f" />
            <stop offset="1" stopColor="#6e4a14" />
          </radialGradient>
          <radialGradient id="sw-face" cx="0.45" cy="0.4" r="0.7">
            <stop offset="0" stopColor="#fbf4e2" />
            <stop offset="1" stopColor="#d9ccaa" />
          </radialGradient>
        </defs>
        <rect x="43" y="0" width="14" height="10" rx="2" fill="url(#sw-brass)" />
        <rect x="46" y="8" width="8" height="8" fill="#8a6524" />
        <circle cx="50" cy="62" r="48" fill="url(#sw-brass)" />
        <circle cx="50" cy="62" r="41" fill="url(#sw-face)" stroke="#5d3f12" strokeWidth="1.2" />
        {ticks.map((i) => {
          const a = (i / 60) * Math.PI * 2;
          const r1 = i % 5 === 0 ? 33 : 36.5;
          return (
            <line
              key={i}
              x1={50 + Math.sin(a) * r1}
              y1={62 - Math.cos(a) * r1}
              x2={50 + Math.sin(a) * 39}
              y2={62 - Math.cos(a) * 39}
              stroke="#2a2118"
              strokeWidth={i % 5 === 0 ? 1.6 : 0.6}
            />
          );
        })}
        <path d={describeArc(50, 62, 22, 0, frac * 360)} fill={urgent ? "rgba(179,38,30,0.28)" : "rgba(60,45,25,0.16)"} />
        <line
          x1="50"
          y1="66"
          x2={50 + Math.sin(frac * Math.PI * 2) * 34}
          y2={62 - Math.cos(frac * Math.PI * 2) * 34}
          stroke="#b3261e"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="50" cy="62" r="3.2" fill="#2a2118" />
        <text x="50" y="86" textAnchor="middle" className="font-head" fontSize="15" fontWeight="700" fill={urgent ? "#b3261e" : "#2a2118"}>
          {Math.ceil(left)}
        </text>
      </svg>
    </div>
  );
}

function describeArc(cx: number, cy: number, r: number, start: number, end: number) {
  if (end - start >= 359.99) end = start + 359.99;
  const p = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const [x1, y1] = p(start);
  const [x2, y2] = p(end);
  const large = end - start > 180 ? 1 : 0;
  return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
}
