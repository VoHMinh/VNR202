"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Cờ đỏ búa liềm bay trong gió, vẽ trên canvas: mặt cờ lấy đúng mẫu chuẩn (public/flags/party.svg),
 * chia thành từng dải dọc lượn theo sóng, kèm sáng tối theo nếp vải và cán cờ gỗ.
 */
export function PartyFlag({ width = 320, className, pole = true }: { width?: number; className?: string; pole?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const W = Math.round(width * dpr);
    const H = Math.round(W * (2 / 3));
    const poleW = pole ? Math.round(W * 0.035) : 0;
    const left = poleW + Math.round(2 * dpr);
    const padY = Math.round(H * 0.16);
    const totalW = left + W + Math.round(W * 0.04);
    const totalH = H + padY * 2 + (pole ? Math.round(H * 0.9) : 0);
    canvas.width = totalW;
    canvas.height = totalH;
    canvas.style.width = `${totalW / dpr}px`;
    canvas.style.height = `${totalH / dpr}px`;

    // Mặt cờ dựng sẵn trên một canvas phụ, có thêm vân vải mịn.
    const tex = document.createElement("canvas");
    tex.width = W;
    tex.height = H;
    const tctx = tex.getContext("2d")!;
    tctx.fillStyle = "#d42a1e";
    tctx.fillRect(0, 0, W, H);
    const weave = () => {
      const img = tctx.getImageData(0, 0, W, H);
      const d = img.data;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const n = ((x % 3 === 0 ? 6 : 0) + (y % 3 === 0 ? 6 : 0) + Math.random() * 10) - 9;
          d[i] = Math.max(0, Math.min(255, d[i] + n));
          d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n * 0.6));
          d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 0.6));
        }
      }
      tctx.putImageData(img, 0, 0);
    };

    let raf = 0;
    let visible = true;
    let ready = false;
    const t0 = performance.now();
    const slice = Math.max(2, Math.round(2 * dpr));

    const drawPole = () => {
      if (!pole) return;
      const g = ctx.createLinearGradient(0, 0, poleW, 0);
      g.addColorStop(0, "#2a1a0e");
      g.addColorStop(0.35, "#8a5a2c");
      g.addColorStop(0.6, "#5a3718");
      g.addColorStop(1, "#1e1209");
      ctx.fillStyle = g;
      ctx.fillRect(0, padY * 0.55, poleW, totalH);
      const r = poleW * 0.9;
      const b = ctx.createRadialGradient(poleW / 2 - r * 0.3, padY * 0.55 - r * 0.3, r * 0.1, poleW / 2, padY * 0.55, r);
      b.addColorStop(0, "#fff1b8");
      b.addColorStop(0.5, "#d6a33a");
      b.addColorStop(1, "#6e4810");
      ctx.fillStyle = b;
      ctx.beginPath();
      ctx.arc(poleW / 2, padY * 0.55, r, 0, Math.PI * 2);
      ctx.fill();
    };

    const frame = (now: number) => {
      const t = reduce ? 0.8 : (now - t0) / 1000;
      ctx.clearRect(0, 0, totalW, totalH);
      drawPole();
      if (ready) {
        for (let x = 0; x < W; x += slice) {
          const u = x / W;
          const amp = H * 0.075 * Math.pow(u, 0.85);
          const ph = u * 7.2 - t * 3.1;
          const dy = Math.sin(ph) * amp + Math.sin(u * 13 - t * 4.7) * amp * 0.18;
          const slope = Math.cos(ph) * Math.pow(u, 0.6);
          const sx = left + x;
          const sy = padY + dy;
          ctx.drawImage(tex, x, 0, slice, H, sx, sy, slice + 0.6, H);
          ctx.fillStyle = slope > 0 ? `rgba(255,236,220,${slope * 0.16})` : `rgba(20,0,0,${-slope * 0.34})`;
          ctx.fillRect(sx, sy, slice + 0.6, H);
        }
        // bóng cán cờ đổ lên mép vải
        const sh = ctx.createLinearGradient(left, 0, left + W * 0.05, 0);
        sh.addColorStop(0, "rgba(0,0,0,0.35)");
        sh.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = sh;
        ctx.fillRect(left, padY - H * 0.02, W * 0.05, H * 1.04);
      }
      if (!reduce && visible) raf = requestAnimationFrame(frame);
    };

    const img = new Image();
    img.onload = () => {
      tctx.drawImage(img, 0, 0, W, H);
      weave();
      ready = true;
      if (reduce) frame(performance.now());
    };
    img.onerror = () => {
      weave();
      ready = true;
    };
    img.src = "/flags/party.svg";

    const io = new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was && !reduce) raf = requestAnimationFrame(frame);
    });
    io.observe(canvas);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [width, pole]);

  return <canvas ref={ref} aria-label="Cờ đỏ búa liềm" role="img" className={cn("block", className)} />;
}
