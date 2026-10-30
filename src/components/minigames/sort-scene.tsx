"use client";

import { AnimatePresence, motion } from "motion/react";
import { memo, useId } from "react";
import { Stamp } from "@/components/kit/Stamp";
import { GRAIN, WoodSurface } from "./shared";

/* Phần vẽ của trò "Sắc lệnh của Xô viết": vách ván đình làng, bảng yết thị có mái ngói, tờ yết thị giấy dó. */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BoardLay extends Rect {
  roof: number;
  plank: number;
  frame: number;
  panel: Rect;
}

/* ───────────────────────────── Vách đình và bậc gỗ ───────────────────────────── */

/** Vách ván gỗ lim sẫm màu, xà ngang phía trên, hai cột sơn then ở hai mép. */
export const DinhWall = memo(function DinhWall({ h, p }: { h: number; p: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const beam = Math.max(5, p - 3);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden" style={{ height: h }}>
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <filter id={`wv${uid}`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.11 0.0038" numOctaves="4" seed="6" result="t" />
            <feColorMatrix in="t" type="matrix" values="0.44 0 0 0 0.09  0.22 0 0 0 0.045  0.1 0 0 0 0.02  0 0 0 0 1" result="c" />
            <feTurbulence type="fractalNoise" baseFrequency="0.9 0.025" numOctaves="2" seed="9" result="f" />
            <feColorMatrix in="f" type="matrix" values="0 0 0 0 0.04  0 0 0 0 0.02  0 0 0 0 0.01  0 0 0 1.5 -0.66" result="fl" />
            <feComposite in="fl" in2="c" operator="over" />
          </filter>
          <pattern id={`pl${uid}`} width="176" height="20" patternUnits="userSpaceOnUse">
            <rect x="44" width="44" height="20" fill="rgba(0,0,0,0.16)" />
            <rect x="132" width="44" height="20" fill="rgba(70,30,8,0.14)" />
            {[0, 44, 88, 132].map((x) => (
              <g key={x}>
                <rect x={x} width="2" height="20" fill="rgba(0,0,0,0.62)" />
                <rect x={x + 2} width="1" height="20" fill="rgba(255,210,150,0.07)" />
              </g>
            ))}
          </pattern>
        </defs>
        <rect width="100%" height="100%" filter={`url(#wv${uid})`} />
        <rect width="100%" height="100%" fill={`url(#pl${uid})`} />
      </svg>
      {/* ánh sáng ban ngày hắt từ sân đình vào, góc tối hơn */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 75% 85% at 50% 60%, rgba(255,200,140,0.16), transparent 70%)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 120% 120% at 50% 55%, transparent 50%, rgba(0,0,0,0.55) 100%)" }} />
      {/* xà ngang */}
      <div
        className="absolute inset-x-0 top-0"
        style={{ height: beam, background: "linear-gradient(180deg, #1c0f07, #3a2010 70%, #120904)", boxShadow: "0 3px 6px rgba(0,0,0,0.6)" }}
      />
      {/* hai cột sơn then ở mép vách */}
      {["left", "right"].map((side) => (
        <div
          key={side}
          className="absolute top-0 bottom-0"
          style={{
            [side]: -7,
            width: p + 9,
            background: "linear-gradient(90deg, #120704, #4a1f10 32%, #6a2e18 46%, #3a170b 66%, #0e0503)",
            boxShadow: side === "left" ? "4px 0 8px rgba(0,0,0,0.55)" : "-4px 0 8px rgba(0,0,0,0.55)",
          }}
        />
      ))}
    </div>
  );
});

/** Bậc gỗ trước vách, nơi đặt chồng yết thị. */
export const Bench = memo(function Bench({ top }: { top: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute -bottom-2 -left-2 -right-2 overflow-hidden" style={{ top }}>
      <WoodSurface seed={13} plank={46} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 120% at 50% 0%, rgba(255,205,140,0.24), transparent 70%)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 120% 160% at 50% 0%, transparent 45%, rgba(0,0,0,0.6) 100%)" }} />
      {/* ngưỡng gỗ chân vách và bóng đổ xuống bậc */}
      <div className="absolute inset-x-0 top-0 h-[7px]" style={{ background: "linear-gradient(180deg, #2a160a, #4a2a14 60%, #1a0d05)" }} />
      <div className="absolute inset-x-0 top-[7px] h-5" style={{ background: "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0))" }} />
    </div>
  );
});

/* ───────────────────────────── Bảng yết thị ───────────────────────────── */

/** Mái ngói nhỏ che bảng, hai đầu đao cong lên kiểu mái đình. */
function Roof({ w, h }: { w: number; h: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ov = Math.round(h * 0.75);
  const W = w + ov * 2;
  const H = h + 2;
  const eave = `M0,${H * 0.28} Q${ov * 0.55},${H} ${ov * 1.6},${H - 0.5} L${W - ov * 1.6},${H - 0.5} Q${W - ov * 0.55},${H} ${W},${H * 0.28} L${W - ov * 1.3},${H * 0.2} L${ov * 1.3},${H * 0.2} Z`;
  const tip = Math.max(1.6, H * 0.15);
  return (
    <svg aria-hidden className="pointer-events-none absolute overflow-visible" style={{ left: -ov, top: 0 }} width={W} height={H}>
      <defs>
        <pattern id={`t${uid}`} width="6" height={H} patternUnits="userSpaceOnUse">
          <rect width="6" height={H} fill="#6e301a" />
          <rect width="2.8" height={H} fill="#934827" />
          <rect x="2.8" width="0.9" height={H} fill="rgba(0,0,0,0.4)" />
        </pattern>
        <linearGradient id={`s${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.45" />
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <path d={eave} fill={`url(#t${uid})`} />
      <path d={eave} fill={`url(#s${uid})`} />
      <path
        d={`M0,${H * 0.28} Q${ov * 0.55},${H} ${ov * 1.6},${H - 0.5} L${W - ov * 1.6},${H - 0.5} Q${W - ov * 0.55},${H} ${W},${H * 0.28}`}
        stroke="#2a1208"
        strokeWidth="1.3"
        fill="none"
      />
      {/* bờ nóc và hai đầu đao */}
      <rect x={ov * 1.15} y={0} width={W - ov * 2.3} height={Math.max(2.5, H * 0.24)} rx={1} fill="#3b1a0c" />
      <rect x={ov * 1.15} y={0} width={W - ov * 2.3} height={1} fill="rgba(255,205,150,0.28)" />
      <path d={`M${ov * 1.3},${H * 0.12} Q${ov * 0.55},${H * 0.12} ${ov * 0.12},${-H * 0.32}`} stroke="#3b1a0c" strokeWidth={tip} fill="none" strokeLinecap="round" />
      <path d={`M${W - ov * 1.3},${H * 0.12} Q${W - ov * 0.55},${H * 0.12} ${W - ov * 0.12},${-H * 0.32}`} stroke="#3b1a0c" strokeWidth={tip} fill="none" strokeLinecap="round" />
    </svg>
  );
}

const PLANK_BG = "linear-gradient(180deg, #2f1d11 0%, #20130a 55%, #170d06 100%)";
const FRAME_BG = "linear-gradient(180deg, #55331b 0%, #3e2512 50%, #2c190b 100%)";
const PANEL_BG =
  "repeating-linear-gradient(90deg, rgba(0,0,0,0) 0 21px, rgba(0,0,0,0.28) 21px 22px, rgba(255,220,170,0.06) 22px 23px), linear-gradient(180deg, #7a5230 0%, #6a4426 60%, #5b3920 100%)";

export const Board = memo(function Board({
  b,
  i,
  name,
  count,
  titleFs,
  hot,
  flash,
  live,
  onPick,
}: {
  b: BoardLay;
  i: number;
  name: string;
  count: number;
  titleFs: number;
  hot: boolean;
  /** Số lần chớp đỏ (đổi số thì chớp lại); 0 là không chớp. */
  flash: number;
  live: boolean;
  onPick: (i: number) => void;
}) {
  const badge = Math.round(Math.max(18, Math.min(26, b.w * 0.13)));
  return (
    <button
      type="button"
      data-board={i}
      data-board-name={name}
      data-count={count}
      aria-label={`Bảng ${name} (phím ${i + 1}), đã dán ${count} tờ`}
      onClick={() => onPick(i)}
      className="group absolute touch-manipulation rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-gold/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2a170c]"
      style={{ left: b.x, top: b.y, width: b.w, height: b.h, zIndex: 10, cursor: live ? "pointer" : "default" }}
    >
      {/* bóng bảng đổ lên vách */}
      <span aria-hidden className="absolute rounded-[3px]" style={{ left: 4, right: -4, top: b.roof + 6, bottom: -7, background: "rgba(0,0,0,0.5)", filter: "blur(5px)" }} />
      <Roof w={b.w} h={b.roof} />
      {/* biển tên sơn then chữ vàng */}
      <span
        className="absolute inset-x-[2px] flex items-center justify-center rounded-[2px] px-[5px] text-center"
        style={{
          top: b.roof - 1,
          height: b.plank,
          background: PLANK_BG,
          boxShadow: "inset 0 0 0 1px rgba(214,170,90,0.4), inset 0 0 0 3px rgba(0,0,0,0.35), 0 2px 3px rgba(0,0,0,0.6)",
        }}
      >
        <span
          className="text-balance font-head font-semibold uppercase leading-[1.08] tracking-[0.1em]"
          style={{ fontSize: titleFs, color: "#e8c46e", textShadow: "0 1px 0 rgba(0,0,0,0.75)" }}
        >
          {name.replace(" – ", " – ")}
        </span>
      </span>
      {/* khung và mặt bảng */}
      <span
        className="absolute inset-x-0 bottom-0 rounded-[2px]"
        style={{
          top: b.roof + b.plank - 2,
          background: FRAME_BG,
          boxShadow: "inset 0 1px 0 rgba(255,215,160,0.25), inset 0 -2px 0 rgba(0,0,0,0.5), 0 3px 4px rgba(0,0,0,0.55)",
        }}
      >
        <span
          className="absolute overflow-hidden rounded-[1px]"
          style={{ inset: b.frame, background: PANEL_BG, boxShadow: "inset 0 3px 7px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(0,0,0,0.5)" }}
        >
          <span className="absolute inset-0 opacity-40 mix-blend-multiply" style={{ backgroundImage: GRAIN }} />
          <span className="absolute inset-0 bg-[#ffe1a6] opacity-0 transition-opacity duration-150 group-hover:opacity-[0.09] group-active:opacity-[0.14]" />
          <span
            className="absolute inset-0 transition-opacity duration-100"
            style={{ opacity: hot ? 1 : 0, background: "rgba(255,214,120,0.16)", boxShadow: "inset 0 0 0 2px rgba(244,196,48,0.85), inset 0 0 18px rgba(244,196,48,0.45)" }}
          />
          {flash > 0 && (
            <motion.span
              key={flash}
              className="absolute inset-0"
              style={{ background: "rgba(200,30,20,0.5)", boxShadow: "inset 0 0 0 3px rgba(230,50,35,0.95)" }}
              initial={{ opacity: 1 }}
              animate={{ opacity: [1, 0.35, 0.9, 0] }}
              transition={{ duration: 0.8, times: [0, 0.25, 0.45, 1] }}
            />
          )}
        </span>
        {/* số phím bấm khắc ở góc khung (chỉ hiện khi có chuột) */}
        <span
          aria-hidden
          className="absolute hidden font-head font-semibold leading-none [@media(pointer:fine)]:block"
          style={{ left: b.frame + 3, bottom: b.frame + 3, fontSize: 10, color: "rgba(232,196,110,0.75)", textShadow: "0 1px 0 rgba(0,0,0,0.8)" }}
        >
          {i + 1}
        </span>
      </span>
      {/* thẻ đếm số tờ đã dán */}
      <motion.span
        key={count}
        aria-hidden
        className="sheet absolute grid place-items-center rounded-full font-head font-bold leading-none text-ink"
        style={{ right: -5, top: b.roof + b.plank - 6, width: badge, height: badge, fontSize: badge * 0.56, zIndex: 30, boxShadow: "0 2px 4px rgba(0,0,0,0.7)" }}
        initial={{ scale: count ? 1.6 : 1 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 520, damping: 16, delay: count ? 0.38 : 0 }}
      >
        {count}
      </motion.span>
      {/* dán nhầm: dấu đỏ đóng giữa bảng */}
      <AnimatePresence>
        {flash > 0 && (
          <motion.span
            key={flash}
            className="pointer-events-none absolute inset-x-0 grid place-items-center"
            style={{ top: b.panel.y - b.y, height: b.panel.h, zIndex: 40 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <Stamp ink="red" rotate={-9} className="whitespace-nowrap border-[3px] bg-[#f1e7d0]/90 text-[#b3261e] mix-blend-normal">
              <span style={{ fontSize: Math.round(Math.max(13, Math.min(22, b.w * 0.115))) }}>Dán nhầm</span>
            </Stamp>
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
});

/* ───────────────────────────── Tờ yết thị giấy dó ───────────────────────────── */

const DECKLE =
  "polygon(0.6% 1.4%, 17% 0.3%, 36% 1.1%, 54% 0.2%, 75% 1%, 99.3% 0.4%, 99.8% 23%, 99.2% 50%, 99.9% 76%, 99.3% 99.1%, 81% 99.8%, 61% 99%, 39% 99.9%, 19% 99.1%, 0.5% 99.7%, 1% 75%, 0.2% 49%, 0.9% 24%)";

export const SheetFace = memo(function SheetFace({ text, f, posted = false, lifted = false }: { text: string; f: number; posted?: boolean; lifted?: boolean }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        fontSize: f,
        filter: lifted
          ? "drop-shadow(0 14px 12px rgba(0,0,0,0.45)) drop-shadow(0 3px 3px rgba(0,0,0,0.35))"
          : posted
            ? "drop-shadow(0 3px 2px rgba(0,0,0,0.55))"
            : "drop-shadow(0 2px 1.5px rgba(0,0,0,0.5)) drop-shadow(0 7px 8px rgba(0,0,0,0.28))",
      }}
    >
      <div className="sheet absolute inset-0" style={{ clipPath: DECKLE, boxShadow: "none" }}>
        <div className="absolute inset-0" style={{ background: "rgba(250,245,231,0.5)" }} />
        <div className="absolute inset-0 opacity-45 mix-blend-multiply" style={{ backgroundImage: GRAIN }} />
      </div>
      <div className="relative flex h-full flex-col items-center px-[0.9em] pb-[0.75em] pt-[0.7em] text-center">
        <div className="font-head text-[0.82em] font-bold uppercase leading-none tracking-[0.34em] text-[#2a1d14]">Yết thị</div>
        <div className="mt-[0.35em] h-[0.26em] w-[36%] border-y border-[#2a1d14]/80" />
        <div className="flex w-full flex-1 items-center justify-center pt-[0.4em]">
          <p className="text-balance font-text text-[1em] leading-[1.3] text-[#231a12]">{text}</p>
        </div>
      </div>
      <Seal />
    </div>
  );
});

/** Dấu son của nông hội, khắc chìm, đóng ở góc trên tờ yết thị. */
function Seal() {
  return (
    <div
      aria-hidden
      className="absolute right-[0.7em] top-[0.45em] h-[2.25em] w-[2.25em]"
      style={{ rotate: "6deg", filter: "url(#rough-ink)", mixBlendMode: "multiply", opacity: 0.88 }}
    >
      <div className="h-full w-full rounded-[0.14em] border-[0.09em] border-[#b3261e] p-[0.1em]">
        <div className="grid h-full w-full place-items-center rounded-[0.08em] bg-[#b3261e]">
          <span className="text-center font-head text-[0.6em] font-bold uppercase leading-[1.02] tracking-[0.03em] text-[#f3e7cc]">
            Nông
            <br />
            hội
          </span>
        </div>
      </div>
    </div>
  );
}

/** Đinh ghim đầu đồng, cắm xuống khi tờ giấy chạm bảng. */
export function Tack({ delay }: { delay: number }) {
  return (
    <motion.span
      aria-hidden
      className="absolute left-[21%] top-[0.22em] block h-[1.05em] w-[1.05em] rounded-full"
      style={{
        background: "radial-gradient(circle at 34% 30%, #fff1c4, #c49a45 42%, #5c3f12 100%)",
        boxShadow: "0 0.14em 0.22em rgba(0,0,0,0.65)",
      }}
      initial={{ opacity: 0, scale: 2.2 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.16, ease: "easeIn" }}
    />
  );
}

/** Chồng yết thị chưa dán (mặt sau, chỉ thấy nét mực thấm qua giấy). */
export const Pile = memo(function Pile({ r, n, f }: { r: Rect; n: number; f: number }) {
  if (n <= 0) return null;
  const layers = Math.min(n, 6);
  return (
    <div aria-hidden className="pointer-events-none absolute" style={{ left: r.x, top: r.y, width: r.w, height: r.h, rotate: "-3deg", zIndex: 24, fontSize: f }}>
      <div className="absolute rounded-[2px]" style={{ left: 6, right: -6, top: 10, bottom: -8 - layers, background: "rgba(0,0,0,0.5)", filter: "blur(5px)" }} />
      {Array.from({ length: layers }, (_, k) => {
        const depth = layers - 1 - k;
        return (
          <div
            key={k}
            className="sheet absolute inset-0"
            style={{
              clipPath: DECKLE,
              boxShadow: "none",
              transform: `translate(${-depth * 1.1}px, ${depth * 1.7}px) rotate(${(depth % 2 ? -1 : 1) * depth * 0.5}deg)`,
              filter: `brightness(${1 - depth * 0.05})`,
            }}
          >
            <div className="absolute inset-0" style={{ background: "rgba(250,245,231,0.42)" }} />
            {k === layers - 1 && (
              <div className="absolute inset-x-[16%] top-[30%] space-y-[0.55em] opacity-[0.13]">
                {[1, 0.86, 0.94].map((w, j) => (
                  <div key={j} className="h-[0.32em] rounded-full bg-[#2a1d14]" style={{ width: `${w * 100}%`, marginLeft: `${(1 - w) * 50}%` }} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
