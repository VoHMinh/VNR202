"use client";

import { AnimatePresence, motion } from "motion/react";
import { memo } from "react";
import { DELEGATES } from "@/game/data/minis";
import { PartyFlag } from "@/components/kit/PartyFlag";
import { Stamp } from "@/components/kit/Stamp";
import { cn } from "@/lib/cn";

/*
 * Phòng họp Đại hội, vẽ như một tờ sơ đồ kẹp trong hồ sơ: bàn dài, 13 ghế.
 * Ghế sáng vàng khi người chơi mời đúng đại biểu vào; vàng nhạt khi đồng chí phụ trách xác minh lại và mời vào
 * (người chơi mời nhầm ra, hoặc hết giờ). Kết thúc: luôn đủ 13 ghế, dấu mộc "Đại hội khai mạc" và cờ Đảng.
 */

/** Trạng thái ghế: còn trống · người chơi mời vào · đồng chí phụ trách mời vào. */
export type SeatMark = "." | "a" | "e";

export interface LogItem {
  id: number;
  text: string;
  tone: "good" | "bad" | "info" | "warn";
}

export interface DoorEnd {
  score: number;
  /** Đại biểu người chơi mời vào đúng. */
  rightIn: number;
  /** Người không hợp lệ người chơi mời ra đúng. */
  rightOut: number;
  /** Tổng số người không hợp lệ trong lượt chơi. */
  outTotal: number;
}

const TONE: Record<LogItem["tone"], string> = {
  good: "text-olive",
  bad: "text-stamp",
  info: "text-ink-2",
  warn: "text-[#8a4b0c]",
};

/** Vị trí 13 ghế trên sơ đồ (khung 600×300): 6 ghế hàng trên, 6 ghế hàng dưới, 1 ghế đầu bàn bên phải. */
const SEATS: { x: number; y: number; rot: number }[] = [
  ...Array.from({ length: 6 }, (_, i) => ({ x: 170 + i * 52, y: 101, rot: 180 })),
  ...Array.from({ length: 6 }, (_, i) => ({ x: 170 + i * 52, y: 199, rot: 0 })),
  { x: 478, y: 150, rot: 270 },
];

/** Sơ đồ phòng họp. */
const FloorPlan = memo(function FloorPlan({ seats, glow }: { seats: string; glow: boolean }) {
  return (
    <svg viewBox="0 0 600 300" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="dh-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a6634" />
          <stop offset="0.5" stopColor="#7a4a22" />
          <stop offset="1" stopColor="#5e3517" />
        </linearGradient>
        <radialGradient id="dh-warm" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#ffd77a" stopOpacity="0.75" />
          <stop offset="1" stopColor="#ffd77a" stopOpacity="0" />
        </radialGradient>
        <pattern id="dh-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0 H0 V20" fill="none" stroke="rgba(31,26,20,0.07)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="18" y="18" width="564" height="264" fill="url(#dh-grid)" />
      {glow && <motion.rect x="18" y="18" width="564" height="264" fill="url(#dh-warm)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />}
      {/* tường: nét kép */}
      <rect x="18" y="18" width="564" height="264" fill="none" stroke="#1f1a14" strokeWidth="7" />
      <rect x="27" y="27" width="546" height="246" fill="none" stroke="#1f1a14" strokeWidth="1.2" opacity="0.7" />
      {/* cửa sổ trên tường trước */}
      {[120, 300, 480].map((x) => (
        <g key={x}>
          <rect x={x - 34} y="13" width="68" height="18" fill="#e9ddc1" />
          <path d={`M${x - 34} 18 H${x + 34} M${x - 34} 22 H${x + 34} M${x - 34} 26 H${x + 34}`} stroke="#1f1a14" strokeWidth="1.2" />
        </g>
      ))}
      {/* cửa ra vào: chỗ người chơi đứng gác */}
      <rect x="40" y="276" width="62" height="12" fill="#e9ddc1" />
      <path d="M40 282 L40 222 M40 222 A60 60 0 0 1 100 282" fill="none" stroke="#1f1a14" strokeWidth="1.4" strokeDasharray="4 3" />
      <text x="71" y="212" textAnchor="middle" fontSize="15" fontWeight="700" fill="#b3261e" style={{ fontFamily: "var(--font-head), sans-serif", letterSpacing: "0.08em" }}>
        CỬA
      </text>
      {/* bàn dài */}
      <rect x="146" y="122" width="306" height="56" rx="6" fill="url(#dh-wood)" stroke="#2c1a0c" strokeWidth="2.5" />
      <path d="M156 136 C 230 131, 330 141, 442 134 M156 150 C 240 154, 340 146, 442 151 M156 164 C 230 160, 350 168, 442 163" stroke="rgba(30,15,5,0.35)" strokeWidth="1.1" fill="none" />
      {[188, 262, 336, 410].map((x, i) => (
        <rect key={x} x={x - 13} y={i % 2 ? 140 : 132} width="24" height="17" fill="#efe3c4" stroke="rgba(31,26,20,0.5)" strokeWidth="0.8" transform={`rotate(${i % 2 ? 6 : -5} ${x} 145)`} />
      ))}
      {SEATS.map((s, i) => (
        <Seat key={i} n={i + 1} mark={(seats[i] ?? ".") as SeatMark} x={s.x} y={s.y} rot={s.rot} glow={glow} />
      ))}
      <text x="560" y="266" textAnchor="end" fontSize="13" fill="#4b3f31" style={{ fontFamily: "var(--font-text), serif" }}>
        Sơ đồ phòng họp
      </text>
    </svg>
  );
});

function Seat({ n, mark, x, y, rot, glow }: { n: number; mark: SeatMark; x: number; y: number; rot: number; glow: boolean }) {
  const filled = mark !== ".";
  const seatFill = mark === "a" ? "#f4c430" : mark === "e" ? "#f2dc9c" : "rgba(233,221,193,0.6)";
  const backFill = mark === "a" ? "#c98f12" : mark === "e" ? "#d6b45a" : "none";
  const stroke = filled ? "#1f1a14" : "#7a6a52";
  return (
    <g transform={`translate(${x} ${y})`}>
      {filled && glow && <circle r="30" fill="url(#dh-warm)" />}
      <g transform={`rotate(${rot})`}>
        <rect x="-17" y="-21" width="34" height="7" rx="2" fill={backFill} stroke={stroke} strokeWidth="1.8" strokeDasharray={filled ? undefined : "3 3"} />
        <rect x="-16" y="-12" width="32" height="26" rx="4" fill={seatFill} stroke={stroke} strokeWidth="1.8" strokeDasharray={filled ? undefined : "3 3"} />
        {mark === "e" && <rect x="-12" y="-8" width="24" height="18" rx="3" fill="none" stroke="#a07a1c" strokeWidth="1" strokeDasharray="2.5 2" />}
      </g>
      <AnimatePresence>
        {filled && (
          <motion.circle key="pop" r="16" fill="none" stroke="#f4c430" strokeWidth="3" initial={{ scale: 0.6, opacity: 1 }} animate={{ scale: 2.2, opacity: 0 }} transition={{ duration: 0.9, ease: "easeOut" }} />
        )}
      </AnimatePresence>
      <text y="6" textAnchor="middle" fontSize="16" fontWeight="700" fill={filled ? "#1f1a14" : "#7a6a52"} style={{ fontFamily: "var(--font-head), sans-serif" }}>
        {n}
      </text>
    </g>
  );
}

/** Bảng phòng họp (máy tính): sơ đồ 13 ghế, điểm, bộ đếm, nhật ký ở cửa. */
export const HallPanel = memo(function HallPanel({
  seats,
  seated,
  score,
  rightIn,
  rightOut,
  wrong,
  log,
  glow,
  compact,
}: {
  seats: string;
  seated: number;
  score: number;
  rightIn: number;
  rightOut: number;
  wrong: number;
  log: LogItem[];
  glow: boolean;
  compact: boolean;
}) {
  return (
    <div className="sheet relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[2px] px-3 pb-2 pt-2">
      <span aria-hidden className="tape absolute -top-1 right-10 h-5 w-14 rotate-2" />
      <div className="flex items-end justify-between gap-3 border-b-2 border-ink/70 pb-1">
        <div className="min-w-0">
          <div className="label text-ink-3">Phố Quan Công · Ma Cao</div>
          <h3 className={cn("font-head font-bold uppercase leading-none tracking-wide text-ink", compact ? "text-[17px]" : "text-[20px]")}>Phòng họp Đại hội</h3>
        </div>
        <div className="flex shrink-0 items-end gap-3 text-right">
          <div>
            <div className="label text-ink-3">Điểm</div>
            <div className="font-head text-[20px] font-bold leading-none text-ink">{Math.max(0, Math.round(score))}</div>
          </div>
          <div>
            <div className="label text-ink-3">Đại biểu</div>
            <div className="font-head text-[20px] font-bold leading-none text-ink">
              <span className={seated ? "text-olive" : undefined}>{seated}</span>
              <span className="text-ink-3">/{DELEGATES}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="relative mt-1 min-h-0 flex-1">
        <FloorPlan seats={seats} glow={glow} />
      </div>
      <div className="mt-1 grid grid-cols-3 gap-1.5">
        <Counter label="Mời vào đúng" value={rightIn} tone="text-olive" />
        <Counter label="Mời ra đúng" value={rightOut} tone="text-ink" />
        <Counter label="Sai sót" value={wrong} tone="text-stamp" />
      </div>
      {!compact && (
        <ul className="mt-1.5 h-[48px] overflow-hidden font-text text-[12.5px] leading-[16px]">
          {log.slice(0, 3).map((l, i) => (
            <li key={l.id} className={cn("truncate", TONE[l.tone])} style={{ opacity: 1 - i * 0.25 }}>
              {l.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

function Counter({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-baseline justify-between gap-1 rounded-[2px] border border-ink/50 bg-[#efe3c4]/60 px-1.5 py-0.5">
      <span className="label truncate text-[0.62rem] text-ink-2">{label}</span>
      <motion.span key={value} initial={{ scale: 1.35 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600, damping: 18 }} className={cn("font-head text-[20px] font-bold leading-none", tone)}>
        {value}
      </motion.span>
    </div>
  );
}

/** Thanh trên cùng (điện thoại): 13 ô ghế, số đại biểu đã vào và điểm. */
export const HallBar = memo(function HallBar({ seats, seated, score }: { seats: string; seated: number; score: number }) {
  return (
    <div className="sheet flex h-full items-center gap-2 rounded-[2px] px-2">
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="label truncate text-[9.5px] leading-none text-ink-3">Phòng họp · {seated}/{DELEGATES} đại biểu</div>
        <div className="mt-[3px] flex gap-[3px]">
          {Array.from({ length: DELEGATES }, (_, i) => {
            const m = (seats[i] ?? ".") as SeatMark;
            return (
              <span
                key={i}
                className={cn(
                  "grid h-[13px] w-[13px] shrink-0 place-items-center rounded-[3px] border font-head text-[8px] font-bold leading-none",
                  m === "a" && "border-[#7a5a06] bg-gold text-ink",
                  m === "e" && "border-[#a07a1c] bg-[#f2dc9c] text-ink",
                  m === "." && "border-dashed border-ink-3 text-ink-3",
                )}
              >
                {i + 1}
              </span>
            );
          })}
        </div>
      </div>
      <div className="shrink-0 text-right font-head uppercase leading-none">
        <div className="text-[9.5px] font-semibold tracking-wider text-ink-3">Điểm</div>
        <div className="text-[19px] font-bold text-ink">{Math.max(0, Math.round(score))}</div>
      </div>
    </div>
  );
});

/** Màn kết: cửa đã khép, đủ 13 đại biểu, cờ Đảng và dấu mộc "Đại hội khai mạc". */
export function EndOverlay({ end, compact }: { end: DoorEnd; compact: boolean }) {
  return (
    <motion.div key="end" className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center px-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55, duration: 0.4 }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(90% 75% at 50% 42%, rgba(255,215,122,0.28), rgba(10,6,3,0.82))" }} />
      <motion.div
        className="relative"
        initial={{ y: -40, opacity: 0, scale: 0.7, rotate: -4 }}
        animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 170, damping: 15, delay: 0.75 }}
      >
        <PartyFlag width={compact ? 120 : 168} pole={false} className="drop-shadow-[0_10px_14px_rgba(0,0,0,0.5)]" />
      </motion.div>
      <div className="relative -mt-1 flex flex-col items-center">
        <Stamp ink="red" rotate={-6} delay={1.05} className={cn("whitespace-nowrap border-[5px] bg-[#f6eedb]/90 shadow-[0_0_0_4px_rgba(246,238,219,0.55)]", compact ? "text-[30px]" : "text-[46px]")}>
          Đại hội khai mạc
        </Stamp>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.35 }} className="mt-3 flex flex-col items-center gap-1 text-center">
          <span className="font-head text-[12.5px] font-semibold uppercase tracking-[0.16em] text-[#ffd77a] sm:text-[14px]">Ma Cao · 27/3/1935 · đủ 13 đại biểu</span>
          <span className="rounded-[2px] bg-[#1f1a14]/85 px-2.5 py-1 font-text text-[13px] text-cream sm:text-[14.5px]">
            Bạn mời đúng <b>{end.rightIn}/{DELEGATES}</b> đại biểu · mời ra đúng <b>{end.rightOut}/{end.outTotal}</b> người
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
