"use client";

import { forwardRef, memo } from "react";
import { ART } from "@/game/data/art";

/*
 * Phông nền cho hai trò chơi ở Hà Nội: phần trung tâm bản đồ Hà Nội thật do Sở Địa dư Đông Dương in
 * (ấn bản tháng 11/1929, phạm vi công cộng). Khung 1000×640 trùng khít với ảnh bản đồ, nên các mốc
 * dưới đây nằm đúng chỗ trên bản đồ (số trong ngoặc là số ghi trên bản đồ gốc, xem chú giải của bản đồ).
 */
export const MAP_W = 1000;
export const MAP_H = 640;

const MAP = ART["hanoi-play-1929"];

/** Các mốc có thật trên bản đồ, gắn nhãn tiếng Việt. */
const LANDMARKS: { x: number; y: number; t: string; dy?: number }[] = [
  { x: 268, y: 452, t: "Nhà tù Hỏa Lò" }, // (42) Prison
  { x: 272, y: 600, t: "Sở Mật thám" }, // (66) Direction de la Sûreté
  { x: 70, y: 522, t: "Ga Hà Nội", dy: -16 }, // (37) Gare
];

/** Khung giữ đúng tỉ lệ bản đồ, nằm giữa vùng chơi; các nút đặt theo phần trăm sẽ trùng khớp với bản đồ. */
export const MapStage = forwardRef<HTMLDivElement, { children: React.ReactNode }>(function MapStage({ children }, ref) {
  return (
    <div className="absolute inset-0 grid place-items-center" style={{ containerType: "size" }}>
      <div ref={ref} className="relative overflow-hidden" style={{ width: `min(100cqw, calc(100cqh * ${MAP_W} / ${MAP_H}))`, aspectRatio: `${MAP_W} / ${MAP_H}` }}>
        {children}
      </div>
    </div>
  );
});

export const OldMap = memo(function OldMap({ night = false }: { night?: boolean }) {
  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <image href={MAP.src} width={MAP_W} height={MAP_H} preserveAspectRatio="xMidYMid slice" />
      {/* giấy ngả màu theo thời gian */}
      <rect width={MAP_W} height={MAP_H} fill="#c9a86a" opacity="0.22" style={{ mixBlendMode: "multiply" }} />
      {night && <rect width={MAP_W} height={MAP_H} fill="#0b111c" opacity="0.58" />}
      {LANDMARKS.map((l) => (
        <g key={l.t}>
          <circle cx={l.x} cy={l.y} r="7" fill="none" stroke="#f3d27a" strokeWidth="2.5" />
          <circle cx={l.x} cy={l.y} r="2.5" fill="#f3d27a" />
          <text
            x={l.x + 12}
            y={l.y + (l.dy ?? 5)}
            fill="#f6e7c1"
            stroke="#120c07"
            strokeWidth="4"
            paintOrder="stroke"
            fontSize="17"
            fontWeight="600"
            style={{ fontFamily: "var(--font-head), sans-serif", letterSpacing: "0.03em" }}
          >
            {l.t}
          </text>
        </g>
      ))}
      <text
        x={MAP_W - 10}
        y={MAP_H - 10}
        textAnchor="end"
        fill="#f6e7c1"
        opacity="0.75"
        stroke="#120c07"
        strokeWidth="3"
        paintOrder="stroke"
        fontSize="13"
        style={{ fontFamily: "var(--font-text), serif", fontStyle: "italic" }}
      >
        {MAP.short}
      </text>
      <rect width={MAP_W} height={MAP_H} fill="none" stroke="#3b2a1a" strokeWidth="6" />
    </svg>
  );
});
