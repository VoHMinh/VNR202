"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { MAP_H, MAP_W, MapStage, OldMap } from "./OldMap";

/*
 * "Vượt vòng vây": đưa người giao liên (chấm đỏ) băng qua phố trong đêm tới căn nhà có ngọn đèn.
 * Kéo ở bất kỳ đâu trên bản đồ để di chuyển (như bàn di chuột, ngón tay không che chấm đỏ).
 * Đèn pha của lính tuần quét qua lại; lọt vào vùng sáng thì bị phát hiện, phải lùi về chặng an toàn gần nhất.
 * Tới nơi: điểm = 1000 − 400 × thời gian/thời gian cho phép − 150 × số lần bị phát hiện (tối thiểu 500).
 * Hết giờ chưa tới: tối đa 400 điểm theo quãng đường đã đi.
 */

interface Props {
  seconds: number;
  startedAt: number;
  onFinish: (score: number) => void;
}

const START = { x: 70, y: 590 };
const GOAL = { x: 930, y: 70 };
const CHECKPOINTS = [START, { x: 380, y: 520 }, { x: 700, y: 210 }];
const SPEED = 0.62; // đơn vị bản đồ trên mỗi đơn vị kéo
const R_LIGHT = 74;

/** Đèn pha: di chuyển qua lại giữa hai điểm theo hình sin. */
const LIGHTS = [
  { a: { x: 240, y: 380 }, b: { x: 240, y: 640 }, period: 3.4, phase: 0 },
  { a: { x: 360, y: 250 }, b: { x: 640, y: 250 }, period: 4.2, phase: 1.3 },
  { a: { x: 600, y: 470 }, b: { x: 860, y: 470 }, period: 3.8, phase: 2.1 },
  { a: { x: 800, y: 60 }, b: { x: 800, y: 330 }, period: 3.1, phase: 0.6 },
  { a: { x: 130, y: 120 }, b: { x: 430, y: 120 }, period: 5, phase: 0.2 },
];

function lightAt(i: number, t: number) {
  const L = LIGHTS[i];
  const k = (Math.sin((t / L.period) * Math.PI * 2 + L.phase) + 1) / 2;
  return { x: L.a.x + (L.b.x - L.a.x) * k, y: L.a.y + (L.b.y - L.a.y) * k };
}

export function Sneak({ seconds, startedAt, onFinish }: Props) {
  const board = useRef<HTMLDivElement>(null);
  const pos = useRef({ ...START });
  const checkpoint = useRef(0);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const caughtRef = useRef(0);
  const best = useRef(0);
  /** Hết lượt đi (tới nơi hoặc hết giờ): không di chuyển, không xét bị phát hiện nữa. */
  const done = useRef(false);
  /** Đã gửi điểm (chỉ gửi một lần). */
  const reported = useRef(false);
  const [view, setView] = useState({ t: 0, p: { ...START }, trail: [{ ...START }], reached: 0 });
  const [caught, setCaught] = useState(0);
  const [flash, setFlash] = useState(false);
  const [won, setWon] = useState(false);
  const trail = useRef<{ x: number; y: number }[]>([{ ...START }]);

  const finish = (score: number) => {
    if (reported.current) return;
    reported.current = true;
    done.current = true;
    onFinish(Math.max(0, Math.min(1000, Math.round(score))));
  };

  useEffect(() => {
    let raf = 0;
    const total = seconds * 1000;
    const loop = () => {
      const now = Date.now();
      const t = (now - startedAt) / 1000;
      if (!done.current) {
        // bị phát hiện?
        for (let i = 0; i < LIGHTS.length; i++) {
          const l = lightAt(i, t);
          if (Math.hypot(l.x - pos.current.x, l.y - pos.current.y) < R_LIGHT - 10) {
            caughtRef.current += 1;
            setCaught(caughtRef.current);
            setFlash(true);
            setTimeout(() => setFlash(false), 450);
            const cp = CHECKPOINTS[checkpoint.current];
            pos.current = { ...cp };
            trail.current = [{ ...cp }];
            drag.current = null;
            break;
          }
        }
        // tới chặng an toàn mới?
        CHECKPOINTS.forEach((cp, i) => {
          if (i > checkpoint.current && Math.hypot(cp.x - pos.current.x, cp.y - pos.current.y) < 40) checkpoint.current = i;
        });
        const progress = 1 - Math.hypot(GOAL.x - pos.current.x, GOAL.y - pos.current.y) / Math.hypot(GOAL.x - START.x, GOAL.y - START.y);
        best.current = Math.max(best.current, progress);
        if (Math.hypot(GOAL.x - pos.current.x, GOAL.y - pos.current.y) < 42) {
          // Tới nơi: dừng lượt đi ngay, để dấu "Đã tới nơi" hiện một chút rồi mới gửi điểm.
          done.current = true;
          setWon(true);
          const score = Math.max(500, 1000 - 400 * ((now - startedAt) / total) - 150 * caughtRef.current);
          setTimeout(() => finish(score), 900);
        } else if (now - startedAt >= total) {
          finish(Math.max(0, best.current) * 400);
        }
      }
      setView({ t, p: pos.current, trail: trail.current, reached: checkpoint.current });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, seconds]);

  /** Đổi quãng kéo trên màn hình (điểm ảnh) sang đơn vị bản đồ. */
  const toMap = (dx: number, dy: number) => {
    const w = board.current?.getBoundingClientRect().width || MAP_W;
    const s = MAP_W / w;
    return { dx: dx * s, dy: dy * s };
  };

  const onDown = (e: React.PointerEvent) => {
    if (done.current) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || done.current) return;
    const { dx, dy } = toMap(e.clientX - drag.current.x, e.clientY - drag.current.y);
    drag.current = { x: e.clientX, y: e.clientY };
    const nx = Math.max(20, Math.min(MAP_W - 20, pos.current.x + dx * SPEED * 1.6));
    const ny = Math.max(20, Math.min(MAP_H - 20, pos.current.y + dy * SPEED * 1.6));
    pos.current = { x: nx, y: ny };
    const last = trail.current[trail.current.length - 1];
    if (Math.hypot(last.x - nx, last.y - ny) > 14) trail.current = [...trail.current.slice(-60), { x: nx, y: ny }];
  };
  const onUp = () => (drag.current = null);

  const { t, p } = view;

  return (
    <div
      className="absolute inset-0 touch-none select-none overflow-hidden"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <MapStage ref={board}>
      <OldMap night />
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="pool">
            <stop offset="0" stopColor="#fff2c2" stopOpacity="0.85" />
            <stop offset="0.6" stopColor="#ffe08a" stopOpacity="0.35" />
            <stop offset="1" stopColor="#ffe08a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="lamp">
            <stop offset="0" stopColor="#ffd77a" stopOpacity="0.95" />
            <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
          </radialGradient>
        </defs>
        {LIGHTS.map((_, i) => {
          const l = lightAt(i, t);
          return (
            <g key={i} style={{ mixBlendMode: "screen" }}>
              <circle cx={l.x} cy={l.y} r={R_LIGHT} fill="url(#pool)" />
            </g>
          );
        })}
        {CHECKPOINTS.slice(1).map((cp, i) => (
          <g key={i} opacity={view.reached > i ? 0.9 : 0.45}>
            <circle cx={cp.x} cy={cp.y} r="14" fill="none" stroke="#9fc58f" strokeWidth="2" strokeDasharray="4 4" />
          </g>
        ))}
        <circle cx={GOAL.x} cy={GOAL.y} r="60" fill="url(#lamp)" />
        <rect x={GOAL.x - 16} y={GOAL.y - 12} width="32" height="26" rx="2" fill="#3a2614" stroke="#f1e7d0" strokeWidth="2" />
        <path d={`M${GOAL.x - 20},${GOAL.y - 12} L${GOAL.x},${GOAL.y - 28} L${GOAL.x + 20},${GOAL.y - 12} Z`} fill="#5a3a1c" stroke="#f1e7d0" strokeWidth="2" />
        <rect x={GOAL.x - 5} y={GOAL.y - 4} width="10" height="10" fill="#ffd77a" />
        <polyline points={view.trail.map((q) => `${q.x},${q.y}`).join(" ")} fill="none" stroke="#e2483c" strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" opacity="0.8" />
        <circle cx={p.x} cy={p.y} r="20" fill="#e2483c" opacity="0.18">
          <animate attributeName="r" values="14;24;14" dur="1.4s" repeatCount="indefinite" />
        </circle>
        <circle cx={p.x} cy={p.y} r="10" fill="#d42a1e" stroke="#f1e7d0" strokeWidth="3" />
      </svg>
      <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-2 font-head text-[13px] font-semibold uppercase tracking-wide">
        <span className="rounded-[2px] bg-black/70 px-2 py-1 text-cream">Kéo bất kỳ đâu để đi</span>
        {caught > 0 && <span className="rounded-[2px] bg-[#5c120d]/90 px-2 py-1 text-cream">Bị phát hiện {caught}</span>}
      </div>
      <span className="pointer-events-none absolute font-type text-[11px] font-bold text-[#ffe2a0] [text-shadow:0_1px_2px_#000]" style={{ left: `calc(${(GOAL.x / MAP_W) * 100}% - 70px)`, top: `calc(${(GOAL.y / MAP_H) * 100}% + 22px)` }}>
        Nhà an toàn
      </span>
      </MapStage>
      <AnimatePresence>
        {flash && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 grid place-items-center bg-[#b3261e]/30">
            <span className="stamp bg-black/40 text-[22px] text-[#ff6a5a] mix-blend-normal">Bị phát hiện!</span>
          </motion.div>
        )}
        {won && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pointer-events-none absolute inset-0 grid place-items-center bg-black/30">
            <span className="stamp bg-black/40 text-[24px] text-[#9fd08a] mix-blend-normal">Đã tới nơi</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
