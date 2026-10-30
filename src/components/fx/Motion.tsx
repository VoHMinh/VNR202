"use client";

import { animate, useInView } from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/** Số chạy mượt khi giá trị đổi (giống Magic UI Number Ticker). */
export function NumberTicker({ value, className, duration = 0.9 }: { value: number; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const controls = animate(prev.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        node.textContent = Math.round(v).toLocaleString("vi-VN");
      },
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, duration]);
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {value.toLocaleString("vi-VN")}
    </span>
  );
}

/** Số đếm từ 0 khi lọt vào khung nhìn. */
export function CountUp({ to, className, duration = 1.6 }: { to: number; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    const node = ref.current;
    if (!inView || !node) return;
    const c = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => (node.textContent = Math.round(v).toLocaleString("vi-VN")),
      onComplete: () => (node.textContent = to.toLocaleString("vi-VN")),
    });
    return () => c.stop();
  }, [inView, to, duration]);
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      0
    </span>
  );
}
