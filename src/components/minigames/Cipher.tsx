"use client";

import { AnimatePresence, animate, motion, useMotionValue, type AnimationPlaybackControls } from "motion/react";
import { MailOpen } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Btn } from "@/components/kit/Btn";
import { Stamp } from "@/components/kit/Stamp";
import { Typed } from "@/components/kit/Typed";
import { cn } from "@/lib/cn";
import { WoodSurface, isTypingTarget, mulberry32, useBox, useFinishOnce } from "./shared";
import type { MiniProps } from "./types";

/*
 * "Mật thư cuối cùng" (đầu năm 1935): đĩa mã bằng đồng, vòng trong cố định, vòng ngoài xoay được.
 * Không có chìa khóa gửi kèm: mỗi lượt chơi dùng một độ dịch k riêng (lấy từ mốc bắt đầu, k từ 3 đến 23, trừ 13),
 * nên các bạn cùng lớp không thể chép đáp án của nhau. Bản mã = bản rõ dịch tới k chữ.
 * Manh mối duy nhất: mọi bức điện đều mở đầu bằng hai chữ ĐẠI HỘI (tấn công bằng bản rõ đã biết).
 * Người chơi xoay vòng ngoài cho tới khi dòng bút chì dưới bức điện đọc ra DAI HOI…; lúc đó chữ A của vòng ngoài
 * nằm thẳng chữ thứ k của vòng trong (vị trí lời giải, xem data-key).
 * Bức điện viết bằng chữ không dấu như điện tín thời ấy; dòng bút chì là chữ đọc được theo vị trí đĩa hiện tại.
 * Sau 14 giây chưa giải, mũi tên phấn chỉ chiều xoay ngắn hơn tới lời giải.
 * Giải được: 1000 − 600 × thời gian đã dùng / thời gian cho phép (400–1000 điểm). Hết giờ chưa giải: 0 điểm.
 */

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const N = 26;
const STEP = 360 / N;
const HINT_AFTER = 14;
const PLAIN = ["DAI HOI NGAY 27", "THANG 3 TAI MA CAO"];
const ACCENTED = ["ĐẠI HỘI NGÀY 27", "THÁNG 3 TẠI MA CAO"];

const mod = (a: number) => ((a % N) + N) % N;
const shiftText = (s: string, k: number) => s.replace(/[A-Z]/g, (c) => ALPHA[mod(c.charCodeAt(0) - 65 + k)]);
/* Màn hẹp: cả bức điện trên một băng giấy để nhường chỗ cho đĩa. */
const ACCENTED_ONE = [ACCENTED.join(" ")];

/** Độ dịch của lượt chơi (3–23, trừ 13) và vị trí xuất phát của vòng ngoài, cách lời giải 5–13 nấc. */
function pickKey(seed: number) {
  const rnd = mulberry32(Math.floor(seed) ^ 0x6c8e9cf5);
  const keys = Array.from({ length: 21 }, (_, i) => i + 3).filter((k) => k !== 13);
  const key = keys[Math.floor(rnd() * keys.length) % keys.length];
  const dist = 5 + (Math.floor(rnd() * 9) % 9);
  const start = mod(key + (rnd() < 0.5 ? -dist : dist));
  return { key, start };
}

/* Hình học đĩa trong khung 440 × 440. */
const VB = 440;
const C = VB / 2;
const R_OUT = 192;
const R_KNURL = 182;
const R_RING_IN = 145;
const R_LET_O = 163;
const R_IN = 138;
const R_BAND_O = 134;
const R_BAND_I = 101;
const R_LET_I = 117.5;

const polar = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)] as const;
};
const annulus = (r1: number, r2: number) =>
  `M${C - r1},${C} a${r1},${r1} 0 1,0 ${r1 * 2},0 a${r1},${r1} 0 1,0 ${-r1 * 2},0 Z M${C - r2},${C} a${r2},${r2} 0 1,1 ${r2 * 2},0 a${r2},${r2} 0 1,1 ${-r2 * 2},0 Z`;
const sector = (r1: number, r2: number, a1: number, a2: number) => {
  const [x1, y1] = polar(r1, a1);
  const [x2, y2] = polar(r1, a2);
  const [x3, y3] = polar(r2, a2);
  const [x4, y4] = polar(r2, a1);
  return `M${x1},${y1} A${r1},${r1} 0 0 1 ${x2},${y2} L${x3},${y3} A${r2},${r2} 0 0 0 ${x4},${y4} Z`;
};
const arc = (r: number, a1: number, a2: number) => {
  const [x1, y1] = polar(r, a1);
  const [x2, y2] = polar(r, a2);
  return `M${x1},${y1} A${r},${r} 0 0 ${a2 > a1 ? 1 : 0} ${x2},${y2}`;
};

interface Lay {
  mode: "row" | "col";
  p: number;
  f: number;
  teleW: number;
  oneLine: boolean;
  keySlip: boolean;
}

/** Chọn bố cục cho đĩa to nhất mà chữ trên bức điện vẫn đọc được. */
function plan(w: number, h: number): Lay {
  const p = Math.round(Math.max(8, Math.min(14, Math.min(w, h) * 0.03)));
  const em = 15.6; // bề ngang bức điện hai dòng, tính theo cỡ chữ (18 ký tự đơn cách và lề)
  // Ngang: đĩa bên trái, bức điện bên phải.
  let teleW = Math.max(12 * em, w - Math.min(h - 2 * p, w * 0.6) - 3 * p);
  const dRow = Math.min(h - 2 * p, w - teleW - 3 * p);
  teleW = w - dRow - 3 * p;
  // Cột phải phải chứa được bức điện (khoảng 13 lần cỡ chữ) và nút Đọc thư; còn chỗ thì thêm mẩu giấy chìa khóa.
  const fRow = Math.min(19, teleW / em, (h - 2 * p - 58) / 13);
  const keySlip = h - 2 * p >= fRow * 17.6 + 58;
  // Dọc, bức điện hai dòng.
  const f2 = Math.max(11, Math.min(17, (w - 2 * p) / em, (h * 0.4) / 10.6));
  const d2 = Math.min(w - 2 * p - 20, h - f2 * 10.2 - 3 * p);
  // Dọc, bức điện một dòng (34 ký tự).
  const f1 = Math.min(15, (w - 2 * p) / 27.4);
  const d1 = f1 >= 11.5 ? Math.min(w - 2 * p - 20, h - f1 * 6.6 - 3 * p) : 0;
  const row = fRow >= 11 ? dRow : 0;
  if (row >= d2 && row >= d1) return { mode: "row", p, f: fRow, teleW, oneLine: false, keySlip };
  return d1 > d2
    ? { mode: "col", p, f: f1, teleW: w - 2 * p, oneLine: true, keySlip: false }
    : { mode: "col", p, f: f2, teleW: w - 2 * p, oneLine: false, keySlip: false };
}

export function Cipher({ seconds, startedAt, onFinish }: MiniProps) {
  const [t0] = useState(startedAt);
  const [secs] = useState(seconds);
  // Độ dịch và vị trí ban đầu của vòng ngoài: lấy từ mốc bắt đầu (tải lại trang vẫn là đề cũ), luôn cách lời giải khá xa.
  const [{ key: KEY, start: k0 }] = useState(() => pickKey(startedAt));
  const cipher = useMemo(() => PLAIN.map((l) => shiftText(l, KEY)), [KEY]);
  const cipherOne = useMemo(() => [cipher.join(" ")], [cipher]);
  const finish = useFinishOnce(onFinish);
  const [boxRef, box] = useBox<HTMLDivElement>();

  const [k, setK] = useState(k0);
  const [solved, setSolved] = useState(false);
  const [ended, setEnded] = useState(false);
  const [hint, setHint] = useState(false);
  const [dragging, setDragging] = useState(false);

  const rot = useMotionValue(k0 * STEP);
  const kRef = useRef(k0);
  const scoreRef = useRef<number | null>(null);
  const endedRef = useRef(false);
  const drag = useRef<{ id: number; last: number; raw: number; cx: number; cy: number } | null>(null);
  const spin = useRef<AnimationPlaybackControls | null>(null);
  const readBtn = useRef<HTMLButtonElement>(null);

  const settle = useCallback(
    (target: number) => {
      spin.current?.stop();
      spin.current = animate(rot, target * STEP, { type: "spring", stiffness: 520, damping: 32, mass: 0.7 });
    },
    [rot],
  );

  const trySolve = useCallback(
    (kk: number) => {
      if (scoreRef.current !== null || endedRef.current || mod(kk) !== KEY) return;
      const used = (Date.now() - t0) / 1000;
      if (used >= secs) return;
      scoreRef.current = Math.round(1000 - 600 * Math.max(0, Math.min(1, used / secs)));
      setSolved(true);
    },
    [KEY, secs, t0],
  );

  const locked = () => scoreRef.current !== null || endedRef.current;

  const step = useCallback(
    (d: number) => {
      if (scoreRef.current !== null || endedRef.current) return;
      const next = kRef.current + d;
      kRef.current = next;
      setK(next);
      settle(next);
      trySolve(next);
    },
    [settle, trySolve],
  );

  // Hết giờ: nếu đã giải thì vẫn tính điểm lúc giải, chưa giải thì 0 điểm.
  useEffect(() => {
    const id = window.setTimeout(
      () => {
        endedRef.current = true;
        setEnded(true);
        finish(scoreRef.current ?? 0);
      },
      Math.max(0, t0 + secs * 1000 - Date.now()),
    );
    return () => window.clearTimeout(id);
  }, [finish, secs, t0]);

  // Sau 14 giây chưa giải: hiện mũi tên vẽ phấn chỉ chiều xoay (chiều ngắn hơn tới lời giải).
  useEffect(() => {
    const id = window.setTimeout(() => setHint(true), Math.max(0, t0 + HINT_AFTER * 1000 - Date.now()));
    return () => window.clearTimeout(id);
  }, [t0]);

  useEffect(() => {
    if (!solved) return;
    const id = window.setTimeout(() => readBtn.current?.focus({ preventScroll: true }), 1100);
    return () => window.clearTimeout(id);
  }, [solved]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const d = e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : 0;
      if (!d) return;
      e.preventDefault();
      step(d);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (locked() || (e.pointerType === "mouse" && e.button !== 0)) return;
    const r = e.currentTarget.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    if (Math.hypot(dx, dy) > (r.width / 2) * ((R_OUT + 8) / C)) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    spin.current?.stop();
    drag.current = { id: e.pointerId, last: Math.atan2(dy, dx), raw: rot.get(), cx, cy };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.cx;
    const dy = e.clientY - d.cy;
    if (Math.hypot(dx, dy) < 8) return;
    const a = Math.atan2(dy, dx);
    let delta = a - d.last;
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;
    d.last = a;
    d.raw += (delta * 180) / Math.PI;
    // Khấc hãm: vòng đĩa bám theo tay nhưng hút về từng nấc chữ.
    const near = Math.round(d.raw / STEP);
    rot.set(near * STEP + (d.raw - near * STEP) * 0.35);
    if (near !== kRef.current) {
      kRef.current = near;
      setK(near);
    }
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    setDragging(false);
    settle(kRef.current);
    trySolve(kRef.current);
  };

  const read = () => {
    if (scoreRef.current === null) return;
    endedRef.current = true;
    setEnded(true);
    finish(scoreRef.current);
  };

  const lay = plan(box.w || 720, box.h || 440);
  const kk = mod(k);
  const dir = mod(KEY - kk) <= N / 2 ? 1 : -1;
  const showHint = hint && !solved && !ended;

  const disk = (
    <DiskArea>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Đĩa mã: kéo vòng ngoài để xoay"
        aria-valuemin={0}
        aria-valuemax={N - 1}
        aria-valuenow={kk}
        aria-valuetext={`Chữ A của vòng ngoài đang thẳng chữ ${ALPHA[kk]} của vòng trong`}
        className={cn(
          "relative aspect-square touch-none select-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-gold/70",
          solved || ended ? "cursor-default" : dragging ? "cursor-grabbing" : "cursor-grab",
        )}
        style={{ width: "min(100cqw, 100cqh)" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        <DiskBase solved={solved} keyK={KEY} />
        <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ rotate: rot }}>
          <OuterRing dragging={dragging} hintDir={showHint ? dir : 0} />
        </motion.div>
        <TurnButton dir={-1} disabled={solved || ended} onPress={() => step(-1)} />
        <TurnButton dir={1} disabled={solved || ended} onPress={() => step(1)} />
      </div>
      {lay.mode === "col" && (
        <ReadButton show={solved} disabled={ended} onRead={read} btnRef={readBtn} className="absolute inset-x-0 bottom-1 flex justify-center" />
      )}
    </DiskArea>
  );

  return (
    <div
      ref={boxRef}
      className="relative h-full w-full select-none overflow-hidden bg-[#1a110a]"
      data-game="cipher"
      data-k={kk}
      data-key={KEY}
      data-solved={solved ? 1 : 0}
      data-ended={ended ? 1 : 0}
    >
      <DeskBackground />
      <TypeFilter />
      {box.w > 0 &&
        (lay.mode === "row" ? (
          <div className="absolute inset-0 flex items-stretch" style={{ padding: lay.p, gap: lay.p }}>
            {disk}
            <div className="flex shrink-0 flex-col" style={{ width: lay.teleW }}>
              <Telegram k={k} solved={solved} f={lay.f} lines={cipher} />
              {lay.keySlip && <KeySlip f={lay.f} />}
              <ReadButton show={solved} disabled={ended} onRead={read} btnRef={readBtn} className="flex flex-1 items-center justify-center pt-2" />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col" style={{ padding: lay.p, gap: lay.p }}>
            <Telegram k={k} solved={solved} f={lay.f} compact lines={lay.oneLine ? cipherOne : cipher} oneLine={lay.oneLine} />
            {disk}
          </div>
        ))}
    </div>
  );
}

/** Ô chứa đĩa: là "container" để đĩa luôn vuông và vừa khít chỗ còn lại. */
function DiskArea({ children }: { children: React.ReactNode }) {
  return <div className="relative grid min-h-0 min-w-0 flex-1 place-items-center [container-type:size]">{children}</div>;
}

function ReadButton({
  show,
  disabled,
  onRead,
  btnRef,
  className,
}: {
  show: boolean;
  disabled: boolean;
  onRead: () => void;
  btnRef: React.RefObject<HTMLButtonElement | null>;
  className?: string;
}) {
  return (
    <div className={cn("pointer-events-none z-20", className)}>
      <AnimatePresence>
        {show && (
          <motion.div className="pointer-events-auto" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.3 }}>
            <Btn ref={btnRef} tone="red" size="md" onClick={onRead} disabled={disabled}>
              <MailOpen className="h-[18px] w-[18px]" aria-hidden />
              Đọc thư
            </Btn>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────────── Bàn làm việc ───────────────────────────── */

function DeskBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <WoodSurface seed={21} plank={82} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 65% 75% at 40% 42%, rgba(255,198,130,0.2), transparent 70%)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 120% 115% at 45% 40%, transparent 45%, rgba(0,0,0,0.66) 100%)" }} />
    </div>
  );
}

function TypeFilter() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <filter id="mn-type" x="-3%" y="-10%" width="106%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="0.9" xChannelSelector="R" yChannelSelector="G" result="d" />
        <feTurbulence type="fractalNoise" baseFrequency="0.16" numOctaves="2" seed="9" result="s" />
        <feColorMatrix in="s" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.2 1.5" result="m" />
        <feComposite in="d" in2="m" operator="in" />
      </filter>
    </svg>
  );
}

/* ───────────────────────────── Bức điện ───────────────────────────── */

function Telegram({
  k,
  solved,
  f,
  lines,
  compact = false,
  oneLine = false,
}: {
  k: number;
  solved: boolean;
  f: number;
  lines: string[];
  compact?: boolean;
  oneLine?: boolean;
}) {
  const plain = oneLine ? ACCENTED_ONE : ACCENTED;
  return (
    <div className="relative shrink-0" style={{ fontSize: f }}>
      <div
        className="sheet relative rounded-[2px] shadow-[0_14px_22px_-10px_rgba(0,0,0,0.85),0_2px_4px_rgba(0,0,0,0.45)]"
        style={{ padding: compact ? "0.55em 0.75em 0.6em" : "0.8em 0.9em 0.7em", rotate: compact ? "-0.4deg" : "-0.8deg" }}
      >
        <div className="relative flex items-baseline justify-between gap-2 border-b-[0.22em] border-double border-ink/70 pb-[0.3em]">
          <span className="font-head text-[0.95em] font-bold uppercase leading-none tracking-[0.32em] text-ink">Điện tín</span>
          <span className="whitespace-nowrap font-type text-[0.62em] leading-none text-ink-2">Số chữ: 9</span>
        </div>
        <div className={compact ? "relative mt-[0.45em] space-y-[0.3em]" : "relative mt-[0.7em] space-y-[0.5em]"}>
          {lines.map((line, i) => (
            <div key={i}>
              <Tape text={line} tilt={i ? 0.5 : -0.4} />
              <Decoded cipher={line} plain={plain[i]} k={k} delay={i * 0.45} solved={solved} />
            </div>
          ))}
        </div>
        {!compact && (
          <div className="relative mt-[0.4em] flex items-end gap-[0.45em] text-[0.6em] text-ink-3" style={{ height: "3.4em" }}>
            <span aria-hidden className="mb-[0.3em] inline-block h-[0.14em] w-[2.2em] rounded-full bg-[#6d6a63] opacity-80" />
            <span className="label leading-none" style={{ fontSize: "1em" }}>
              Dòng chì: đọc theo đĩa
            </span>
          </div>
        )}
        <AnimatePresence>
          {solved && (
            <motion.div
              key="st"
              className="pointer-events-none absolute"
              style={compact ? { right: "0.4em", top: "0.05em" } : { right: "0.7em", bottom: "0.45em" }}
              exit={{ opacity: 0 }}
            >
              <Stamp ink="red" rotate={compact ? -6 : -9} delay={0.45} className={compact ? "text-[1.05em]" : "text-[1.3em]"}>
                Đã giải mã
              </Stamp>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Mẩu giấy ghi manh mối: không có chìa khóa, chỉ biết chữ mở đầu của bức điện. */
function KeySlip({ f }: { f: number }) {
  return (
    <div className="relative mt-[0.9em] self-start" style={{ fontSize: f * 0.82 }}>
      <div
        className="sheet relative px-[0.8em] pb-[0.55em] pt-[0.6em] shadow-[0_8px_14px_-6px_rgba(0,0,0,0.8),0_1px_2px_rgba(0,0,0,0.4)]"
        style={{ rotate: "1.6deg", clipPath: "polygon(0 0, 100% 2%, 99% 100%, 62% 97%, 30% 100%, 1% 98%)" }}
      >
        <div className="relative font-head text-[0.72em] font-semibold uppercase tracking-[0.16em] text-stamp">Manh mối</div>
        <div className="relative mt-[0.2em] whitespace-nowrap font-type text-[1em] font-bold leading-tight text-ink">Điện mở đầu bằng:</div>
        <div className="relative whitespace-nowrap font-type text-[1.12em] font-bold leading-tight tracking-[0.12em] text-ink">ĐẠI HỘI</div>
      </div>
    </div>
  );
}

/** Băng giấy điện báo dán lên mẫu điện tín: chữ in hoa không dấu, mép cắt răng cưa. */
function Tape({ text, tilt }: { text: string; tilt: number }) {
  return (
    <div
      className="relative inline-block"
      style={{
        rotate: `${tilt}deg`,
        background: "linear-gradient(180deg, #f6f1e2, #ece5d2)",
        padding: "0.2em 0.5em 0.16em",
        clipPath: "polygon(0 6%, 1.4% 0, 98.6% 4%, 100% 0, 99.2% 50%, 100% 100%, 98.4% 95%, 1.2% 100%, 0 94%, 0.9% 50%)",
        boxShadow: "0 1px 1.5px rgba(0,0,0,0.35)",
      }}
    >
      <span className="whitespace-pre font-type font-bold leading-[1.3] tracking-[0.12em] text-[#1d1712]" style={{ filter: "url(#mn-type)" }}>
        {text}
      </span>
    </div>
  );
}

/** Dòng giải mã bằng bút chì, thẳng cột với chữ trên băng. Giải xong thì đánh lại bằng mực, có dấu. */
function Decoded({ cipher, plain, k, delay, solved }: { cipher: string; plain: string; k: number; delay: number; solved: boolean }) {
  return (
    <div className="relative h-[1.42em]" style={{ paddingLeft: "0.5em" }}>
      {solved ? (
        <Typed text={plain} cps={34} delay={delay} cursor={false} className="whitespace-pre font-type font-bold leading-[1.42] tracking-[0.12em] text-ink" />
      ) : (
        <span className="whitespace-pre font-type leading-[1.42] tracking-[0.12em] text-[#4a463f]">{shiftText(cipher, -k)}</span>
      )}
    </div>
  );
}

/* ───────────────────────────── Đĩa mã ───────────────────────────── */

const KNURLS = Array.from({ length: 120 }, (_, i) => i * 3);
const LETTERS = ALPHA.split("");

/** Phần cố định: thân vòng ngoài (đồng thau), rãnh, mặt đĩa trong (đồng đỏ) với vòng chữ trong, ốc vít, chốt giữa. */
function DiskBase({ solved, keyK }: { solved: boolean; keyK: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute rounded-full" style={{ inset: "8%", boxShadow: "0 22px 34px -8px rgba(0,0,0,0.8), 0 6px 10px rgba(0,0,0,0.55)" }} />
      <svg aria-hidden viewBox={`0 0 ${VB} ${VB}`} className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id={`br${uid}`} gradientUnits="userSpaceOnUse" cx={C} cy={C} r={R_OUT}>
            <stop offset={R_RING_IN / R_OUT} stopColor="#6e4b18" />
            <stop offset={(R_RING_IN + 4) / R_OUT} stopColor="#c69c4e" />
            <stop offset="0.86" stopColor="#e9cb7e" />
            <stop offset="0.925" stopColor="#c5974a" />
            <stop offset="0.955" stopColor="#8d6324" />
            <stop offset="1" stopColor="#4f3410" />
          </radialGradient>
          <radialGradient id={`bz${uid}`} gradientUnits="userSpaceOnUse" cx={C - 30} cy={C - 40} r={R_IN * 1.25}>
            <stop offset="0" stopColor="#c99459" />
            <stop offset="0.55" stopColor="#a06a36" />
            <stop offset="1" stopColor="#6a3f1a" />
          </radialGradient>
          <linearGradient id={`li${uid}`} x1="0.15" y1="0.08" x2="0.85" y2="0.95">
            <stop offset="0" stopColor="#fff7dd" stopOpacity="0.38" />
            <stop offset="0.48" stopColor="#fff7dd" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.4" />
          </linearGradient>
          <radialGradient id={`rv${uid}`} cx="0.38" cy="0.32" r="0.7">
            <stop offset="0" stopColor="#fff2c4" />
            <stop offset="0.45" stopColor="#c8994a" />
            <stop offset="1" stopColor="#5a3b10" />
          </radialGradient>
          <filter id={`pt${uid}`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed="12" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.18  0 0 0 0 0.11  0 0 0 0 0.03  0 0 0 1.5 -0.55" />
          </filter>
          <filter id={`wr${uid}`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="5" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.08  0 0 0 0 0.16  0 0 0 0 0.1  0 0 0 2.2 -1.25" />
          </filter>
          <clipPath id={`cl${uid}`}>
            <circle cx={C} cy={C} r={R_OUT} />
          </clipPath>
        </defs>

        {/* thân vòng ngoài */}
        <path d={annulus(R_OUT, R_RING_IN)} fill={`url(#br${uid})`} fillRule="evenodd" />
        <path d={annulus(R_OUT, R_RING_IN)} fill={`url(#li${uid})`} fillRule="evenodd" />
        {/* rãnh giữa hai vòng */}
        <circle cx={C} cy={C} r={R_RING_IN} fill="#160e05" />
        <circle cx={C} cy={C} r={R_RING_IN - 1} fill="none" stroke="rgba(255,226,160,0.22)" strokeWidth="1" />
        {/* mặt đĩa trong */}
        <circle cx={C} cy={C} r={R_IN} fill={`url(#bz${uid})`} />
        <circle cx={C} cy={C} r={R_IN} fill={`url(#li${uid})`} />
        <circle cx={C} cy={C} r={R_IN - 0.8} fill="none" stroke="rgba(255,236,190,0.45)" strokeWidth="1.2" />
        <path d={annulus(R_BAND_O, R_BAND_I)} fill="rgba(50,24,6,0.2)" fillRule="evenodd" />
        <circle cx={C} cy={C} r={R_BAND_O} fill="none" stroke="rgba(40,18,4,0.7)" strokeWidth="1.2" />
        <circle cx={C} cy={C} r={R_BAND_O - 1.4} fill="none" stroke="rgba(255,232,180,0.3)" strokeWidth="0.8" />
        <circle cx={C} cy={C} r={R_BAND_I} fill="none" stroke="rgba(40,18,4,0.7)" strokeWidth="1.2" />
        <circle cx={C} cy={C} r={R_BAND_I + 1.4} fill="none" stroke="rgba(255,232,180,0.3)" strokeWidth="0.8" />
        {LETTERS.map((_, i) => {
          const [x1, y1] = polar(R_BAND_I, (i + 0.5) * STEP);
          const [x2, y2] = polar(R_BAND_O, (i + 0.5) * STEP);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(40,18,4,0.55)" strokeWidth="1" />;
        })}
        {LETTERS.map((ch, i) => (
          <g key={ch} transform={`rotate(${i * STEP} ${C} ${C})`}>
            <text x={C} y={C - R_LET_I + 7.8} textAnchor="middle" className="font-head" fontSize="21.5" fontWeight="600" fill="rgba(255,236,196,0.5)" transform="translate(0,0.9)">
              {ch}
            </text>
            <text x={C} y={C - R_LET_I + 7.8} textAnchor="middle" className="font-head" fontSize="21.5" fontWeight="600" fill="#2a1606">
              {ch}
            </text>
          </g>
        ))}
        {/* hoa văn tiện tròn ở giữa */}
        {[94, 90, 62, 58].map((r) => (
          <circle key={r} cx={C} cy={C} r={r} fill="none" stroke={r % 4 ? "rgba(255,232,180,0.28)" : "rgba(40,18,4,0.5)"} strokeWidth="0.9" />
        ))}
        {Array.from({ length: 48 }, (_, i) => {
          const [x1, y1] = polar(64, i * 7.5);
          const [x2, y2] = polar(88, i * 7.5 + 22);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(50,24,6,0.22)" strokeWidth="0.7" />;
        })}
        {[45, 135, 225, 315].map((a) => {
          const [x, y] = polar(76, a);
          return (
            <g key={a}>
              <circle cx={x + 0.8} cy={y + 1.4} r="7.4" fill="rgba(0,0,0,0.35)" />
              <circle cx={x} cy={y} r="7" fill={`url(#rv${uid})`} />
              <line x1={x - 5} y1={y + 2.2} x2={x + 5} y2={y - 2.2} stroke="#3a2507" strokeWidth="1.6" strokeLinecap="round" />
            </g>
          );
        })}
        <circle cx={C + 1} cy={C + 2.5} r="21" fill="rgba(0,0,0,0.4)" />
        <circle cx={C} cy={C} r="20" fill={`url(#rv${uid})`} />
        <circle cx={C} cy={C} r="12.5" fill="none" stroke="rgba(60,38,8,0.55)" strokeWidth="1.2" />
        <circle cx={C} cy={C} r="4" fill="#4a300c" />
        {/* mòn, xỉn, gỉ xanh lấm tấm */}
        <g clipPath={`url(#cl${uid})`} style={{ mixBlendMode: "multiply" }} opacity="0.35">
          <rect width={VB} height={VB} filter={`url(#pt${uid})`} />
        </g>
        <g clipPath={`url(#cl${uid})`} opacity="0.22">
          <rect width={VB} height={VB} filter={`url(#wr${uid})`} />
        </g>
        {/* nét chì khoanh cặp chữ đã khớp */}
        {solved && (
          <motion.path
            d={(() => {
              const [x, y] = polar((R_LET_I + R_LET_O) / 2, keyK * STEP);
              return `M${x - 17},${y} a17,52 0 1,0 34,0 a17,52 0 1,0 -34,0`;
            })()}
            transform={`rotate(${keyK * STEP} ${polar((R_LET_I + R_LET_O) / 2, keyK * STEP).join(" ")})`}
            fill="none"
            stroke="#b3261e"
            strokeWidth="2.6"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.8 }}
            transition={{ delay: 0.15, duration: 0.55, ease: "easeOut" }}
          />
        )}
      </svg>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          mixBlendMode: "overlay",
          background:
            "conic-gradient(from 18deg, rgba(255,250,230,0) 0deg, rgba(255,250,230,0.5) 26deg, rgba(255,250,230,0) 62deg, rgba(0,0,0,0.28) 104deg, rgba(255,250,230,0) 146deg, rgba(255,250,230,0.38) 205deg, rgba(255,250,230,0) 244deg, rgba(0,0,0,0.3) 292deg, rgba(255,250,230,0) 340deg)",
          WebkitMaskImage: `radial-gradient(circle closest-side, #000 ${(R_OUT / C) * 100 - 0.4}%, transparent ${(R_OUT / C) * 100}%)`,
          maskImage: `radial-gradient(circle closest-side, #000 ${(R_OUT / C) * 100 - 0.4}%, transparent ${(R_OUT / C) * 100}%)`,
        }}
      />
    </>
  );
}

/** Phần xoay: khía nhám mép ngoài, vòng chữ ngoài, ô chữ A tráng men đỏ có mũi chỉ, và mũi tên gợi ý vẽ chì. */
function OuterRing({ dragging, hintDir }: { dragging: boolean; hintDir: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const h = STEP / 2;
  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} className="absolute inset-0 h-full w-full overflow-visible">
      <defs>
        <linearGradient id={`en${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b52a1d" />
          <stop offset="1" stopColor="#6d1209" />
        </linearGradient>
        <filter id={`sk${uid}`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      {/* khía nhám */}
      {KNURLS.map((a) => {
        const [x1, y1] = polar(R_KNURL + 0.5, a);
        const [x2, y2] = polar(R_OUT - 0.8, a);
        const [x3, y3] = polar(R_KNURL + 0.5, a + 1.3);
        const [x4, y4] = polar(R_OUT - 0.8, a + 1.3);
        return (
          <g key={a}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(52,32,6,0.75)" strokeWidth="1.3" />
            <line x1={x3} y1={y3} x2={x4} y2={y4} stroke="rgba(255,238,190,0.5)" strokeWidth="0.9" />
          </g>
        );
      })}
      <circle cx={C} cy={C} r={R_KNURL} fill="none" stroke="rgba(52,32,6,0.6)" strokeWidth="1.2" />
      <circle cx={C} cy={C} r={R_KNURL - 1.3} fill="none" stroke="rgba(255,238,190,0.35)" strokeWidth="0.8" />
      {/* ô chữ A tráng men đỏ */}
      <path d={sector(R_KNURL - 3, R_RING_IN + 2, -h + 0.6, h - 0.6)} fill={`url(#en${uid})`} stroke="rgba(40,8,2,0.6)" strokeWidth="1" />
      <path d={sector(R_KNURL - 4.2, R_RING_IN + 3.2, -h + 1.6, h - 1.6)} fill="none" stroke="rgba(255,190,160,0.28)" strokeWidth="0.9" />
      {/* vạch chia ô */}
      {LETTERS.map((_, j) => {
        const [x1, y1] = polar(R_RING_IN + 2, (j + 0.5) * STEP);
        const [x2, y2] = polar(R_KNURL - 3, (j + 0.5) * STEP);
        const [x3, y3] = polar(R_RING_IN + 2, (j + 0.5) * STEP + 0.45);
        const [x4, y4] = polar(R_KNURL - 3, (j + 0.5) * STEP + 0.45);
        return (
          <g key={j}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(52,32,6,0.7)" strokeWidth="1.1" />
            <line x1={x3} y1={y3} x2={x4} y2={y4} stroke="rgba(255,238,190,0.4)" strokeWidth="0.8" />
          </g>
        );
      })}
      {/* chữ vòng ngoài */}
      {LETTERS.map((ch, j) => (
        <g key={ch} transform={`rotate(${j * STEP} ${C} ${C})`}>
          {j === 0 ? (
            <text x={C} y={C - R_LET_O + 9} textAnchor="middle" className="font-head" fontSize="25" fontWeight="700" fill="#f6e7c4">
              {ch}
            </text>
          ) : (
            <>
              <text x={C} y={C - R_LET_O + 9} textAnchor="middle" className="font-head" fontSize="25" fontWeight="600" fill="rgba(255,240,200,0.55)" transform="translate(0,1)">
                {ch}
              </text>
              <text x={C} y={C - R_LET_O + 9} textAnchor="middle" className="font-head" fontSize="25" fontWeight="600" fill="#2c1806">
                {ch}
              </text>
            </>
          )}
        </g>
      ))}
      {/* mũi chỉ bằng đồng dưới chữ A, trỏ vào vòng trong */}
      <path d={`M${C - 6.5},${C - R_RING_IN - 2} L${C + 6.5},${C - R_RING_IN - 2} L${C},${C - R_IN + 3} Z`} fill="#f0cf82" stroke="#5a3a0e" strokeWidth="1" strokeLinejoin="round" />
      {/* bóng tay cầm khi đang kéo */}
      <circle cx={C} cy={C} r={R_OUT + 0.5} fill="none" stroke={dragging ? "rgba(255,236,180,0.35)" : "rgba(0,0,0,0)"} strokeWidth="1.5" />
      {/* gợi ý: mũi tên vẽ phấn trên mặt bàn, cạnh chữ A, chỉ chiều cần xoay */}
      <AnimatePresence>
        {hintDir !== 0 && (
          <motion.g
            key={hintDir}
            filter={`url(#sk${uid})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.45, 0.9] }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 1.2, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
          >
            <motion.path
              d={arc(R_OUT + 13, hintDir * 9, hintDir * 46)}
              fill="none"
              stroke="#efe3c4"
              strokeWidth="3.6"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6 }}
            />
            <path
              d={(() => {
                const a = hintDir * 46;
                const [tx, ty] = polar(R_OUT + 13, a);
                const [b1x, b1y] = polar(R_OUT + 3, a - hintDir * 7.5);
                const [b2x, b2y] = polar(R_OUT + 23, a - hintDir * 7.5);
                return `M${b1x},${b1y} L${tx},${ty} L${b2x},${b2y}`;
              })()}
              fill="none"
              stroke="#efe3c4"
              strokeWidth="3.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}

/** Nút xoay bằng đồng ở hai góc dưới của đĩa. */
function TurnButton({ dir, disabled, onPress }: { dir: -1 | 1; disabled: boolean; onPress: () => void }) {
  return (
    <button
      type="button"
      aria-label={dir < 0 ? "Xoay vòng ngoài ngược chiều kim đồng hồ" : "Xoay vòng ngoài theo chiều kim đồng hồ"}
      disabled={disabled}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onPress}
      className={cn(
        "absolute bottom-[1%] grid h-[clamp(40px,13%,54px)] w-[clamp(40px,13%,54px)] place-items-center rounded-full transition-[transform,box-shadow] duration-100 active:translate-y-[2px] disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
        dir < 0 ? "left-[1%]" : "right-[1%]",
      )}
      style={{
        background: "radial-gradient(circle at 36% 30%, #f8e2a4, #c99a43 46%, #6b4814 100%)",
        boxShadow: "0 3px 0 #3d2807, 0 9px 14px -4px rgba(0,0,0,0.85), inset 0 1px 1px rgba(255,250,225,0.75), inset 0 -2px 3px rgba(60,35,5,0.55)",
      }}
    >
      <svg viewBox="0 0 24 24" className="h-[46%] w-[46%]" aria-hidden>
        <path d={dir < 0 ? "M16.5 5 L6.5 12 L16.5 19 Z" : "M7.5 5 L17.5 12 L7.5 19 Z"} fill="rgba(255,242,205,0.6)" transform="translate(0,1)" />
        <path d={dir < 0 ? "M16.5 5 L6.5 12 L16.5 19 Z" : "M7.5 5 L17.5 12 L7.5 19 Z"} fill="#3b260a" />
      </svg>
    </button>
  );
}
