"use client";

import { motion } from "motion/react";
import { memo } from "react";
import { DELEGATES } from "@/game/data/minis";
import { PartyFlag } from "@/components/kit/PartyFlag";
import { Stamp } from "@/components/kit/Stamp";
import { cn } from "@/lib/cn";

/*
 * Thanh 13 ghế của phòng họp Đại hội và màn kết của trò "Gác cửa hội trường".
 * Ghế vàng: người chơi mời đúng đại biểu vào; vàng nhạt: đại biểu đã vào từ trước, hoặc được đồng chí phụ trách đón vào
 * (khi hết giờ). Kết thúc: luôn đủ 13 ghế, dấu mộc "Đại hội khai mạc" và cờ Đảng.
 */

/** Trạng thái ghế: còn trống · người chơi mời vào · đã vào từ trước / đồng chí phụ trách đón vào. */
export type SeatMark = "." | "a" | "e";



/** Thanh 13 ô ghế của phòng họp, số đại biểu đã vào và điểm. `compact`: ô nhỏ, không đánh số (khung hẹp trên điện thoại). */
export const HallBar = memo(function HallBar({ seats, seated, score, compact = false }: { seats: string; seated: number; score: number; compact?: boolean }) {
  return (
    <div className={cn("sheet flex h-full items-center rounded-[2px]", compact ? "gap-1.5 px-1.5" : "gap-2 px-2")}>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className={cn("label truncate leading-none text-ink-3", compact ? "text-[8.5px]" : "text-[9.5px]")}>
          {compact ? "" : "Phòng họp · "}
          {seated}/{DELEGATES} đại biểu
        </div>
        <div className={cn("flex", compact ? "mt-[3px] gap-[2px]" : "mt-[3px] gap-[3px]")}>
          {Array.from({ length: DELEGATES }, (_, i) => {
            const m = (seats[i] ?? ".") as SeatMark;
            return (
              <span
                key={i}
                className={cn(
                  "grid shrink-0 place-items-center rounded-[2px] border font-head font-bold leading-none",
                  compact ? "h-[9px] w-[7px] text-[0px]" : "h-[13px] w-[13px] text-[8px]",
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
        <div className={cn("font-semibold tracking-wider text-ink-3", compact ? "text-[8.5px]" : "text-[9.5px]")}>Điểm</div>
        <div className={cn("font-bold text-ink", compact ? "text-[16px]" : "text-[19px]")}>{Math.max(0, Math.round(score))}</div>
      </div>
    </div>
  );
});

/** Màn kết: cửa đã khép, đủ 13 đại biểu, cờ Đảng và dấu mộc "Đại hội khai mạc". */
export function EndOverlay({ summary, compact }: { summary: React.ReactNode; compact: boolean }) {
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
          <span className="rounded-[2px] bg-[#1f1a14]/85 px-2.5 py-1 font-text text-[13px] text-cream sm:text-[14.5px]">{summary}</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
