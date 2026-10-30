"use client";

import { AnimatePresence, motion, useAnimate } from "motion/react";
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Stamp } from "@/components/kit/Stamp";
import { GRAIN, WoodSurface, isTypingTarget, mulberry32, useBox, useFinishOnce } from "./shared";
import type { MiniProps } from "./types";

/*
 * "In truyền đơn" (cuối tháng 4/1930): bàn in thạch (in xu xoa) giấu trong một căn nhà lá.
 * Mỗi lần bấm (hoặc phím cách): đặt tờ giấy lên khay thạch, lăn ru-lô, bóc tờ đã in đặt sang chồng bên phải.
 * Ngoài vách, đồng chí canh gác thắp đèn bão đỏ khi lính tuần đi ngang: bấm lúc đèn đỏ là bị lộ, mất 6 tờ.
 * Điểm = số tờ × 22 − số lần bị lộ × 150, kẹp trong 0–1000.
 */

const HEADER = "HỠI ANH CHỊ EM CÔNG NÔNG!";
const SLOGANS = [
  { text: "ĐẢ ĐẢO CHỦ NGHĨA ĐẾ QUỐC PHÁP!", size: 1.95 },
  { text: "NGÀY LÀM TÁM GIỜ!", size: 2.6 },
  { text: "TĂNG LƯƠNG, GIẢM GIỜ LÀM!", size: 2.2 },
  { text: "CHỐNG SƯU CAO THUẾ NẶNG!", size: 2.2 },
];

const PER_SHEET = 22;
const PER_EXPOSURE = 150;
const LOSS = 6;
/** Đèn vừa đỏ được 0,2 giây đầu thì cú bấm chỉ bị chặn, chưa tính là lộ (không ai phản xạ kịp nhanh hơn thế). */
const GRACE = 0.2;
/** Sau khi bị lộ, tay khựng lại một lúc: các cú bấm trong lúc này bị bỏ qua. */
const LOCK_MS = 650;
/** Chồng giấy: chỉ vài tờ trên cùng vẽ đủ vân giấy và chữ in; tờ bên dưới vẽ trơn; tờ sâu hơn bị mép chồng che hẳn. */
const DETAILED = 5;
const SHOWN = 16;

const printScore = (sheets: number, exposures: number) => Math.max(0, Math.min(1000, sheets * PER_SHEET - exposures * PER_EXPOSURE));

interface Patrol {
  start: number;
  end: number;
}

/**
 * Lịch lính tuần, tính tất định từ mốc bắt đầu: 2–3 lần, không rơi vào 2 giây đầu, không chạm lúc hết giờ,
 * mỗi lần 1,4–2,0 giây, cách nhau ít nhất 1 giây. Tổng thời gian đèn đỏ gần như không đổi (khoảng 4 giây)
 * dù là 2 hay 3 lần, để bảng xếp hạng trong lớp công bằng.
 */
function planPatrols(seconds: number, seed: number): Patrol[] {
  const rnd = mulberry32(Math.floor(seed) ^ 0x5bd1e995);
  const from = 2.4;
  const span = seconds - 0.9 - from;
  let n = span >= 10.5 ? (rnd() < 0.5 ? 2 : 3) : 2;
  while (n > 0 && span / n < 2.4) n--;
  if (n <= 0) return [];
  const seg = span / n;
  const base = Math.min(2, Math.max(1.4, 4.1 / n));
  const out: Patrol[] = [];
  for (let i = 0; i < n; i++) {
    const d = Math.min(2, Math.max(1.4, base + (rnd() - 0.5) * 0.12), seg - 1);
    const start = from + i * seg + 0.5 + rnd() * Math.max(0, seg - d - 1);
    out.push({ start, end: start + d });
  }
  return out;
}

/* ───────────── Bố cục: hai khung logic, chọn khung nào cho tỉ lệ phóng lớn hơn ───────────── */

interface Layout {
  w: number;
  h: number;
  wall: number;
  tray: { x: number; y: number; w: number; h: number; frame: number };
  sheet: { w: number; h: number };
  onTray: { x: number; y: number };
  stack: { x: number; y: number };
  lamp: { cx: number; k: number };
  note: { x: number; y: number; w: number };
  slip: { x: number; y: number };
  bottle: { x: number; y: number } | null;
  fs: number;
  maxLift: number;
}

const WIDE: Layout = {
  w: 640,
  h: 400,
  wall: 86,
  tray: { x: 46, y: 108, w: 232, h: 276, frame: 14 },
  sheet: { w: 168, h: 224 },
  onTray: { x: 78, y: 134 },
  stack: { x: 420, y: 144 },
  lamp: { cx: 320, k: 1 },
  note: { x: 22, y: 12, w: 150 },
  slip: { x: 366, y: 26 },
  bottle: { x: 326, y: 296 },
  fs: 10,
  maxLift: 26,
};

const TALL: Layout = {
  w: 360,
  h: 440,
  wall: 92,
  tray: { x: 8, y: 114, w: 178, h: 236, frame: 12 },
  sheet: { w: 142, h: 190 },
  onTray: { x: 26, y: 137 },
  stack: { x: 208, y: 150 },
  lamp: { cx: 180, k: 0.92 },
  note: { x: 10, y: 12, w: 112 },
  slip: { x: 210, y: 24 },
  bottle: null,
  fs: 8.45,
  maxLift: 22,
};

function fit(w: number, h: number) {
  const sw = Math.min(w / WIDE.w, h / WIDE.h);
  const st = Math.min(w / TALL.w, h / TALL.h);
  const L = sw >= st ? WIDE : TALL;
  const s = Math.max(0.1, sw >= st ? sw : st);
  return { L, s, ox: (w - L.w * s) / 2 };
}

interface Leaf {
  id: number;
  slogan: number;
  rot: number;
  dx: number;
  dy: number;
  index: number;
  dir: number;
  tone: number;
  landed: boolean;
}

/* ───────────────────────────── Trò chơi ───────────────────────────── */

export function Print({ seconds, startedAt, onFinish }: MiniProps) {
  // Giữ mốc giờ lúc mở trò chơi: khung cha vẽ lại cũng không làm lệch giờ.
  const [t0] = useState(startedAt);
  const [secs] = useState(seconds);
  const finish = useFinishOnce(onFinish);
  const [boxRef, box] = useBox<HTMLDivElement>();
  const patrols = useMemo(() => planPatrols(secs, t0), [secs, t0]);

  const [leaves, setLeaves] = useState<Leaf[]>([]);
  const [exposures, setExposures] = useState(0);
  const [red, setRed] = useState(false);
  const [strokes, setStrokes] = useState(0);
  const [bust, setBust] = useState(0);
  const [bustOn, setBustOn] = useState(false);
  const [over, setOver] = useState(false);

  const leavesRef = useRef<Leaf[]>([]);
  const exposuresRef = useRef(0);
  const lockUntil = useRef(0);
  const nextId = useRef(1);
  const bustTimer = useRef(0);
  const [scope, animate] = useAnimate<HTMLDivElement>();

  const commit = useCallback((next: Leaf[]) => {
    leavesRef.current = next;
    setLeaves(next);
  }, []);

  // Đèn tín hiệu: so giờ thật với lịch lính tuần mỗi khung hình.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const t = (Date.now() - t0) / 1000;
      if (t >= secs) {
        setRed(false);
        return;
      }
      setRed(patrols.some((p) => t >= p.start && t < p.end));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [patrols, secs, t0]);

  // Hết giờ: chốt điểm đúng một lần (kể cả các tờ còn đang bay sang chồng).
  useEffect(() => {
    const id = window.setTimeout(
      () => {
        setOver(true);
        finish(printScore(leavesRef.current.length, exposuresRef.current));
      },
      Math.max(0, t0 + secs * 1000 - Date.now()),
    );
    return () => window.clearTimeout(id);
  }, [finish, secs, t0]);

  useEffect(() => {
    const timer = bustTimer;
    return () => window.clearTimeout(timer.current);
  }, []);

  const press = useCallback(() => {
    const now = Date.now();
    const t = (now - t0) / 1000;
    if (t < 0 || t >= secs || now < lockUntil.current) return;
    const patrol = patrols.find((p) => t >= p.start && t < p.end);
    if (patrol) {
      if (t - patrol.start < GRACE) return;
      // Bị lộ: mất 6 tờ trên cùng, cả bàn rung lên.
      lockUntil.current = now + LOCK_MS;
      exposuresRef.current += 1;
      setExposures(exposuresRef.current);
      commit(leavesRef.current.slice(0, Math.max(0, leavesRef.current.length - LOSS)));
      setBust(exposuresRef.current);
      setBustOn(true);
      window.clearTimeout(bustTimer.current);
      bustTimer.current = window.setTimeout(() => setBustOn(false), 1100);
      if (scope.current) animate(scope.current, { x: [0, -10, 9, -7, 5, -2, 0] }, { duration: 0.45, ease: "easeOut" });
      return;
    }
    const leaf: Leaf = {
      id: nextId.current++,
      slogan: Math.floor(Math.random() * SLOGANS.length),
      rot: (Math.random() - 0.5) * 9,
      dx: (Math.random() - 0.5) * 10,
      dy: (Math.random() - 0.5) * 6,
      index: leavesRef.current.length,
      dir: Math.random() < 0.5 ? -1 : 1,
      tone: Math.random(),
      landed: false,
    };
    commit([...leavesRef.current, leaf]);
    setStrokes((s) => s + 1);
  }, [animate, commit, patrols, scope, secs, t0]);

  const land = useCallback(
    (id: number) => {
      if (!leavesRef.current.some((l) => l.id === id && !l.landed)) return;
      commit(leavesRef.current.map((l) => (l.id === id ? { ...l, landed: true } : l)));
    },
    [commit],
  );

  // Phím cách (hoặc Enter) cũng in được; giữ phím không tính là bấm liên tục.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " " && e.key !== "Enter") return;
      if (isTypingTarget(e.target)) return;
      const el = e.target as HTMLElement | null;
      if (el && /^(BUTTON|A)$/.test(el.tagName)) return;
      e.preventDefault();
      if (!e.repeat) press();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    press();
  };

  const { L, s, ox } = fit(box.w || WIDE.w, box.h || WIDE.h);
  const top = leaves.length ? Math.min(L.maxLift, leaves[leaves.length - 1].index * 0.6) : 0;
  const lampX = ox + L.lamp.cx * s;
  const lampY = 60 * L.lamp.k * s;

  return (
    <div
      ref={boxRef}
      role="button"
      tabIndex={0}
      aria-label="Bàn in truyền đơn. Bấm hoặc nhấn phím cách để in một tờ; dừng tay khi đèn đỏ."
      data-red={red ? 1 : 0}
      data-count={leaves.length}
      data-exposures={exposures}
      data-over={over ? 1 : 0}
      onPointerDown={onPointerDown}
      className="relative h-full w-full touch-manipulation select-none overflow-hidden bg-[#1a110a] outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
      style={{ cursor: over ? "default" : "pointer", WebkitTouchCallout: "none" }}
    >
      <InkFilters />
      {box.w > 0 && (
        <motion.div ref={scope} className="absolute inset-0">
          <Backdrop wall={L.wall * s} />

          <div className="absolute left-0 top-0" style={{ width: L.w, height: L.h, transform: `translate(${ox}px,0) scale(${s})`, transformOrigin: "0 0" }}>
            <Tray L={L} />
            {L.bottle && <InkBottle x={L.bottle.x} y={L.bottle.y} />}
            <Pile L={L} lift={top} count={leaves.length} />
            <AnimatePresence>
              {leaves.map((leaf, i) => (
                <LeafView
                  key={leaf.id}
                  leaf={leaf}
                  L={L}
                  detail={!leaf.landed || leaves.length - 1 - i < DETAILED ? "full" : leaves.length - 1 - i < SHOWN ? "plain" : "hidden"}
                  onLanded={land}
                />
              ))}
            </AnimatePresence>
            <RollerView key={strokes} L={L} active={strokes > 0} />
            <Lantern L={L} lit={red} />
            <Tally L={L} count={leaves.length} exposures={exposures} />
            <AnimatePresence>{red && <PatrolSlip key="slip" L={L} />}</AnimatePresence>
            <AnimatePresence>{bustOn && <BustStamp key={bust} L={L} />}</AnimatePresence>
          </div>

          {/* Ánh đèn đỏ hắt khắp phòng và quầng sáng quanh bóng đèn. */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -inset-3"
            style={{
              mixBlendMode: "multiply",
              background: `radial-gradient(ellipse ${Math.max(260, box.w * 0.75)}px ${Math.max(260, box.h * 1.05)}px at ${lampX + 12}px ${lampY + 12}px, #ff8a70 0%, #e8604a 35%, #a83a30 100%)`,
            }}
            initial={false}
            animate={{ opacity: red ? 0.62 : 0 }}
            transition={{ duration: red ? 0.08 : 0.3 }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute rounded-full"
            style={{
              left: lampX - 170 * s,
              top: lampY - 170 * s,
              width: 340 * s,
              height: 340 * s,
              mixBlendMode: "screen",
              background: "radial-gradient(circle, rgba(255,190,140,0.95) 0%, rgba(255,92,52,0.55) 11%, rgba(235,48,24,0.24) 32%, rgba(200,24,10,0.08) 52%, rgba(200,20,10,0) 70%)",
            }}
            initial={false}
            animate={red ? { opacity: [0.88, 1, 0.84, 0.97, 0.9] } : { opacity: 0 }}
            transition={red ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" } : { duration: 0.25 }}
          />
        </motion.div>
      )}
    </div>
  );
}

/* ───────────────────────────── Nền: vách phên tre và mặt bàn gỗ ───────────────────────────── */

const Backdrop = memo(function Backdrop({ wall }: { wall: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* Mặt bàn */}
      <div className="absolute -bottom-3 -left-3 -right-3" style={{ top: wall }}>
        <WoodSurface seed={9} plank={68} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 80% at 50% 40%, rgba(255,196,128,0.17), transparent 70%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 120% 110% at 50% 35%, transparent 45%, rgba(0,0,0,0.62) 100%)" }} />
        {/* bóng vách đổ xuống mép bàn */}
        <div className="absolute inset-x-0 top-0 h-6" style={{ background: "linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0))" }} />
      </div>
      {/* Vách phên tre đan */}
      <svg className="absolute -left-3 -top-3" style={{ width: "calc(100% + 24px)", height: wall + 12 }}>
        <defs>
          <linearGradient id={`h${uid}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#24170b" />
            <stop offset="0.5" stopColor="#6a4d2b" />
            <stop offset="1" stopColor="#24170b" />
          </linearGradient>
          <linearGradient id={`v${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#21150a" />
            <stop offset="0.5" stopColor="#5e4426" />
            <stop offset="1" stopColor="#21150a" />
          </linearGradient>
          <pattern id={`p${uid}`} width="30" height="30" patternUnits="userSpaceOnUse">
            <rect width="30" height="30" fill="#0f0904" />
            {[0, 1, 2].map((i) => (
              <g key={i}>
                <rect x="0.4" y={0.6 + i * 4.9} width="14.2" height="4.2" rx="1.4" fill={`url(#h${uid})`} />
                <rect x="15.4" y={15.6 + i * 4.9} width="14.2" height="4.2" rx="1.4" fill={`url(#h${uid})`} />
                <rect x={15.6 + i * 4.9} y="0.4" width="4.2" height="14.2" rx="1.4" fill={`url(#v${uid})`} />
                <rect x={0.6 + i * 4.9} y="15.4" width="4.2" height="14.2" rx="1.4" fill={`url(#v${uid})`} />
              </g>
            ))}
          </pattern>
          <filter id={`n${uid}`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.03 0.07" numOctaves="3" seed="2" />
            <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 2 -0.75" />
          </filter>
          <linearGradient id={`b${uid}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#1a1007" />
            <stop offset="0.35" stopColor="#5c4223" />
            <stop offset="0.6" stopColor="#3b2a15" />
            <stop offset="1" stopColor="#120a04" />
          </linearGradient>
          <linearGradient id={`s${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.82" />
            <stop offset="0.55" stopColor="#000" stopOpacity="0.45" />
            <stop offset="1" stopColor="#000" stopOpacity="0.62" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill={`url(#p${uid})`} />
        <rect width="100%" height="100%" filter={`url(#n${uid})`} />
        <rect width="100%" height="100%" fill={`url(#s${uid})`} />
        {["7%", "93%"].map((x) => (
          <g key={x}>
            <rect x={x} y="0" width="17" height="100%" transform="translate(-8.5,0)" fill={`url(#b${uid})`} />
            {[34, 74].map((y) => (
              <rect key={y} x={x} y={y} width="19" height="3" rx="1.5" transform="translate(-9.5,0)" fill="rgba(255,226,170,0.16)" />
            ))}
          </g>
        ))}
        {/* xà ngang treo đèn */}
        <rect x="0" y="0" width="100%" height="22" fill="#1d1209" />
        <rect x="0" y="20" width="100%" height="2" fill="rgba(255,210,150,0.12)" />
        <rect x="0" y="22" width="100%" height="5" fill="rgba(0,0,0,0.5)" />
      </svg>
    </div>
  );
});

/* ───────────────────────────── Khay thạch, ru-lô, lọ mực ───────────────────────────── */

const NAILS = [
  [7, 7],
  [-7, 7],
  [7, -7],
  [-7, -7],
] as const;

const Tray = memo(function Tray({ L }: { L: Layout }) {
  const { x, y, w, h, frame } = L.tray;
  return (
    <div className="absolute" style={{ left: x, top: y, width: w, height: h }}>
      <div className="absolute inset-0 rounded-[7px]" style={{ boxShadow: "0 18px 24px -10px rgba(0,0,0,0.85), 0 3px 5px rgba(0,0,0,0.55)" }} />
      <div
        className="absolute inset-0 rounded-[7px]"
        style={{
          background:
            "repeating-linear-gradient(90deg, rgba(50,24,6,0) 0 3px, rgba(50,24,6,0.14) 3px 4px, rgba(50,24,6,0) 4px 11px), linear-gradient(180deg, #a16b37 0%, #855328 45%, #6b4220 100%)",
          boxShadow: "inset 0 1.5px 0 rgba(255,224,176,0.42), inset 0 -2.5px 0 rgba(0,0,0,0.45), inset 1.5px 0 0 rgba(255,224,176,0.18), inset -1.5px 0 0 rgba(0,0,0,0.3)",
        }}
      />
      <div aria-hidden className="absolute inset-0 rounded-[7px] opacity-50 mix-blend-multiply" style={{ backgroundImage: GRAIN }} />
      {/* Mặt thạch: màu hổ phách, còn hằn ngược bản in gốc. */}
      <div
        className="absolute overflow-hidden rounded-[3px]"
        style={{
          left: frame,
          top: frame,
          right: frame,
          bottom: frame,
          background: "radial-gradient(120% 90% at 35% 28%, #cf9550 0%, #a96c2e 48%, #774617 100%)",
          boxShadow: "inset 0 6px 10px rgba(0,0,0,0.62), inset 0 0 0 1px rgba(40,18,4,0.75), 0 1px 0 rgba(255,225,180,0.28)",
        }}
      >
        <div
          className="absolute"
          style={{
            left: L.onTray.x - x - frame,
            top: L.onTray.y - y - frame,
            width: L.sheet.w,
            height: L.sheet.h,
            fontSize: L.fs,
            transform: "scaleX(-1)",
            opacity: 0.22,
            mixBlendMode: "multiply",
            filter: "blur(0.6px)",
          }}
        >
          <Face slogan={0} filter="url(#mn-ink-2)" />
        </div>
        <div className="absolute inset-0" style={{ background: "linear-gradient(116deg, transparent 26%, rgba(255,244,222,0.24) 38%, rgba(255,244,222,0.06) 45%, transparent 51%)" }} />
        <div className="absolute inset-0 opacity-30 mix-blend-multiply" style={{ backgroundImage: GRAIN }} />
      </div>
      {NAILS.map(([nx, ny], i) => (
        <span
          key={i}
          aria-hidden
          className="absolute h-[5px] w-[5px] rounded-full"
          style={{
            left: nx > 0 ? nx - 2.5 : undefined,
            right: nx < 0 ? -nx - 2.5 : undefined,
            top: ny > 0 ? ny - 2.5 : undefined,
            bottom: ny < 0 ? -ny - 2.5 : undefined,
            background: "radial-gradient(circle at 35% 30%, #d9d2c2, #6d665b 55%, #2a2620)",
            boxShadow: "0 1px 1px rgba(0,0,0,0.6)",
          }}
        />
      ))}
    </div>
  );
});

function RollerView({ L, active }: { L: Layout; active: boolean }) {
  const cw = L.sheet.w + 18;
  const x = L.onTray.x - 9;
  const rest = L.onTray.y + L.sheet.h + L.tray.frame - 2 - 11;
  const up = L.onTray.y - 13;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-0 top-0"
      style={{ x, zIndex: 30 }}
      initial={{ y: rest }}
      animate={active ? { y: [rest, up, rest] } : { y: rest }}
      transition={{ duration: 0.3, times: [0, 0.47, 1], ease: ["easeOut", "easeInOut"] }}
    >
      <Roller w={cw} />
    </motion.div>
  );
}

/** Ru-lô cao su nhìn từ trên xuống: trục thép, càng sắt, cán gỗ. */
function Roller({ w }: { w: number }) {
  const c = w / 2;
  const arms = `M3 12 L3 20 Q3 33 ${c - 6} 41 M${w - 3} 12 L${w - 3} 20 Q${w - 3} 33 ${c + 6} 41`;
  return (
    <div className="relative" style={{ width: w, height: 112 }}>
      <div className="absolute rounded-full" style={{ left: 8, top: 16, width: w - 16, height: 12, background: "rgba(0,0,0,0.5)", filter: "blur(4px)" }} />
      <div className="absolute rounded-full" style={{ left: c - 4, top: 50, width: 16, height: 62, background: "rgba(0,0,0,0.42)", filter: "blur(5px)" }} />
      <svg className="absolute left-0 top-0 overflow-visible" width={w} height={48}>
        <path d={arms} stroke="#4e4943" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <path d={arms} stroke="rgba(255,250,235,0.28)" strokeWidth="1" fill="none" strokeLinecap="round" transform="translate(-0.7,-0.7)" />
      </svg>
      <div
        className="absolute rounded-full"
        style={{ left: c - 7, top: 40, width: 14, height: 70, background: "linear-gradient(90deg, #3a220e, #a8723f 36%, #80502a 62%, #2b180a)", boxShadow: "inset 0 -6px 6px rgba(0,0,0,0.35)" }}
      />
      <div className="absolute rounded-[2px]" style={{ left: c - 7.5, top: 38, width: 15, height: 9, background: "linear-gradient(90deg, #3d3a35, #d3ccbd 40%, #847d72 66%, #2e2b27)" }} />
      <div
        className="absolute"
        style={{
          left: 5,
          top: 0,
          width: w - 10,
          height: 22,
          borderRadius: "6px / 11px",
          background: "linear-gradient(180deg, #060504 0%, #2b2621 26%, #6e665c 39%, #2c2722 54%, #0d0b09 100%)",
          boxShadow: "0 2px 3px rgba(0,0,0,0.5)",
        }}
      />
      <div className="absolute rounded-[2px]" style={{ left: 0, top: 6, width: 7, height: 10, background: "linear-gradient(180deg, #2c2925, #a49d90 45%, #39352f)" }} />
      <div className="absolute rounded-[2px]" style={{ right: 0, top: 6, width: 7, height: 10, background: "linear-gradient(180deg, #2c2925, #a49d90 45%, #39352f)" }} />
    </div>
  );
}

function InkBottle({ x, y }: { x: number; y: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg aria-hidden className="absolute overflow-visible" style={{ left: x, top: y }} width="46" height="62" viewBox="0 0 46 62">
      <defs>
        <linearGradient id={`g${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor="#0d0a12" />
          <stop offset="0.3" stopColor="#3a2f40" />
          <stop offset="0.5" stopColor="#1d1722" />
          <stop offset="1" stopColor="#07060a" />
        </linearGradient>
        <linearGradient id={`c${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor="#6b4a2a" />
          <stop offset="0.45" stopColor="#c89a62" />
          <stop offset="1" stopColor="#5a3b1e" />
        </linearGradient>
        <filter id={`b${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <ellipse cx="27" cy="58" rx="22" ry="5" fill="rgba(0,0,0,0.6)" filter={`url(#b${uid})`} />
      <path d="M5 24 Q5 17 12 16 L34 16 Q41 17 41 24 L41 51 Q41 57 34 57 L12 57 Q5 57 5 51 Z" fill={`url(#g${uid})`} />
      <rect x="15" y="8" width="16" height="10" rx="1.5" fill={`url(#g${uid})`} />
      <rect x="13.5" y="1.5" width="19" height="9" rx="2" fill={`url(#c${uid})`} />
      <path d="M10 22 Q9 36 10 50" stroke="rgba(255,255,255,0.32)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M36 25 Q37 30 37 35" stroke="rgba(255,255,255,0.14)" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <rect x="12" y="30" width="22" height="16" rx="1" fill="#d9c9a3" opacity="0.92" />
      <rect x="12" y="30" width="22" height="16" rx="1" fill="none" stroke="rgba(60,40,20,0.35)" strokeWidth="0.6" />
      <path d="M15 36 H31 M15 40 H27" stroke="rgba(70,40,30,0.55)" strokeWidth="1.1" />
    </svg>
  );
}

/* ───────────────────────────── Tờ truyền đơn ───────────────────────────── */

const SHADOW_FLAT = "0px 1px 1.5px rgba(0,0,0,0.45), 0px 3px 6px rgba(0,0,0,0.25)";
const SHADOW_LIFT = "0px 14px 18px rgba(0,0,0,0.38), 0px 5px 7px rgba(0,0,0,0.26)";

/*
 * Mỗi tờ chỉ chạy các hiệu ứng mà card đồ họa tự lo (dịch, xoay, phóng, mờ): bóng đổ khi nhấc tờ giấy lên là một lớp riêng
 * chỉ đổi độ mờ, nên tờ giấy (và bộ lọc mực in trên nó) không phải vẽ lại từng khung hình.
 */
const LeafView = memo(function LeafView({
  leaf,
  L,
  detail,
  onLanded,
}: {
  leaf: Leaf;
  L: Layout;
  detail: "full" | "plain" | "hidden";
  onLanded: (id: number) => void;
}) {
  const lift = Math.min(L.maxLift, leaf.index * 0.6);
  const fx = L.stack.x + leaf.dx;
  const fy = L.stack.y + leaf.dy - lift;
  const tx = L.onTray.x;
  const ty = L.onTray.y;
  return (
    <motion.div
      className="absolute left-0 top-0"
      // Lúc lăn mực tờ giấy nằm dưới ru-lô; bóc lên rồi mới nổi lên trên (đổi lớp bằng CSS animation theo bước).
      style={{
        width: L.sheet.w,
        height: L.sheet.h,
        zIndex: 40,
        animation: leaf.landed ? undefined : "mn-print-lift 0.5s linear both",
        display: detail === "hidden" ? "none" : undefined,
      }}
      initial={leaf.landed ? false : { x: tx, y: ty, rotate: -0.6, scale: 1.02, opacity: 0 }}
      animate={
        leaf.landed
          ? { x: fx, y: fy, rotate: leaf.rot, scale: 1, opacity: 1 }
          : {
              x: [tx, tx, tx + 5, fx],
              y: [ty, ty, ty - 9, fy],
              rotate: [-0.6, -0.6, -2.4, leaf.rot],
              scale: [1.02, 1, 1.035, 1],
              opacity: 1,
            }
      }
      exit={{ x: fx + leaf.dir * 80, y: fy - 190, rotate: leaf.rot + leaf.dir * 32, opacity: 0, transition: { duration: 0.5, ease: [0.5, 0, 0.9, 0.6] } }}
      transition={
        leaf.landed
          ? { duration: 0.25 }
          : { duration: 0.5, times: [0, 0.28, 0.4, 1], ease: ["linear", "easeOut", [0.25, 0.8, 0.3, 1]], opacity: { duration: 0.04 } }
      }
      onAnimationComplete={() => {
        if (!leaf.landed) onLanded(leaf.id);
      }}
    >
      {!leaf.landed && (
        <motion.div
          aria-hidden
          className="absolute inset-0"
          style={{ boxShadow: SHADOW_LIFT }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0, 1, 0] }}
          transition={{ duration: 0.5, times: [0, 0.28, 0.4, 1] }}
        />
      )}
      <div
        className="sheet absolute inset-0 overflow-hidden rounded-[1.5px]"
        style={{ fontSize: L.fs, backgroundColor: leaf.tone > 0.5 ? "#ece2ca" : "#e5d9bd", boxShadow: detail === "full" ? SHADOW_FLAT : "0px 1px 1.5px rgba(0,0,0,0.4)" }}
      >
        {/* giấy in mỏng, sáng hơn giấy hồ sơ; vân giấy lấy từ lớp .sheet */}
        <div aria-hidden className="absolute inset-0" style={{ background: `rgba(247,240,222,${0.34 + leaf.tone * 0.1})` }} />
        {detail === "full" && (
          <motion.div
            className="absolute inset-0"
            initial={leaf.landed ? false : { clipPath: "inset(100% 0% 0% 0%)" }}
            animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
            transition={{ duration: 0.15, ease: "linear" }}
            style={{ opacity: 0.86 + leaf.tone * 0.12 }}
          >
            <Face slogan={leaf.slogan} filter={`url(#mn-ink-${Math.floor(leaf.tone * 2.999)})`} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});

/** Mặt in: dòng hô gọi đánh máy, gạch kép, khẩu hiệu chữ đứng in đỏ, viền hoa văn. */
function Face({ slogan, filter }: { slogan: number; filter: string }) {
  const s = SLOGANS[slogan];
  return (
    <div className="absolute inset-0 flex flex-col items-center px-[0.85em] pb-[0.85em] pt-[1.05em] text-center" style={{ filter }}>
      <div className="whitespace-nowrap font-type text-[0.78em] font-bold leading-none tracking-[0.04em] text-[#2a2019]">{HEADER}</div>
      <div className="mt-[0.55em] h-[0.2em] w-full bg-[#2a2019]" />
      <div className="mt-[0.16em] h-[0.07em] w-full bg-[#2a2019]" />
      <div className="flex w-full flex-1 items-center justify-center px-[0.1em]">
        <p className="text-balance font-head font-bold uppercase leading-[1.14] text-[#9c2117]" style={{ fontSize: `${s.size}em` }}>
          {s.text}
        </p>
      </div>
      <div className="h-[0.07em] w-full bg-[#2a2019]" />
      <div className="mt-[0.16em] h-[0.2em] w-full bg-[#2a2019]" />
      <div className="mt-[0.5em] flex items-center gap-[0.7em]">
        {[0, 1, 2].map((i) => (
          <span key={i} className="block h-[0.42em] w-[0.42em] rotate-45 bg-[#2a2019]" />
        ))}
      </div>
    </div>
  );
}

/** Ba bộ lọc mực in (hạt giống khác nhau để các tờ không loang giống hệt nhau). */
function InkFilters() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <style>{"@keyframes mn-print-lift{0%,29%{z-index:2}30%,100%{z-index:40}}"}</style>
      {[5, 17, 29].map((seed, i) => (
        <filter key={seed} id={`mn-ink-${i}`} x="-4%" y="-4%" width="108%" height="108%">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed={seed} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="0.85" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="3" seed={seed + 7} result="s" />
          <feColorMatrix in="s" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.15 1.48" result="m" />
          <feComposite in="d" in2="m" operator="in" />
        </filter>
      ))}
    </svg>
  );
}

/** Chồng truyền đơn: mép giấy xếp lớp dày dần, bóng đổ xuống mặt bàn. */
function Pile({ L, lift, count }: { L: Layout; lift: number; count: number }) {
  if (!count) return null;
  const { x, y } = L.stack;
  const { w, h } = L.sheet;
  return (
    <>
      <div
        aria-hidden
        className="absolute rounded-full"
        style={{ left: x - 8, top: y + h - 12, width: w + 16, height: 26 + lift * 0.5, background: "radial-gradient(closest-side, rgba(0,0,0,0.6), rgba(0,0,0,0))", filter: "blur(3px)" }}
      />
      <div
        aria-hidden
        className="absolute"
        style={{
          left: x + 2,
          top: y - lift + h - 4,
          width: w - 4,
          height: lift + 6,
          borderRadius: "0 0 2px 2px",
          background:
            "linear-gradient(90deg, rgba(40,25,10,0.35), rgba(40,25,10,0) 14%, rgba(40,25,10,0) 86%, rgba(40,25,10,0.35)), repeating-linear-gradient(180deg, #efe5cd 0 0.9px, #ad9a76 0.9px 1.5px, #e0d3b5 1.5px 2.3px)",
          boxShadow: "0 2px 3px rgba(0,0,0,0.5)",
        }}
      />
    </>
  );
}

/* ───────────────────────────── Đèn bão tín hiệu ───────────────────────────── */

function Lantern({ L, lit }: { L: Layout; lit: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const k = L.lamp.k;
  const W = 72 * k;
  const H = 104 * k;
  return (
    <div aria-hidden className="pointer-events-none absolute" style={{ left: L.lamp.cx - W / 2, top: 0, width: W, height: H, zIndex: 45 }}>
      <svg viewBox="0 0 72 104" width={W} height={H} className="overflow-visible" style={{ filter: lit ? "none" : "drop-shadow(5px 7px 4px rgba(0,0,0,0.65))" }}>
        <defs>
          <linearGradient id={`t${uid}`} x1="0" x2="1">
            <stop offset="0" stopColor="#24211d" />
            <stop offset="0.32" stopColor="#857d70" />
            <stop offset="0.55" stopColor="#4a453e" />
            <stop offset="1" stopColor="#171512" />
          </linearGradient>
          <radialGradient id={`off${uid}`} cx="0.36" cy="0.4" r="0.66">
            <stop offset="0" stopColor="#3b1410" />
            <stop offset="0.5" stopColor="#24090a" />
            <stop offset="1" stopColor="#0e0405" />
          </radialGradient>
          <radialGradient id={`on${uid}`} cx="0.5" cy="0.62" r="0.62">
            <stop offset="0" stopColor="#ffe9c2" />
            <stop offset="0.13" stopColor="#ff9a5c" />
            <stop offset="0.36" stopColor="#e9301d" />
            <stop offset="0.74" stopColor="#a3120a" />
            <stop offset="1" stopColor="#4e0703" />
          </radialGradient>
          <radialGradient id={`f${uid}`} cx="0.5" cy="0.7" r="0.6">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.4" stopColor="#fff1b8" />
            <stop offset="1" stopColor="#ff9a3c" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* dây treo, quai xách */}
        <path d="M36 -40 V12" stroke="#120e0b" strokeWidth="1.6" />
        <path d="M13 47 C 11 16, 61 16, 59 47" fill="none" stroke="#1a1714" strokeWidth="2.3" />
        <path d="M13 47 C 11 16, 61 16, 59 47" fill="none" stroke="rgba(255,240,220,0.2)" strokeWidth="0.8" transform="translate(-0.6,-0.6)" />
        {/* nắp chụp, ống thông hơi */}
        <rect x="29" y="11" width="14" height="9" rx="1.6" fill={`url(#t${uid})`} />
        <path d="M23.5 31 L48.5 31 L44 20 L28 20 Z" fill={`url(#t${uid})`} />
        <rect x="21.5" y="30" width="29" height="5.5" rx="1.6" fill={`url(#t${uid})`} />
        {/* bầu kính */}
        <path d="M25 35 C 8.5 46, 8.5 74, 26 84.5 L46 84.5 C 63.5 74, 63.5 46, 47 35 Z" fill={lit ? `url(#on${uid})` : `url(#off${uid})`} />
        {lit && (
          <motion.g style={{ transformOrigin: "36px 74px" }} animate={{ scaleY: [1, 1.12, 0.94, 1.06, 1], scaleX: [1, 0.94, 1.04, 0.97, 1] }} transition={{ duration: 0.7, repeat: Infinity }}>
            <ellipse cx="36" cy="64" rx="9" ry="14" fill={`url(#f${uid})`} />
            <path d="M36 75 C 31.5 69, 33 61, 36 54 C 39 61, 40.5 69, 36 75 Z" fill="#fffbe8" />
          </motion.g>
        )}
        {!lit && <path d="M34.6 76 h2.8 v-5 h-2.8 z" fill="#2a1a12" />}
        {/* lưới bảo vệ */}
        <path d="M27 35 C 14.5 48, 14.5 72, 28 84.5" stroke="#110f0d" strokeWidth="1.5" fill="none" />
        <path d="M45 35 C 57.5 48, 57.5 72, 44 84.5" stroke="#110f0d" strokeWidth="1.5" fill="none" />
        <path d="M36 35 V 84.5" stroke="#110f0d" strokeWidth="1.2" />
        <ellipse cx="36" cy="59" rx="21" ry="2.2" fill="none" stroke="#110f0d" strokeWidth="1.3" />
        {/* vệt sáng trên kính */}
        <path d="M18.5 50 C 16.5 58, 17.5 67, 21.5 75" stroke={lit ? "rgba(255,246,230,0.6)" : "rgba(255,226,210,0.5)"} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <path d="M50.5 43.5 C 52.5 46.5, 53.5 50, 54 53.5" stroke="rgba(255,226,210,0.3)" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        {/* bình dầu */}
        <path d="M19.5 84 L52.5 84 L57.5 96 Q36 102.5 14.5 96 Z" fill={`url(#t${uid})`} />
        <ellipse cx="36" cy="84.2" rx="16.5" ry="2.4" fill="#26221e" />
        <ellipse cx="36" cy="96.6" rx="21.5" ry="4" fill={`url(#t${uid})`} />
        <circle cx="57.5" cy="88.5" r="2.7" fill={`url(#t${uid})`} />
        {lit && <path d="M19.5 84 L52.5 84 L57.5 96 Q36 102.5 14.5 96 Z" fill="rgba(255,70,40,0.28)" />}
      </svg>
    </div>
  );
}

function PatrolSlip({ L }: { L: Layout }) {
  return (
    <motion.div
      className="sheet absolute px-[10px] pb-[6px] pt-[7px] shadow-[0_6px_10px_-3px_rgba(0,0,0,0.75),0_1px_2px_rgba(0,0,0,0.5)]"
      style={{ left: L.slip.x, top: L.slip.y, zIndex: 50 }}
      initial={{ opacity: 0, scale: 1.45, rotate: -9 }}
      animate={{ opacity: 1, scale: 1, rotate: -3 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ type: "spring", stiffness: 700, damping: 26 }}
    >
      <span className="stamp whitespace-nowrap text-[21px] text-stamp">Lính tuần!</span>
    </motion.div>
  );
}

function BustStamp({ L }: { L: Layout }) {
  return (
    <motion.div
      className="pointer-events-none absolute grid place-items-center"
      style={{ left: L.stack.x - 30, top: L.stack.y + L.sheet.h * 0.28, width: L.sheet.w + 60, zIndex: 60 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
    >
      <Stamp ink="red" rotate={-11} className="whitespace-nowrap border-[4px] text-[46px]">
        Bị lộ!
      </Stamp>
    </motion.div>
  );
}

/** Mảnh giấy ghim trên vách: đếm số tờ đã in (và số lần bị lộ). */
function Tally({ L, count, exposures }: { L: Layout; count: number; exposures: number }) {
  return (
    <div
      className="sheet absolute rounded-[1px] px-[11px] pb-[8px] pt-[11px] shadow-[0_8px_12px_-4px_rgba(0,0,0,0.8),0_1px_2px_rgba(0,0,0,0.5)]"
      style={{ left: L.note.x, top: L.note.y, width: L.note.w, rotate: "-2deg", zIndex: 50 }}
    >
      <span
        aria-hidden
        className="absolute left-1/2 top-[4px] h-[6px] w-[6px] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(circle at 35% 30%, #e0d9c9, #6a6357 55%, #26221d)", boxShadow: "0 1px 1.5px rgba(0,0,0,0.7)" }}
      />
      <div className="flex items-baseline gap-[6px] whitespace-nowrap" aria-live="polite">
        <span className="font-head text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-2">Đã in:</span>
        <motion.span
          key={count}
          initial={{ scale: 1.25 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 600, damping: 20 }}
          className="inline-block origin-bottom font-head text-[30px] font-bold leading-none text-ink"
        >
          {count}
        </motion.span>
        <span className="font-head text-[14px] font-semibold uppercase tracking-[0.08em] text-ink-2">tờ</span>
      </div>
      {exposures > 0 && <div className="mt-[3px] font-head text-[12px] font-semibold uppercase tracking-[0.12em] text-stamp">Bị lộ: {exposures} lần</div>}
    </div>
  );
}
