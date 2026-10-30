"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { MAP_H, MAP_W, MapStage, OldMap } from "./OldMap";

/*
 * "Đêm vây ráp": tám cơ sở trên bản đồ Hà Nội năm 1929. Lần lượt từng cơ sở bị mật thám để ý (nhấp nháy đỏ, đèn pha quét tới).
 * Chạm kịp thì cơ sở rút vào bí mật (cứu được); để quá hạn thì bị phá. Chạm nhầm cơ sở an toàn là đánh động.
 * Điểm = tỉ lệ cứu được × 1000 − 60 mỗi lần chạm nhầm.
 */

interface Props {
  seconds: number;
  startedAt: number;
  onFinish: (score: number) => void;
}

/** Tám cơ sở bí mật, mỗi nơi núp dưới một vỏ bọc buôn bán; vị trí đặt trên các khu nhà của bản đồ Hà Nội 1929. */
const BASES = [
  { x: 190, y: 175, name: "Hiệu may" },
  { x: 390, y: 95, name: "Hiệu thuốc bắc" },
  { x: 760, y: 175, name: "Nhà trọ" },
  { x: 640, y: 130, name: "Hiệu sách" },
  { x: 380, y: 330, name: "Quán nước" },
  { x: 740, y: 470, name: "Hiệu ảnh" },
  { x: 150, y: 380, name: "Xưởng mộc" },
  { x: 600, y: 545, name: "Hiệu giặt" },
];

type State = "safe" | "watched" | "saved" | "raided";
const WINDOW = 2900;
const EVENTS = 8;

export function Protect({ seconds, startedAt, onFinish }: Props) {
  const [states, setStates] = useState<State[]>(() => BASES.map(() => "safe"));
  const [wrong, setWrong] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);
  const done = useRef(false);
  const statesRef = useRef(states);
  const wrongRef = useRef(0);
  const deadline = useRef<Record<number, number>>({});

  useEffect(() => {
    statesRef.current = states;
  }, [states]);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    const s = statesRef.current;
    const saved = s.filter((v) => v === "saved").length;
    const shown = s.filter((v) => v !== "safe").length || 1;
    onFinish(Math.max(0, Math.min(1000, Math.round((saved / Math.max(shown, EVENTS * 0.75)) * 1000) - wrongRef.current * 60)));
  };

  // Lịch các lần bị để ý: rải đều trong thời gian chơi, không trùng cơ sở đang bị để ý.
  useEffect(() => {
    const total = seconds * 1000;
    const span = total - WINDOW - 600;
    const order = BASES.map((_, i) => i).sort(() => Math.random() - 0.5);
    const timers: number[] = [];
    for (let k = 0; k < EVENTS; k++) {
      const at = 500 + (span / (EVENTS - 1)) * k + (Math.random() - 0.5) * 300;
      const i = order[k % order.length];
      const delay = Math.max(0, startedAt + at - Date.now());
      timers.push(
        window.setTimeout(() => {
          setStates((s) => s.map((v, j) => (j === i ? "watched" : v)));
          deadline.current[i] = Date.now() + WINDOW;
          timers.push(
            window.setTimeout(() => {
              setStates((s) => s.map((v, j) => (j === i && v === "watched" ? "raided" : v)));
            }, WINDOW),
          );
        }, delay),
      );
    }
    const end = window.setTimeout(() => finish(), Math.max(0, startedAt + total - Date.now()));
    timers.push(end);
    return () => timers.forEach((t) => clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, seconds]);

  const tap = (i: number) => {
    if (done.current) return;
    const v = statesRef.current[i];
    if (v === "watched") {
      setStates((s) => s.map((x, j) => (j === i ? "saved" : x)));
    } else if (v === "safe") {
      wrongRef.current += 1;
      setWrong(wrongRef.current);
      setFlash(i);
      setTimeout(() => setFlash(null), 500);
    }
  };

  const saved = states.filter((v) => v === "saved").length;
  const raided = states.filter((v) => v === "raided").length;
  const watched = states.map((v, i) => (v === "watched" ? i : -1)).filter((i) => i >= 0);

  return (
    <div className="absolute inset-0 select-none overflow-hidden">
      <MapStage>
      <OldMap night />
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="beam-g" cx="0" cy="0" r="1">
            <stop offset="0" stopColor="#fff4cf" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff4cf" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Đèn pha quét từ hai góc về phía cơ sở đang bị để ý */}
        {watched.map((i) => {
          const b = BASES[i];
          const from = b.x < MAP_W / 2 ? { x: -40, y: -40 } : { x: MAP_W + 40, y: -40 };
          const ang = (Math.atan2(b.y - from.y, b.x - from.x) * 180) / Math.PI;
          const len = Math.hypot(b.x - from.x, b.y - from.y) + 60;
          return (
            <motion.polygon
              key={`beam-${i}`}
              points={`0,0 ${len},-70 ${len},70`}
              fill="url(#beam-g)"
              transform={`translate(${from.x},${from.y}) rotate(${ang})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.9, 0.7, 1] }}
              transition={{ duration: WINDOW / 1000, ease: "linear" }}
              style={{ mixBlendMode: "screen" }}
            />
          );
        })}
      </svg>
      {BASES.map((b, i) => {
        const v = states[i];
        return (
          <button
            key={b.name}
            onPointerDown={() => tap(i)}
            aria-label={`Cơ sở ${b.name}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 touch-manipulation p-2"
            style={{ left: `${(b.x / MAP_W) * 100}%`, top: `${(b.y / MAP_H) * 100}%` }}
          >
            <span
              className={cn(
                "relative grid h-11 w-11 place-items-center rounded-full border-[3px] font-head text-[13px] font-bold shadow-[0_4px_10px_rgba(0,0,0,0.6)] transition sm:h-12 sm:w-12",
                v === "safe" && "border-[#d9c9a3] bg-[#3a2a1c] text-[#e9ddc1]",
                v === "watched" && "border-stamp bg-[#5c120d] text-cream",
                v === "saved" && "border-olive bg-[#203a1c] text-cream",
                v === "raided" && "border-black bg-[#2a0d0a] text-[#d9a8a0]",
                flash === i && "animate-[shake_0.3s]",
              )}
            >
              {v === "watched" && <span className="absolute inset-[-8px] animate-ping rounded-full border-2 border-stamp" />}
              {v === "saved" ? "✓" : v === "raided" ? "✕" : i + 1}
            </span>
            <span className="mt-0.5 hidden whitespace-nowrap text-center font-type text-[10px] font-bold text-[#f1e7d0] [text-shadow:0_1px_2px_#000] sm:block">{b.name}</span>
          </button>
        );
      })}
      <AnimatePresence>
        {states.map((v, i) =>
          v === "raided" ? (
            <motion.span
              key={`stamp-${i}`}
              initial={{ opacity: 0, scale: 2.2, rotate: -14 }}
              animate={{ opacity: 0.9, scale: 1, rotate: -9 }}
              className="stamp pointer-events-none absolute -translate-x-1/2 text-[13px] text-[#e2483c] mix-blend-normal"
              style={{ left: `${(BASES[i].x / MAP_W) * 100}%`, top: `calc(${(BASES[i].y / MAP_H) * 100}% - 46px)` }}
            >
              Bị phá
            </motion.span>
          ) : null,
        )}
      </AnimatePresence>
      </MapStage>
      <div className="pointer-events-none absolute left-2 top-2 flex gap-2 font-head text-[13px] font-semibold uppercase tracking-wide">
        <span className="rounded-[2px] bg-[#203a1c]/90 px-2 py-1 text-cream">Cứu được {saved}</span>
        <span className="rounded-[2px] bg-[#5c120d]/90 px-2 py-1 text-cream">Bị phá {raided}</span>
        {wrong > 0 && <span className="rounded-[2px] bg-black/70 px-2 py-1 text-[#e9ddc1]">Đánh động {wrong}</span>}
      </div>
    </div>
  );
}
