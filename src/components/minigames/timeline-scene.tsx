"use client";

import { motion } from "motion/react";
import { memo } from "react";
import { Stamp } from "@/components/kit/Stamp";
import { GRAIN, WoodSurface } from "./shared";
import type { TIMELINE_EVENTS } from "@/game/data/minis";

/* Phần vẽ của trò "Bài cho báo Đuốc đưa đường": sạp gỗ trong phòng giam, tờ báo viết tay, mẩu tin giấy xé. */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Một mẩu tin rải trên bàn: sự kiện, ô trong lưới, độ lệch, độ nghiêng, màu giấy, mực hay chì, mép xé. */
export interface SlipLook {
  ev: (typeof TIMELINE_EVENTS)[number];
  cell: number;
  jx: number;
  jy: number;
  rot: number;
  tone: number;
  pencil: boolean;
  clip: string;
}

/** Màu giấy của các mẩu tin: giấy bản, giấy vở, giấy gói, giấy cuốn thuốc lá… */
export const TONES = ["#e9dfc6", "#ddd1b2", "#e6dac0", "#d6cfbd", "#ece3cb", "#d9ccab"];

const INK = "#1d2840";
const PENCIL = "#3c3a36";

/** Sạp gỗ trong phòng giam, vệt nắng lọt qua song sắt cửa sổ. */
export const CellTable = memo(function CellTable() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <WoodSurface seed={31} plank={54} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(16,13,11,0.42), rgba(8,7,6,0.58))" }} />
      <div
        className="absolute"
        style={{
          left: "-18%",
          top: "-35%",
          width: "78%",
          height: "125%",
          transform: "rotate(-24deg)",
          background: "repeating-linear-gradient(90deg, rgba(255,232,182,0.13) 0 40px, rgba(255,232,182,0) 40px 52px)",
          WebkitMaskImage: "radial-gradient(ellipse 55% 48% at 50% 50%, #000 15%, transparent 78%)",
          maskImage: "radial-gradient(ellipse 55% 48% at 50% 50%, #000 15%, transparent 78%)",
        }}
      />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 120% 115% at 38% 35%, transparent 40%, rgba(0,0,0,0.72) 100%)" }} />
    </div>
  );
});

/** Ngọn đuốc vẽ tay bên tên báo. */
function Torch({ flip = false }: { flip?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 20 34" className="h-[1.12em] w-[0.66em] shrink-0" style={{ transform: flip ? "scaleX(-1)" : undefined }}>
      <path d="M8.6 33 L9.2 15.5 L12.4 15.5 L11.6 33 Z" fill="#2a2119" />
      <path d="M6.2 12.6 L14.6 12.6 L13.4 16.6 L7.4 16.6 Z" fill="#1f1a14" />
      <path d="M6.6 14.2 L14.2 14.2" stroke="#e9ddc1" strokeWidth="0.7" opacity="0.5" />
      <path d="M10.4 0.8 C 13.6 4.6, 16.4 7.4, 14.4 11.6 C 13.6 13.2, 7.4 13.4, 6.6 11.4 C 5.4 8.4, 8.2 7.2, 8.6 4.2 C 9.6 5.8, 10.6 6.6, 10.4 0.8 Z" fill="#b3261e" />
      <path d="M10.6 6.2 C 12.2 8.2, 12.8 9.8, 11.8 11.6 C 11.2 12.4, 9 12.4, 8.6 11.4 C 8.2 10, 9.8 9.4, 10.6 6.2 Z" fill="#e0762f" />
    </svg>
  );
}

/** Tên báo "Đuốc đưa đường" kẻ tay, gạch kép bên dưới. */
export function Masthead({ fs, top, torches }: { fs: number; top: number; torches: boolean }) {
  return (
    <>
      <div className="absolute inset-x-0 flex items-center justify-center gap-[0.22em] whitespace-nowrap" style={{ top, fontSize: fs, height: fs * 1.2 }}>
        {torches && <Torch />}
        <span className="font-head font-bold uppercase leading-none tracking-[0.04em] text-ink" style={{ filter: "url(#ink-press)" }}>
          Đuốc đưa đường
        </span>
        {torches && <Torch flip />}
      </div>
      <div className="absolute inset-x-[6%] h-[4px] border-y border-ink/75" style={{ top: top + fs * 1.2 + 2 }} />
    </>
  );
}

/** Mẩu tin giấy xé, chữ viết tay (mực hoặc bút chì). */
export const SlipPaper = memo(function SlipPaper({ look, f, flash }: { look: SlipLook; f: number; flash: number }) {
  return (
    <span className="absolute inset-0 block" style={{ filter: "drop-shadow(0 2px 1.5px rgba(0,0,0,0.55)) drop-shadow(0 6px 7px rgba(0,0,0,0.3))" }}>
      <span className="absolute inset-0 block" style={{ clipPath: look.clip, backgroundColor: TONES[look.tone] }}>
        <span className="absolute inset-0 block opacity-50 mix-blend-multiply" style={{ backgroundImage: GRAIN }} />
        <span className="absolute inset-0 block" style={{ background: "radial-gradient(120% 120% at 50% 40%, transparent 55%, rgba(110,72,30,0.2) 100%)" }} />
        {/* nếp gấp */}
        <span
          className="absolute inset-y-0 left-[58%] block w-px"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0), rgba(60,40,20,0.14) 30%, rgba(60,40,20,0.1) 70%, rgba(0,0,0,0))" }}
        />
        <span className="absolute inset-0 block bg-[#fff6dc] opacity-0 transition-opacity duration-150 group-hover:opacity-20" />
        {flash > 0 && (
          <motion.span
            className="absolute inset-0 block"
            style={{ background: "rgba(200,30,20,0.42)", boxShadow: "inset 0 0 0 3px rgba(200,30,20,0.9)" }}
            initial={{ opacity: 1 }}
            animate={{ opacity: [1, 0.3, 0.85, 0] }}
            transition={{ duration: 0.7, times: [0, 0.25, 0.45, 1] }}
          />
        )}
      </span>
      <span className="absolute inset-0 flex items-center" style={{ fontSize: f, padding: `${0.6 * f}px ${0.7 * f}px` }}>
        <span
          className="block font-text italic leading-[1.24]"
          style={{ color: look.pencil ? PENCIL : INK, opacity: look.pencil ? 0.9 : 0.95, textWrap: "pretty" as React.CSSProperties["textWrap"] }}
        >
          {look.ev.text}
        </span>
      </span>
    </span>
  );
});

/* ───────────────────────────── Ô trên tờ báo ───────────────────────────── */

/** Cỡ chữ con dấu ngày tháng cho vừa ô; ngày dài (Đầu năm 1930) thì xuống hai dòng khi ô hẹp. */
function stampFit(date: string, w: number, h: number, base: number) {
  const unit = 0.56;
  const one = (w - 12) / (date.length * unit + 1.1);
  if (one >= Math.min(base, 10) || !date.includes(" ")) return { fs: Math.max(7.5, Math.min(base, one, (h - 6) / 1.45)), lines: [date] };
  const i = date.lastIndexOf(" ");
  const lines = [date.slice(0, i), date.slice(i + 1)];
  const longest = Math.max(...lines.map((l) => l.length));
  return { fs: Math.max(7.5, Math.min(base, (w - 12) / (longest * unit + 1.1), (h - 6) / 2.5)), lines };
}

function DateStamp({ date, w, h, base, delay, bare = false }: { date: string; w: number; h: number; base: number; delay: number; bare?: boolean }) {
  if (bare) {
    // Ô rất hẹp: chỉ in chữ ngày tháng bằng mực đỏ, không viền, để chữ đủ to mà đọc.
    const unit = 0.5;
    const one = (w - 4) / (date.length * unit);
    const split = date.includes(" ") && one < 10.5;
    const parts = split ? [date.slice(0, date.lastIndexOf(" ")), date.slice(date.lastIndexOf(" ") + 1)] : [date];
    const longest = Math.max(...parts.map((l) => l.length));
    const fs = Math.max(8.5, Math.min(13, (w - 4) / (longest * unit), (h - 4) / (parts.length * 1.08)));
    return (
      <Stamp ink="red" rotate={-6} delay={delay} className="border-0 p-0 text-center leading-[1.04] tracking-[0.02em]">
        <span className="block whitespace-nowrap" style={{ fontSize: fs }}>
          {parts.map((l, j) => (
            <span key={j} className="block">
              {l}
            </span>
          ))}
        </span>
      </Stamp>
    );
  }
  const { fs, lines } = stampFit(date, w, h, base);
  return (
    <Stamp ink="red" rotate={-5} delay={delay} className={fs < 11 ? "border-2 text-center leading-[1.05]" : "text-center leading-[1.05]"}>
      <span className="block whitespace-nowrap" style={{ fontSize: fs }}>
        {lines.map((l, j) => (
          <span key={j} className="block">
            {l}
          </span>
        ))}
      </span>
    </Stamp>
  );
}

/** Mẩu tin đã dán vào bài: giấy thu nhỏ, chữ nhỏ (nếu đủ chỗ), dấu ngày tháng đóng đè lên. */
function MiniSlip({ look, fs, lines, padRight }: { look: SlipLook; fs: number; lines: number; padRight: number }) {
  return (
    <span className="absolute inset-0 block" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.4))" }}>
      <span className="absolute inset-0 block" style={{ clipPath: look.clip, backgroundColor: TONES[look.tone] }}>
        <span className="absolute inset-0 block opacity-45 mix-blend-multiply" style={{ backgroundImage: GRAIN }} />
      </span>
      {lines > 0 && (
        <span className="absolute inset-0 flex items-center" style={{ padding: `0 ${padRight}px 0 ${fs * 0.6}px` }}>
          <span
            className="block overflow-hidden font-text italic leading-[1.2]"
            style={{
              fontSize: fs,
              color: look.pencil ? PENCIL : INK,
              display: "-webkit-box",
              WebkitLineClamp: lines,
              WebkitBoxOrient: "vertical",
            }}
          >
            {look.ev.text}
          </span>
        </span>
      )}
    </span>
  );
}

export function Slot({ r, k, mode, state, look, rot }: { r: Rect; k: number; mode: "row" | "grid" | "strip"; state: "empty" | "next" | "filled"; look?: SlipLook; rot: number }) {
  const row = mode === "row";
  const nw = row ? Math.round(Math.max(15, Math.min(24, r.h * 0.5))) : 0;
  const boxW = r.w - nw - (row ? 3 : 0);
  const stampBase = row ? Math.max(10, Math.min(15, r.h * 0.3)) : Math.max(9, Math.min(13.5, r.h * 0.3));
  const stampW = look ? Math.min(boxW * 0.55, look.ev.date.length * 0.56 * stampBase + 1.1 * stampBase + 10) : 0;
  const textFs = Math.max(9, Math.min(12, r.h * 0.23));
  const textLines = row && r.h >= 30 ? (r.h >= 40 ? 2 : 1) : 0;
  return (
    <div className="pointer-events-none absolute" data-slot={k} data-filled={state === "filled" ? 1 : 0} style={{ left: r.x, top: r.y, width: r.w, height: r.h, zIndex: 30 }}>
      {row && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 text-right font-head font-bold leading-none text-ink-2"
          style={{ width: nw - 3, fontSize: Math.min(17, nw * 0.78) }}
        >
          {k + 1}.
        </span>
      )}
      <div className="absolute inset-y-[2px] right-0" style={{ left: row ? nw + 3 : 0 }}>
        {state !== "filled" && (
          <motion.div
            className="absolute inset-0 grid place-items-center rounded-[2px] border-[1.5px] border-dashed"
            style={{ borderColor: state === "next" ? "rgba(179,38,30,0.75)" : "rgba(75,63,49,0.4)" }}
            animate={state === "next" ? { opacity: [1, 0.45, 1] } : { opacity: 1 }}
            transition={state === "next" ? { duration: 1.3, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
          >
            {!row && (
              <span
                className="font-head font-bold leading-none"
                style={{ fontSize: Math.min(20, r.h * 0.5), color: state === "next" ? "rgba(179,38,30,0.6)" : "rgba(75,63,49,0.35)" }}
              >
                {k + 1}
              </span>
            )}
          </motion.div>
        )}
        {state === "filled" && look && (
          <motion.div
            className="absolute inset-0"
            style={{ rotate: `${rot * (row ? 0.4 : 1)}deg` }}
            initial={{ opacity: 0, scale: 1.12 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.26, duration: 0.14, ease: "easeOut" }}
          >
            <MiniSlip look={look} fs={textFs} lines={textLines} padRight={stampW + 4} />
            <div className={row ? "absolute right-[3px] top-1/2 -translate-y-1/2" : "absolute inset-0 grid place-items-center"}>
              <DateStamp date={look.ev.date} w={row ? stampW : r.w} h={r.h - 4} base={stampBase} delay={0.34} bare={mode === "strip"} />
            </div>
            {!row && (
              <span className="absolute left-[3px] top-[2px] font-head font-bold leading-none text-ink-2" style={{ fontSize: Math.max(8.5, Math.min(11, r.h * 0.26)) }}>
                {k + 1}
              </span>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
