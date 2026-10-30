"use client";

import { AnimatePresence, animate, motion, useMotionValue } from "motion/react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Stamp } from "@/components/kit/Stamp";
import { SORT_BOARDS, SORT_CARDS } from "@/game/data/minis";
import { sfx } from "@/lib/sfx";
import { isTypingTarget, mulberry32, qa, useBox, useFinishOnce } from "./shared";
import { Bench, Board, DinhWall, Pile, SheetFace, Tack, type BoardLay, type Rect } from "./sort-scene";
import type { MiniProps } from "./types";

/*
 * "Sắc lệnh của Xô viết" (10/1930): vách đình làng có ba bảng yết thị: Chính trị, Kinh tế, Văn hóa – xã hội.
 * Mỗi lần một tờ yết thị (thứ tự xáo theo mốc bắt đầu, mỗi người chơi một khác): chạm vào bảng đúng,
 * hoặc kéo tờ giấy lên bảng, hoặc bấm phím 1/2/3. Đúng: tờ giấy bay lên bảng và được ghim lại.
 * Sai: tờ giấy rung, bảng chớp đỏ "Dán nhầm", tờ ấy vẫn phải dán lại và mất điểm lần đầu.
 * Điểm: mỗi tờ dán đúng ngay lần đầu được 100; dán đủ 9 tờ thì thưởng thêm round(100 × thời gian còn lại / thời gian cho phép).
 * Hết giờ: giữ số điểm đã có, không có thưởng.
 */

const TOTAL = SORT_CARDS.length;
const PER_CARD = 100;
const BONUS = 100;
/** Thời gian tờ giấy bay lên bảng (giây). */
const FLY = 0.42;
/** Dán xong tờ cuối: đóng dấu "Đã yết thị" rồi mới kết thúc (không quá 1,2 giây). */
const FLOURISH_MS = 1150;
const WRONG_MS = 900;
const BOARD_OF = SORT_CARDS.map((c) => SORT_BOARDS.indexOf(c.board));
const LONGEST = Math.max(...SORT_CARDS.map((c) => c.text.length));

type Phase = "play" | "flourish" | "done" | "timeout";

interface Posted {
  card: number;
  board: number;
  slot: number;
  first: boolean;
  from: { x: number; y: number; rot: number; scale: number };
}

const sortScore = (points: number, left: number, secs: number) => Math.min(1000, points + Math.round(BONUS * Math.max(0, Math.min(1, left / secs))));

/** Xáo thứ tự các tờ (tránh ba tờ liền nhau cùng một bảng) và độ nghiêng khi ghim lên bảng. */
function deal(seed: number) {
  const rnd = mulberry32(Math.floor(seed) ^ 0x51ed270b);
  let order: number[] = [];
  for (let attempt = 0; attempt < 40; attempt++) {
    order = SORT_CARDS.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const run3 = order.some((c, i) => i >= 2 && BOARD_OF[c] === BOARD_OF[order[i - 1]] && BOARD_OF[c] === BOARD_OF[order[i - 2]]);
    if (!run3) break;
  }
  const tilt = SORT_CARDS.map(() => (rnd() - 0.5) * 7);
  return { order, tilt };
}

/* ───────────────────────────── Bố cục theo khung thật (px) ───────────────────────────── */

/** Bề ngang trung bình một ký tự Literata (tính theo cỡ chữ), đo trên các câu yết thị. */
const CHAR = 0.5;
/** Phần không phải chữ của tờ yết thị, tính theo cỡ chữ: lề trên, dòng "Yết thị", gạch kép, lề dưới. */
const NON_TEXT = 3.35;
const LINE = 1.3;

function fitSheet(maxW: number, maxH: number) {
  for (let f = 17; f >= 11.5; f -= 0.5) {
    const maxLines = Math.floor((maxH / f - NON_TEXT) / LINE);
    if (maxLines < 1) continue;
    let best: { w: number; lines: number } | null = null;
    for (let n = 1; n <= Math.min(4, maxLines); n++) {
      const w = Math.max(13 * f, (LONGEST * CHAR * f) / (n - 0.3) + 1.8 * f);
      if (w > maxW) continue;
      if (!best || Math.abs(w - 15 * f) < Math.abs(best.w - 15 * f)) best = { w, lines: n };
    }
    if (best) return { f, w: Math.round(best.w), h: Math.round((NON_TEXT + best.lines * LINE) * f) };
  }
  const f = 11.5;
  return { f, w: Math.round(maxW), h: Math.round(maxH) };
}

interface Lay {
  W: number;
  H: number;
  p: number;
  wallH: number;
  boards: BoardLay[];
  titleFs: number;
  twoLines: boolean;
  sheet: Rect;
  f: number;
  pile: Rect;
  tally: Rect;
  mini: number;
  step: number;
}

function plan(W: number, H: number): Lay {
  const p = Math.round(Math.max(8, Math.min(14, Math.min(W, H) * 0.028)));
  const gap = Math.round(Math.max(6, Math.min(16, W * 0.022)));
  const pileW = Math.round(Math.max(38, Math.min(92, W * 0.12)));
  const tallyW = Math.round(Math.max(50, Math.min(86, W * 0.12)));
  const benchMax = Math.max(112, Math.min(176, H * 0.37));
  const sheetMaxW = W - 2 * p - pileW - tallyW - 2 * gap;
  const fit = fitSheet(Math.min(sheetMaxW, 420), benchMax - 16);
  const benchH = Math.round(Math.min(benchMax, fit.h + 26));
  const wallH = H - benchH;

  const sheet = {
    x: Math.round(p + pileW + gap + (sheetMaxW - fit.w) / 2),
    y: Math.round(wallH + (benchH - fit.h) / 2 + 2),
    w: fit.w,
    h: fit.h,
  };
  const pile = { x: Math.round(sheet.x - pileW - gap * 0.4), y: sheet.y + 3, w: fit.w, h: fit.h };
  const tx = sheet.x + sheet.w + gap;
  const tally = { x: tx, y: sheet.y + 4, w: Math.max(40, Math.min(110, W - p - tx)), h: Math.min(fit.h - 8, 74) };

  // Ba bảng yết thị trên vách (khung cao quá thì bảng không kéo dài thêm, chừa vách ở trên và dưới).
  const bw = Math.min(236, (W - 2 * p - 2 * gap) / 3);
  const x0 = (W - (3 * bw + 2 * gap)) / 2;
  const roof = Math.round(Math.max(11, Math.min(20, bw * 0.1)));
  const titleFs = Math.round(Math.max(10.5, Math.min(15, bw * 0.075)) * 2) / 2;
  const twoLines = 9.2 * titleFs > bw - 14;
  const plankH = Math.round((twoLines ? 2.25 : 1.2) * titleFs + 9);
  const room = wallH - Math.max(9, p + 1) - Math.max(7, Math.round(p * 0.8));
  const bh = Math.round(Math.min(room, roof + plankH + bw * 2.2));
  const top = Math.round(Math.max(9, p + 1) + (room - bh) * 0.45);
  const frame = Math.round(Math.max(4, Math.min(7, bw * 0.033)));
  const boards = [0, 1, 2].map((i) => {
    const x = Math.round(x0 + i * (bw + gap));
    const panelTop = top + roof + plankH - 2 + frame;
    return {
      x,
      y: top,
      w: Math.round(bw),
      h: bh,
      roof,
      plank: plankH,
      frame,
      panel: { x: x + frame, y: panelTop, w: Math.round(bw) - 2 * frame, h: top + bh - frame - panelTop },
    };
  });

  // Ba tờ đã dán trên một bảng: thu nhỏ, xếp so le chồng lên nhau.
  const pw = boards[0].panel.w;
  const ph = boards[0].panel.h;
  const pad = Math.max(4, pw * 0.06);
  const mini = Math.max(0.1, Math.min((pw - 2 * pad) / fit.w, (ph - 2 * pad) / (fit.h * 2.15)));
  const miniH = fit.h * mini;
  const step = Math.max(0, Math.min(miniH * 0.62, (ph - 2 * pad - miniH) / 2));

  return { W, H, p, wallH, boards, titleFs, twoLines, sheet, f: fit.f, pile, tally, mini, step };
}

/** Vị trí (góc trên trái, chưa thu nhỏ) của tờ thứ k trên bảng b, để tâm tờ thu nhỏ nằm đúng chỗ. */
function slotPos(L: Lay, b: number, k: number) {
  const panel = L.boards[b].panel;
  const miniH = L.sheet.h * L.mini;
  const stackH = miniH + 2 * L.step;
  const jitter = [-0.035, 0.04, -0.01][k] * panel.w;
  const cx = panel.x + panel.w / 2 + jitter;
  const cy = panel.y + (panel.h - stackH) / 2 + miniH / 2 + k * L.step;
  return { x: cx - L.sheet.w / 2, y: cy - L.sheet.h / 2 };
}

/* ───────────────────────────── Trò chơi ───────────────────────────── */

export function Sort({ seconds, startedAt, onFinish }: MiniProps) {
  // Giữ mốc giờ lúc mở trò chơi: khung cha vẽ lại cũng không làm lệch giờ.
  const [t0] = useState(startedAt);
  const [secs] = useState(seconds);
  const finish = useFinishOnce(onFinish);
  const [boxRef, box] = useBox<HTMLDivElement>();
  const { order, tilt } = useMemo(() => deal(t0), [t0]);

  const [idx, setIdx] = useState(0);
  const [posted, setPosted] = useState<Posted[]>([]);
  const [missed, setMissed] = useState(0);
  const [phase, setPhase] = useState<Phase>("play");
  const [score, setScore] = useState<number | null>(null);
  const [wrong, setWrong] = useState<{ board: number; n: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const idxRef = useRef(0);
  const postedRef = useRef<Posted[]>([]);
  const pointsRef = useRef(0);
  /** Tờ hiện tại chưa bị dán nhầm lần nào. */
  const cleanRef = useRef(true);
  const phaseRef = useRef<Phase>("play");
  const finalRef = useRef<number | null>(null);
  const wrongN = useRef(0);
  const timers = useRef(new Set<number>());
  const drag = useRef<{ id: number; sx: number; sy: number; k: number; moved: boolean; rects: DOMRect[] } | null>(null);
  const placeRef = useRef<(b: number, viaDrag: boolean) => void>(() => {});
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  const L = plan(box.w || 700, box.h || 450);

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  };

  useEffect(() => {
    const set = timers.current;
    return () => {
      set.forEach((id) => window.clearTimeout(id));
      set.clear();
    };
  }, []);

  // Hết giờ: nếu đã dán đủ (đang đóng dấu) thì giữ điểm lúc xong; chưa xong thì giữ số điểm đã có, không thưởng.
  useEffect(() => {
    const id = window.setTimeout(
      () => {
        const final = finalRef.current;
        if (final !== null) {
          phaseRef.current = "done";
          setPhase("done");
          setScore(final);
          finish(final);
          return;
        }
        phaseRef.current = "timeout";
        setPhase("timeout");
        setScore(pointsRef.current);
        setWrong(null);
        finish(pointsRef.current);
      },
      Math.max(0, t0 + secs * 1000 - Date.now()),
    );
    return () => window.clearTimeout(id);
  }, [finish, secs, t0]);

  const place = (b: number, viaDrag: boolean) => {
    if (phaseRef.current !== "play") return;
    const now = Date.now();
    if (now - t0 >= secs * 1000) return;
    const i = idxRef.current;
    if (i >= TOTAL) return;
    const card = order[i];

    if (BOARD_OF[card] !== b) {
      cleanRef.current = false;
      setMissed((m) => m + 1);
      wrongN.current += 1;
      const n = wrongN.current;
      setWrong({ board: b, n });
      later(() => setWrong((w) => (w && w.n === n ? null : w)), WRONG_MS);
      if (viaDrag) {
        animate(dragX, [dragX.get(), -9, 8, -6, 4, -2, 0], { duration: 0.5, ease: "easeOut" });
        animate(dragY, 0, { type: "spring", stiffness: 520, damping: 34 });
      } else {
        animate(dragX, [0, -10, 9, -7, 5, -2, 0], { duration: 0.42, ease: "easeOut" });
      }
      sfx.wrong();
      return;
    }

    const first = cleanRef.current;
    if (first) pointsRef.current += PER_CARD;
    cleanRef.current = true;
    const slot = postedRef.current.filter((q) => q.board === b).length;
    const entry: Posted = {
      card,
      board: b,
      slot,
      first,
      from: { x: L.sheet.x + dragX.get(), y: L.sheet.y + dragY.get(), rot: viaDrag ? 1.5 : -0.8, scale: viaDrag ? 1.04 : 1 },
    };
    postedRef.current = [...postedRef.current, entry];
    setPosted(postedRef.current);
    dragX.stop();
    dragY.stop();
    dragX.set(0);
    dragY.set(0);
    setWrong(null);
    const next = i + 1;
    idxRef.current = next;
    setIdx(next);
    later(() => sfx.stamp(), FLY * 900);

    if (next >= TOTAL) {
      const final = sortScore(pointsRef.current, (t0 + secs * 1000 - now) / 1000, secs);
      finalRef.current = final;
      phaseRef.current = "flourish";
      setPhase("flourish");
      later(
        () => {
          sfx.stamp();
          sfx.correct();
        },
        FLY * 1000 + 60,
      );
      later(() => {
        phaseRef.current = "done";
        setPhase("done");
        setScore(final);
        finish(final);
      }, FLOURISH_MS);
    }
  };

  useEffect(() => {
    placeRef.current = place;
  });

  // Phím 1/2/3 dán vào bảng tương ứng.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey || isTypingTarget(e.target)) return;
      const k = e.key === "1" || e.code === "Numpad1" ? 0 : e.key === "2" || e.code === "Numpad2" ? 1 : e.key === "3" || e.code === "Numpad3" ? 2 : -1;
      if (k < 0) return;
      e.preventDefault();
      placeRef.current(k, false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Kéo tờ giấy lên bảng (chuột hoặc cảm ứng). */
  const boardUnder = (rects: DOMRect[], x: number, y: number) => rects.findIndex((r) => x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 6 && y <= r.bottom + 6);

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== "play" || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    const root = boxRef.current;
    if (!root) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rr = root.getBoundingClientRect();
    const k = root.offsetWidth > 0 ? rr.width / root.offsetWidth : 1;
    const rects = Array.from(root.querySelectorAll<HTMLElement>("[data-board]")).map((el) => el.getBoundingClientRect());
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, k: k || 1, moved: false, rects };
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = (e.clientX - d.sx) / d.k;
    const dy = (e.clientY - d.sy) / d.k;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 6) return;
      d.moved = true;
      setDragging(true);
    }
    dragX.set(dx);
    dragY.set(dy);
    const over = boardUnder(d.rects, e.clientX, e.clientY);
    setHover(over >= 0 ? over : null);
  };

  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    setHover(null);
    if (!d.moved) return;
    const over = boardUnder(d.rects, e.clientX, e.clientY);
    if (over >= 0 && phaseRef.current === "play") {
      place(over, true);
    } else {
      animate(dragX, 0, { type: "spring", stiffness: 520, damping: 34 });
      animate(dragY, 0, { type: "spring", stiffness: 520, damping: 34 });
    }
  };

  const cur = idx < TOTAL ? order[idx] : -1;
  const counts = [0, 0, 0];
  posted.forEach((q) => counts[q.board]++);
  const points = posted.filter((q) => q.first).length * PER_CARD;
  const live = phase === "play";
  const finished = phase === "flourish" || phase === "done";

  return (
    <div
      ref={boxRef}
      className="relative h-full w-full touch-manipulation select-none overflow-hidden bg-[#1a110a]"
      data-game="sort"
      data-phase={phase}
      data-done={score !== null ? 1 : 0}
      data-score={score ?? ""}
      data-points={points}
      data-posted={posted.length}
      data-total={TOTAL}
      data-mistakes={missed}
      data-card={cur}
      {...qa({ "data-answer": cur >= 0 ? BOARD_OF[cur] : "" })}
      {...qa({ "data-answer-name": cur >= 0 ? SORT_CARDS[cur].board : "" })}
    >
      {box.w > 0 && (
        <>
          <DinhWall h={L.wallH} p={L.p} />
          <Bench top={L.wallH} />

          {L.boards.map((b, i) => (
            <Board
              key={i}
              b={b}
              i={i}
              name={SORT_BOARDS[i]}
              count={counts[i]}
              titleFs={L.titleFs}
              hot={hover === i}
              flash={wrong && wrong.board === i ? wrong.n : 0}
              live={live}
              onPick={(k) => place(k, false)}
            />
          ))}

          <Pile r={L.pile} n={live || phase === "timeout" ? TOTAL - idx - 1 : 0} f={L.f} />
          <Tally r={L.tally} posted={posted.length} missed={missed} />

          {/* Các tờ đã dán: bay từ tay lên bảng rồi nằm yên, thu nhỏ theo bảng. */}
          <div className="pointer-events-none absolute inset-0" style={{ zIndex: 20 }}>
            {posted.map((q) => {
              const to = slotPos(L, q.board, q.slot);
              return (
                <motion.div
                  key={q.card}
                  className="absolute left-0 top-0"
                  style={{ width: L.sheet.w, height: L.sheet.h }}
                  initial={{ x: q.from.x, y: q.from.y, rotate: q.from.rot, scale: q.from.scale }}
                  animate={{ x: to.x, y: to.y, rotate: tilt[q.card], scale: L.mini }}
                  transition={{
                    x: { duration: FLY, ease: [0.32, 0.72, 0.24, 1] },
                    y: { duration: FLY, ease: [0.45, 0, 0.2, 1] },
                    rotate: { duration: FLY, ease: "easeOut" },
                    scale: { duration: FLY, ease: [0.3, 1.5, 0.6, 1] },
                  }}
                >
                  <SheetFace text={SORT_CARDS[q.card].text} f={L.f} posted />
                  <Tack delay={FLY * 0.88} />
                </motion.div>
              );
            })}
          </div>

          {cur >= 0 && (live || phase === "timeout") && (
            <motion.div
              key={cur}
              data-sheet="current"
              role="img"
              aria-label={`Tờ yết thị: ${SORT_CARDS[cur].text}`}
              className="absolute touch-none"
              style={{
                left: L.sheet.x,
                top: L.sheet.y,
                width: L.sheet.w,
                height: L.sheet.h,
                x: dragX,
                y: dragY,
                zIndex: dragging ? 45 : 30,
                cursor: live ? (dragging ? "grabbing" : "grab") : "default",
              }}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onLostPointerCapture={onUp}
            >
              <motion.div
                className="absolute inset-0"
                initial={{ x: L.pile.x - L.sheet.x, y: L.pile.y - L.sheet.y, rotate: -3, opacity: 0.5 }}
                animate={{ x: 0, y: 0, rotate: dragging ? 1.5 : -0.8, scale: dragging ? 1.04 : 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 430, damping: 34, opacity: { duration: 0.12 } }}
              >
                <SheetFace text={SORT_CARDS[cur].text} f={L.f} lifted={dragging} />
                {wrong && (
                  <motion.div
                    key={wrong.n}
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{ background: "rgba(179,38,30,0.16)", boxShadow: "inset 0 0 0 3px rgba(179,38,30,0.85)" }}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.75, ease: "easeIn" }}
                  />
                )}
                {phase === "timeout" && (
                  <div className="pointer-events-none absolute inset-0 grid place-items-center" style={{ fontSize: L.f }}>
                    <Stamp ink="red" rotate={-7} className="whitespace-nowrap border-[3px] bg-[#f1e7d0]/90 text-[1.7em] mix-blend-normal shadow-[0_6px_14px_-6px_rgba(0,0,0,0.6)]">
                      Hết giờ
                    </Stamp>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}

          <AnimatePresence>
            {finished && (
              <motion.div
                key="final"
                className="pointer-events-none absolute inset-x-0 grid place-items-center"
                style={{ top: 0, height: L.wallH, zIndex: 60 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: FLY, duration: 0.05 }}
              >
                <Stamp
                  ink="red"
                  rotate={-8}
                  delay={FLY}
                  className="whitespace-nowrap border-[4px] bg-[#f1e7d0]/85 text-[#b3261e] mix-blend-normal shadow-[0_8px_18px_-6px_rgba(0,0,0,0.7)]"
                >
                  <span style={{ fontSize: Math.round(Math.max(24, Math.min(46, L.W * 0.068))) }}>Đã yết thị</span>
                </Stamp>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

/* ───────────────────────────── Mảnh giấy đếm số tờ đã dán ───────────────────────────── */

const Tally = memo(function Tally({ r, posted, missed }: { r: Rect; posted: number; missed: number }) {
  const fs = Math.max(9.5, Math.min(12, r.w * 0.15));
  return (
    <div
      className="sheet absolute rounded-[1px] text-center shadow-[0_8px_12px_-5px_rgba(0,0,0,0.85),0_1px_2px_rgba(0,0,0,0.5)]"
      style={{ left: r.x, top: r.y, width: r.w, padding: `${fs * 0.75 + 6}px ${fs * 0.4}px ${fs * 0.55}px`, rotate: "2.2deg", zIndex: 25 }}
      aria-live="polite"
    >
      <span
        aria-hidden
        className="absolute left-1/2 top-[3px] h-[6px] w-[6px] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(circle at 35% 30%, #e0d9c9, #6a6357 55%, #26221d)", boxShadow: "0 1px 1.5px rgba(0,0,0,0.7)" }}
      />
      <div className="font-head font-semibold uppercase leading-none tracking-[0.1em] text-ink-2" style={{ fontSize: fs }}>
        Đã dán
      </div>
      <div className="mt-[2px] whitespace-nowrap font-head font-bold leading-none text-ink" style={{ fontSize: fs * 2.1 }}>
        <motion.span
          key={posted}
          className="inline-block origin-bottom"
          initial={{ scale: posted ? 1.3 : 1 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 600, damping: 18 }}
        >
          {posted}
        </motion.span>
        <span className="text-ink-3" style={{ fontSize: fs * 1.35 }}>
          /{TOTAL}
        </span>
      </div>
      {missed > 0 && (
        <div className="mt-[3px] whitespace-nowrap font-head font-semibold uppercase leading-none tracking-[0.06em] text-stamp" style={{ fontSize: fs * 0.95 }}>
          Nhầm {missed}
        </div>
      )}
    </div>
  );
});
