"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Chữ hiện dần như máy đánh chữ. Bấm vào đoạn chữ để hiện hết ngay.
 * `onDone` được gọi khi đã hiện đủ.
 */
export function Typed({
  text,
  cps = 55,
  delay = 0,
  className,
  onDone,
  cursor = true,
}: {
  text: string;
  /** Số ký tự mỗi giây. */
  cps?: number;
  delay?: number;
  className?: string;
  onDone?: () => void;
  cursor?: boolean;
}) {
  const [n, setN] = useState(0);
  const done = n >= text.length;
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => {
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t + delay * 1000;
      const k = instant ? text.length : Math.max(0, Math.floor(((t - start) / 1000) * cps));
      setN((prev) => Math.max(prev, Math.min(text.length, k)));
      if (k < text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, cps, delay]);

  useEffect(() => {
    if (done) doneRef.current?.();
  }, [done]);

  return (
    <span className={cn("cursor-text", className)} onClick={() => setN(text.length)}>
      {text.slice(0, n)}
      {cursor && !done && <span aria-hidden className="inline-block h-[1em] w-[0.45ch] translate-y-[0.12em] animate-blink bg-current align-baseline" />}
      <span aria-hidden className="invisible">
        {text.slice(n)}
      </span>
    </span>
  );
}
