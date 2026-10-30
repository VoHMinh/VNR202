"use client";

import { motion } from "motion/react";
import { memo, useId } from "react";
import { EDGE_N, type Look, type Seal } from "./door-plan";

/*
 * Hình vẽ của trò "Gác cửa hội trường": khung cửa nhìn ra phố đêm, bóng khách (không vẽ mặt),
 * giấy giới thiệu có dấu, nửa mảnh giấy xé đôi. Tất cả vẽ bằng SVG, không dùng ảnh.
 */

/* ───────────────────────── Bóng khách ───────────────────────── */

/** Các mảng của bóng người trong khung 100×180, chân ở y = 180. */
function figure(look: Look): string[] {
  const p: string[] = ["M45.5 41 h9 v9 h-9 Z"]; // cổ
  if (look.coat === "short") {
    p.push(
      "M30 54 Q50 47 70 54 L72 112 L28 112 Z",
      "M33 110 L48 110 L47 177 L36 177 Z",
      "M52 110 L67 110 L64 177 L53 177 Z",
      "M30 55 Q24 80 26 116 L32 116 Q31 84 36 62 Z",
      "M70 55 Q76 80 74 116 L68 116 Q69 84 64 62 Z",
    );
  } else if (look.coat === "long") {
    p.push(
      "M30 54 Q50 47 70 54 L77 150 L23 150 Z",
      "M36 148 L47 148 L46 177 L37 177 Z",
      "M53 148 L64 148 L63 177 L54 177 Z",
      "M30 55 Q22 85 25 122 L31 122 Q30 88 36 62 Z",
      "M70 55 Q78 85 75 122 L69 122 Q70 88 64 62 Z",
    );
  } else {
    p.push(
      "M31 54 Q50 47 69 54 L74 168 L26 168 Z",
      "M37 166 L47 166 L47 177 L38 177 Z",
      "M53 166 L63 166 L62 177 L53 177 Z",
      "M31 55 Q20 84 22 118 L34 118 Q32 86 37 62 Z",
      "M69 55 Q80 84 78 118 L66 118 Q68 86 63 62 Z",
    );
  }
  p.push("M34 178 a6 2.6 0 1 0 14 0 Z", "M52 178 a6 2.6 0 1 0 14 0 Z"); // giày
  if (look.hat === "fedora") p.push("M40 27 Q41 15 50 15 Q59 15 60 27 Z", "M33 27 a17 3.6 0 1 0 34 0 a17 3.6 0 1 0 -34 0 Z");
  else if (look.hat === "cap") p.push("M38 28 Q38 18 50 18 Q62 18 63 26 L69 28 Q58 30.5 38 28 Z");
  else if (look.hat === "conical") p.push("M21 31 L50 8 L79 31 Q50 35.5 21 31 Z");
  if (look.prop === "bag") p.push("M68 113 h17 v13 a1.5 1.5 0 0 1 -1.5 1.5 h-14 a1.5 1.5 0 0 1 -1.5 -1.5 Z", "M72 113 v-3 h9 v3 h-1.6 v-1.6 h-5.8 v1.6 Z");
  else if (look.prop === "umbrella") p.push("M75 106 h3 L80.5 177 h-2.6 Z", "M75 106 q-1 -7 4.5 -7.5 q4 0 4 4 h-2.4 q0 -1.8 -1.7 -1.8 q-2.6 0.3 -2 5.3 Z");
  else if (look.prop === "case") p.push("M69 149 h24 v18 a2 2 0 0 1 -2 2 h-20 a2 2 0 0 1 -2 -2 Z", "M76 149 v-3.5 h10 v3.5 h-2 v-1.6 h-6 v1.6 Z");
  else if (look.prop === "pole")
    p.push(
      "M2 50 L98 43 L98 46.4 L2 53.4 Z",
      "M7 52 l1.2 0 l-1 34 h-1.2 Z",
      "M17 51.3 l1.2 0 l1 34.7 h-1.2 Z",
      "M1 86 h22 l-3 15 h-16 Z",
      "M83 45.3 l1.2 0 l-1 35.7 h-1.2 Z",
      "M93 44.6 l1.2 0 l1 36.4 h-1.2 Z",
      "M77 81 h22 l-3 15 h-16 Z",
    );
  else if (look.prop === "satchel") p.push("M34 53 L38 51 L73 108 L69 110 Z", "M61 103 h19 v14 a2 2 0 0 1 -2 2 h-15 a2 2 0 0 1 -2 -2 Z");
  return p;
}

/** Bóng khách đứng ngược sáng đèn đường: viền sáng ấm phía sau, không có mặt. Khung 100×180, chân ở y = 180. */
export const Silhouette = memo(function Silhouette({ look }: { look: Look }) {
  const parts = figure(look);
  const flip = `translate(50 180) scale(${(look.w * look.side).toFixed(3)} ${look.h.toFixed(3)}) translate(-50 -180)`;
  return (
    <g transform={flip}>
      {/* viền sáng: vẽ trước bằng nét dày, phần thân tô sau che mất nửa trong */}
      <g fill="#ffcf7a" stroke="#ffcf7a" strokeWidth="3.2" strokeLinejoin="round" opacity="0.55">
        <circle cx="50" cy="32" r="11" />
        {parts.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g fill="#120c07">
        <circle cx="50" cy="32" r="11" />
        {parts.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </g>
  );
});

/* ───────────────────────── Cảnh cửa ───────────────────────── */

/** Kích thước ô cửa trong khung cảnh cao 240 đơn vị. */
export const DOOR = { half: 62, top: 36, sill: 232 } as const;

/** Khung cửa nhìn từ trong nhà ra phố đêm Ma Cao. `cx`: tâm ô cửa; `closed`: cánh cửa đóng lại (Đại hội khai mạc). */
export const DoorScene = memo(function DoorScene({ W, cx, closed, children }: { W: number; cx: number; closed: boolean; children?: React.ReactNode }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const x1 = cx - DOOR.half;
  const x2 = cx + DOOR.half;
  const { top, sill } = DOOR;
  const open = `M${x1} ${top} L${x1 - 30} ${top + 14} L${x1 - 30} 240 L${x1} ${sill} Z`;
  const shut = `M${x1} ${top} L${x2} ${top} L${x2} ${sill} L${x1} ${sill} Z`;
  return (
    <svg viewBox={`0 0 ${W} 240`} preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`dw${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2e1d10" />
          <stop offset="1" stopColor="#1a1009" />
        </linearGradient>
        <linearGradient id={`ds${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a1120" />
          <stop offset="1" stopColor="#1f2c42" />
        </linearGradient>
        <radialGradient id={`dl${uid}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd37a" stopOpacity="0.85" />
          <stop offset="0.35" stopColor="#ffb850" stopOpacity="0.32" />
          <stop offset="1" stopColor="#ffb850" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`di${uid}`} cx="0.5" cy="1" r="0.75">
          <stop offset="0" stopColor="#ffcf7a" stopOpacity="0.16" />
          <stop offset="1" stopColor="#ffcf7a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`dd${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4a2d14" />
          <stop offset="0.5" stopColor="#6b4421" />
          <stop offset="1" stopColor="#4a2d14" />
        </linearGradient>
        <clipPath id={`dc${uid}`}>
          <rect x={x1} y={top} width={x2 - x1} height={sill - top + 8} />
        </clipPath>
      </defs>

      {/* tường trong nhà, chân tường ốp gỗ, sàn gỗ */}
      <rect width={W} height="240" fill={`url(#dw${uid})`} />
      <rect y="156" width={W} height="72" fill="#22150b" />
      <rect y="154" width={W} height="3" fill="#3d2814" />
      <rect y="228" width={W} height="12" fill="#3a2412" />
      {Array.from({ length: Math.ceil(W / 60) }, (_, i) => (
        <rect key={i} x={i * 60 + (i % 2) * 14} y="228" width="1.2" height="12" fill="rgba(0,0,0,0.45)" />
      ))}

      {/* ngoài cửa: trời đêm, dãy nhà bên kia phố, đèn đường, mặt đường lát đá */}
      <g clipPath={`url(#dc${uid})`}>
        <rect x={x1} y={top} width={x2 - x1} height={sill - top + 8} fill={`url(#ds${uid})`} />
        <rect x={x1} y={top + 22} width={x2 - x1} height="140" fill="#17130f" />
        <path d={`M${cx + 14} ${top + 96} v-30 a17 17 0 0 1 34 0 v30 Z`} fill="#ffcf7a" opacity="0.5" />
        <path d={`M${cx + 31} ${top + 49} v47 M${cx + 14} ${top + 74} h34`} stroke="#17130f" strokeWidth="2.4" />
        <rect x={cx - 48} y={top + 50} width="26" height="44" fill="#0f0c09" />
        <path d={`M${cx - 35} ${top + 50} v44`} stroke="#2a221a" strokeWidth="1.5" />
        <rect x={x1} y={top + 158} width={x2 - x1} height="40" fill="#1a191b" />
        {[0, 1, 2, 3].map((r) => (
          <path key={r} d={`M${x1} ${top + 166 + r * 9} Q${cx} ${top + 162 + r * 9} ${x2} ${top + 166 + r * 9}`} stroke="rgba(255,220,170,0.07)" strokeWidth="1" fill="none" />
        ))}
        <ellipse cx={cx + 40} cy={top + 186} rx="46" ry="9" fill="#ffcf7a" opacity="0.13" />
        <rect x={cx + 44} y={top + 60} width="3" height="128" fill="#0c0a08" />
        <path d={`M${cx + 39} ${top + 60} h13 l-2.5 -11 h-8 Z`} fill="#0c0a08" />
        <rect x={cx + 41.5} y={top + 51} width="8" height="8" fill="#ffe2a0" />
        <circle cx={cx + 45.5} cy={top + 55} r="44" fill={`url(#dl${uid})`} />
        {children}
      </g>

      {/* khung cửa gỗ */}
      <rect x={x1 - 8} y={top - 10} width={x2 - x1 + 16} height={sill - top + 10} fill="none" stroke="#4a2e16" strokeWidth="9" />
      <rect x={x1 - 3} y={top - 5} width={x2 - x1 + 6} height={sill - top + 5} fill="none" stroke="rgba(255,214,160,0.16)" strokeWidth="1" />
      <rect x={x1 - 14} y={sill - 2} width={x2 - x1 + 28} height="6" fill="#2a190c" />

      {/* cánh cửa: mở vào trong; khi Đại hội khai mạc thì khép lại */}
      <motion.path initial={false} animate={{ d: closed ? shut : open }} transition={{ duration: 0.75, ease: [0.5, 0, 0.2, 1] }} fill={`url(#dd${uid})`} stroke="#2a190c" strokeWidth="2" />
      {closed && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.4 }}>
          <rect x={x1 + 12} y={top + 14} width={x2 - x1 - 24} height="70" fill="none" stroke="rgba(30,15,5,0.55)" strokeWidth="2" />
          <rect x={x1 + 12} y={top + 100} width={x2 - x1 - 24} height="84" fill="none" stroke="rgba(30,15,5,0.55)" strokeWidth="2" />
          <circle cx={x2 - 16} cy={top + 96} r="3.4" fill="#c79a3a" />
        </motion.g>
      )}

      {/* ánh đèn trong nhà hắt lên từ dưới */}
      <rect width={W} height="240" fill={`url(#di${uid})`} pointerEvents="none" />
    </svg>
  );
});

/* ───────────────────────── Dấu, giấy giới thiệu, nửa mảnh giấy ───────────────────────── */

const SEAL_INK: Record<Exclude<Seal, "none">, string> = { ok: "#c3271c", round: "#c3271c", blue: "#27478c" };

/** Dấu mộc, tâm ở (0, 0), nửa cạnh 10 đơn vị. */
export function SealMark({ kind }: { kind: Seal }) {
  if (kind === "none") return null;
  const ink = SEAL_INK[kind];
  const glyph = "M-4.6 -4.2 H4.6 M0 -4.2 V5 M-4.6 0.8 H4.6 M-3 5 H3";
  return (
    <g transform="rotate(-6)" stroke={ink} fill="none" opacity="0.9" strokeLinecap="round">
      {kind === "round" ? (
        <>
          <circle r="10.2" strokeWidth="2.3" />
          <circle r="7.3" strokeWidth="0.9" />
        </>
      ) : (
        <>
          <rect x="-10" y="-10" width="20" height="20" rx="1.2" strokeWidth="2.3" />
          <rect x="-7.2" y="-7.2" width="14.4" height="14.4" strokeWidth="0.9" />
        </>
      )}
      <path d={glyph} strokeWidth="1.5" />
    </g>
  );
}

/** Biểu tượng dấu đúng mẫu (dùng trên thẻ ám hiệu). */
export function SealIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="-12 -12 24 24" className={className} aria-hidden>
      <SealMark kind="ok" />
    </svg>
  );
}

/** Đường chữ viết tay giả (không đọc được), độ dài đổi theo hạt giống. */
function scribble(x: number, y: number, len: number, wave: number) {
  let d = `M${x} ${y}`;
  for (let i = 0; i < Math.floor(len / 5); i++) d += i ? " t5 0" : ` q2.5 ${-wave} 5 0`;
  return d;
}

/** Giấy giới thiệu: vài dòng chữ viết tay và con dấu ở góc dưới. `flag`: khoanh đỏ chỗ sai. */
export const PaperDoc = memo(function PaperDoc({ seal, seed, flag }: { seal: Seal; seed: number; flag?: boolean }) {
  const lens = [0, 1, 2, 3].map((i) => 58 + ((seed * 37 + i * 23) % 34));
  return (
    <svg viewBox="0 0 120 84" className="h-full w-full" aria-hidden>
      <g transform={`rotate(${seed % 2 ? -1.4 : 1.1} 60 42)`}>
        <rect x="5" y="4" width="110" height="76" rx="1.5" fill="#efe3c4" stroke="#8a7350" strokeWidth="0.8" />
        <rect x="5" y="4" width="110" height="76" rx="1.5" fill="none" stroke="rgba(110,72,30,0.25)" strokeWidth="5" opacity="0.5" />
        <path d={scribble(14, 15, 44, 2)} stroke="#3b2c1e" strokeWidth="1.1" fill="none" />
        {lens.map((l, i) => (
          <path key={i} d={scribble(14, 27 + i * 10, l, 1.8 + (i % 2) * 0.6)} stroke="#4b3a28" strokeWidth="0.9" fill="none" opacity="0.85" />
        ))}
        <path d="M16 71 c4 -8 8 6 12 -2 s6 4 10 -3" stroke="#3b2c1e" strokeWidth="1" fill="none" />
        <g transform="translate(95 64)">
          <SealMark kind={seal} />
        </g>
        {flag && <ellipse cx="95" cy="64" rx="17" ry="15" fill="none" stroke="#d42a1e" strokeWidth="2" strokeDasharray="4 3" />}
      </g>
    </svg>
  );
});

const SLIP = { left: 6, right: 126, top: 5, bottom: 59, mid: 62, gap: 6 } as const;

function tear(edge: number[], dx = 0) {
  return edge.map((e, i) => [SLIP.mid + e * 0.85 + dx, SLIP.top + (i * (SLIP.bottom - SLIP.top)) / (EDGE_N - 1)] as const);
}

/** Nửa mảnh giấy của người gác (bên trái) đặt cạnh nửa của khách (bên phải): khớp thì khe hở đều và nét kẻ liền mạch. */
export const SlipPair = memo(function SlipPair({ mine, theirs, shift, flag }: { mine: number[]; theirs: number[]; shift: number; flag?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const a = tear(mine);
  const b = tear(theirs, SLIP.gap);
  const left = `M${SLIP.left} ${SLIP.top} ${a.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")} L${SLIP.left} ${SLIP.bottom} Z`;
  const right = `M${SLIP.right} ${SLIP.top} ${b.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")} L${SLIP.right} ${SLIP.bottom} Z`;
  const lines = "M0 19 L132 30 M0 40 L132 51";
  return (
    <svg viewBox="0 0 132 73" className="h-full w-full" aria-hidden>
      <defs>
        <clipPath id={`sl${uid}`}>
          <path d={left} />
        </clipPath>
        <clipPath id={`sr${uid}`}>
          <path d={right} />
        </clipPath>
      </defs>
      <path d={left} fill="#e9dcbc" stroke="#8a7350" strokeWidth="0.8" />
      <path d={right} fill="#e9dcbc" stroke="#8a7350" strokeWidth="0.8" />
      <path d={lines} stroke="#2f4f7a" strokeWidth="1.6" clipPath={`url(#sl${uid})`} />
      <g clipPath={`url(#sr${uid})`}>
        <path d={lines} stroke="#2f4f7a" strokeWidth="1.6" transform={`translate(${SLIP.gap} ${shift})`} />
      </g>
      {flag && <rect x={SLIP.mid - 13} y="1.5" width="32" height="61" rx="6" fill="none" stroke="#d42a1e" strokeWidth="2" strokeDasharray="4 3" />}
      <g fontSize="8" fill="#f1e2bd" textAnchor="middle" style={{ fontFamily: "var(--font-text), serif" }}>
        <text x="34" y="71">của bạn</text>
        <text x="96" y="71">của khách</text>
      </g>
    </svg>
  );
});

/** Biểu tượng nửa mảnh giấy của người gác (dùng trên thẻ ám hiệu). */
export function HalfIcon({ edge, className }: { edge: number[]; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const a = tear(edge);
  const d = `M${SLIP.left} ${SLIP.top} ${a.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")} L${SLIP.left} ${SLIP.bottom} Z`;
  return (
    <svg viewBox="0 0 74 64" className={className} aria-hidden>
      <defs>
        <clipPath id={`hi${uid}`}>
          <path d={d} />
        </clipPath>
      </defs>
      <path d={d} fill="#e9dcbc" stroke="#6b5a3e" strokeWidth="1.6" />
      <path d="M0 19 L132 30 M0 40 L132 51" stroke="#2f4f7a" strokeWidth="2.2" clipPath={`url(#hi${uid})`} />
    </svg>
  );
}
