"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stamp } from "@/components/kit/Stamp";
import { Typed } from "@/components/kit/Typed";
import { TIMELINE_COUNT, TIMELINE_EVENTS } from "@/game/data/minis";
import { sfx } from "@/lib/sfx";
import { mulberry32, qa, useBox, useFinishOnce } from "./shared";
import { CellTable, Masthead, SlipPaper, Slot, TONES, type Rect, type SlipLook } from "./timeline-scene";
import type { MiniProps } from "./types";

/*
 * "Bài cho báo Đuốc đưa đường" (1932, nhà tù Hỏa Lò): chi bộ viết bài tổng kết phong trào 1930–1931
 * cho tờ báo viết tay. Các mẩu tin chuyền qua song sắt bị xáo trộn, chưa ghi ngày.
 * Chạm các mẩu tin theo thứ tự thời gian (sớm nhất trước): đúng thì mẩu tin trượt vào ô kế tiếp của bài báo
 * và được đóng dấu ngày tháng; sai thì mẩu tin rung lên, chớp đỏ, tính một lần chạm sai.
 * Xong: max(400, round(1000 − 450 × thời gian đã dùng / thời gian cho phép − 120 × số lần chạm sai)).
 * Hết giờ: 80 điểm cho mỗi mẩu tin đã xếp (tối đa 400).
 */

const FLY = 0.4;
/** Xếp xong: gõ tên bài, đóng dấu "Đã chép xong", rồi mới kết thúc. */
const FLOURISH_MS = 1200;
const TITLE = "TỔNG KẾT PHONG TRÀO 1930–1931";

type Phase = "play" | "flourish" | "done" | "timeout";

/** Mép giấy xé: răng cưa ở cạnh trên và cạnh dưới, hai cạnh bên gần thẳng. */
function tornClip(rnd: () => number) {
  const n = 9;
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) pts.push(`${((i / n) * 100).toFixed(1)}% ${(rnd() * 4.5).toFixed(1)}%`);
  pts.push(`${(99 + rnd()).toFixed(1)}% ${(35 + rnd() * 30).toFixed(1)}%`);
  for (let i = n; i >= 0; i--) pts.push(`${((i / n) * 100).toFixed(1)}% ${(95.5 + rnd() * 4.5).toFixed(1)}%`);
  pts.push(`${rnd().toFixed(1)}% ${(35 + rnd() * 30).toFixed(1)}%`);
  return `polygon(${pts.join(", ")})`;
}

/** Chọn mẩu tin (đủ các sự kiện "core" cộng thêm sự kiện khác cho đủ số), xáo chỗ rải trên bàn, vẻ ngoài từng mẩu giấy. */
function pick(seed: number) {
  const rnd = mulberry32(Math.floor(seed) ^ 0x7f4a7c15);
  const core = TIMELINE_EVENTS.filter((e) => e.core);
  const rest = TIMELINE_EVENTS.filter((e) => !e.core);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  const chosen = [...core, ...rest.slice(0, Math.max(0, TIMELINE_COUNT - core.length))];
  const sorted = [...chosen].sort((a, b) => a.order - b.order);
  let scatter = chosen.map((_, i) => i);
  for (let attempt = 0; attempt < 30; attempt++) {
    scatter = chosen.map((_, i) => i);
    for (let i = scatter.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [scatter[i], scatter[j]] = [scatter[j], scatter[i]];
    }
    // không để các mẩu tin nằm sẵn đúng thứ tự, cũng không để mẩu sớm nhất ở ngay ô đầu tiên
    const ids = scatter.map((i) => chosen[i].id);
    if (ids[0] !== sorted[0].id && !ids.every((id, k) => id === sorted[k].id)) break;
  }
  const slips: SlipLook[] = scatter.map((ci, cell) => ({
    ev: chosen[ci],
    cell,
    jx: rnd() - 0.5,
    jy: rnd() - 0.5,
    rot: (rnd() - 0.5) * 7,
    tone: Math.floor(rnd() * TONES.length),
    pencil: rnd() < 0.4,
    clip: tornClip(rnd),
  }));
  const slotRot = sorted.map(() => (rnd() - 0.5) * 3);
  return { sorted, slips, slotRot, maxLen: Math.max(...chosen.map((e) => e.text.length)) };
}

/* ───────────────────────────── Bố cục theo khung thật (px) ───────────────────────────── */

/** Bề ngang trung bình một ký tự Literata nghiêng, tính theo cỡ chữ (đã đo trên các mẩu tin). */
const CHAR = 0.47;
const LH = 1.24;

function fitSlip(sw: number, sh: number, maxLen: number) {
  for (let f = 17; f >= 10; f -= 0.5) {
    const textW = sw - 1.4 * f;
    const textH = sh - 1.2 * f;
    if (textW <= 0 || textH <= 0) continue;
    const lines = Math.ceil((maxLen * CHAR * f) / textW + 0.3);
    if (lines * LH * f <= textH) return { f, lines };
  }
  return { f: 10, lines: 6 };
}

/** Lưới rải mẩu tin: thử 2×3, 3×2, 1×6, 6×1 và chọn cách cho chữ to nhất mà mẩu giấy không quá dài, quá hẹp. */
function slipGrid(area: Rect, maxLen: number) {
  let best: { cols: number; rows: number; f: number; sw: number; sh: number; score: number } | null = null;
  for (const [cols, rows] of [
    [2, 3],
    [3, 2],
    [1, 6],
    [6, 1],
  ]) {
    const cw = area.w / cols;
    const ch = area.h / rows;
    const sw = Math.min(cw * 0.94 - 2, 300);
    const sh = ch * 0.92 - 2;
    if (sw < 60 || sh < 34) continue;
    const { f, lines } = fitSlip(sw, sh, maxLen);
    const aspect = sw / sh;
    const score = f - (aspect < 0.85 ? 1.4 : 0) - (aspect > 3.6 ? 1 : 0);
    if (!best || score > best.score) {
      // mẩu giấy vừa với chữ, không thừa quá nhiều
      const need = lines * LH * f + 1.2 * f + 8;
      best = { cols, rows, f, sw, sh: Math.min(sh, Math.max(need, sh * 0.72)), score };
    }
  }
  const g = best ?? { cols: 2, rows: 3, f: 10, sw: area.w / 2 - 4, sh: area.h / 3 - 4, score: 0 };
  const cells: Rect[] = [];
  for (let k = 0; k < g.cols * g.rows; k++) {
    const c = k % g.cols;
    const r = Math.floor(k / g.cols);
    cells.push({ x: area.x + (c * area.w) / g.cols, y: area.y + (r * area.h) / g.rows, w: area.w / g.cols, h: area.h / g.rows });
  }
  return { cells, slip: { w: Math.round(g.sw), h: Math.round(g.sh) }, f: g.f };
}

interface Lay {
  W: number;
  H: number;
  mode: "side" | "top";
  slotMode: "row" | "grid" | "strip";
  art: Rect;
  ip: number;
  mastFs: number;
  titleFs: number;
  head: number;
  slots: Rect[];
  cells: Rect[];
  slip: { w: number; h: number };
  f: number;
}

function plan(W: number, H: number, maxLen: number): Lay {
  const p = Math.round(Math.max(8, Math.min(14, Math.min(W, H) * 0.028)));
  const range = [0, 1, 2, 3, 4, 5];
  if (W / H >= 1.12) {
    // Ngang: bài báo một cột bên phải, sáu ô xếp dọc; mẩu tin rải bên trái.
    const aw = Math.round(Math.max(170, Math.min(290, W * 0.37)));
    const art = { x: W - p - aw, y: p, w: aw, h: H - 2 * p };
    const ip = Math.round(Math.max(8, Math.min(14, aw * 0.05)));
    const mastFs = Math.max(14, Math.min(27, (aw - 2 * ip) / 9.6));
    const titleFs = Math.max(10, Math.min(13.5, mastFs * 0.52));
    const head = Math.round(ip + mastFs * 1.2 + 8 + titleFs * 1.6 + 5);
    const gap = 4;
    const slotH = Math.min(60, (art.h - head - ip - 5 * gap) / 6);
    const slots = range.map((k) => ({ x: art.x + ip, y: art.y + head + k * (slotH + gap), w: aw - 2 * ip, h: slotH }));
    const area = { x: p, y: p, w: art.x - 2 * p, h: H - 2 * p };
    return { W, H, mode: "side", slotMode: "row", art, ip, mastFs, titleFs, head, slots, ...slipGrid(area, maxLen) };
  }
  // Dọc: bài báo nằm ngang phía trên, sáu ô xếp một hàng (khung thấp) hoặc hai hàng; mẩu tin rải phía dưới.
  const aw = W - 2 * p;
  const ip = 8;
  const mastFs = Math.max(14, Math.min(24, (aw - 2 * ip) / 9.6, H * 0.052));
  const titleFs = Math.max(9.5, Math.min(12.5, mastFs * 0.52));
  const head = Math.round(ip + mastFs * 1.2 + 6 + titleFs * 1.5 + 4);
  const strip = H < 440;
  const gap = strip ? 4 : 6;
  const cols = strip ? 6 : 3;
  const rows = strip ? 1 : 2;
  const slotH = strip ? Math.max(30, Math.min(38, H * 0.1)) : Math.max(34, Math.min(46, H * 0.085));
  const slotW = (aw - 2 * ip - (cols - 1) * gap) / cols;
  const ah = Math.round(head + rows * slotH + (rows - 1) * gap + ip);
  const art = { x: p, y: p, w: aw, h: ah };
  const slots = range.map((k) => ({
    x: art.x + ip + (k % cols) * (slotW + gap),
    y: art.y + head + Math.floor(k / cols) * (slotH + gap),
    w: slotW,
    h: slotH,
  }));
  const area = { x: p, y: art.y + ah + p, w: W - 2 * p, h: H - ah - 3 * p };
  return { W, H, mode: "top", slotMode: strip ? "strip" : "grid", art, ip, mastFs, titleFs, head, slots, ...slipGrid(area, maxLen) };
}

function slipPos(L: Lay, s: SlipLook) {
  const c = L.cells[s.cell];
  const mx = Math.max(0, c.w - L.slip.w);
  const my = Math.max(0, c.h - L.slip.h);
  return { x: c.x + mx / 2 + s.jx * mx * 0.9, y: c.y + my / 2 + s.jy * my * 0.9 };
}

/* ───────────────────────────── Trò chơi ───────────────────────────── */

export function Timeline({ seconds, startedAt, onFinish }: MiniProps) {
  const [t0] = useState(startedAt);
  const [secs] = useState(seconds);
  const finish = useFinishOnce(onFinish);
  const [boxRef, box] = useBox<HTMLDivElement>();
  const { sorted, slips, slotRot, maxLen } = useMemo(() => pick(t0), [t0]);

  const [placed, setPlaced] = useState<string[]>([]);
  const [wrongTaps, setWrongTaps] = useState(0);
  const [flashes, setFlashes] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<Phase>("play");
  const [score, setScore] = useState<number | null>(null);

  const placedRef = useRef<string[]>([]);
  const wrongRef = useRef(0);
  const phaseRef = useRef<Phase>("play");
  const finalRef = useRef<number | null>(null);
  const timers = useRef(new Set<number>());

  const L = plan(box.w || 700, box.h || 450, maxLen);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);

  useEffect(() => {
    const set = timers.current;
    return () => {
      set.forEach((id) => window.clearTimeout(id));
      set.clear();
    };
  }, []);

  // Hết giờ (cai ngục khám phòng): đã xếp xong thì giữ điểm lúc xong, chưa xong thì 80 điểm mỗi mẩu tin đã xếp.
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
        const s = Math.min(400, 80 * placedRef.current.length);
        phaseRef.current = "timeout";
        setPhase("timeout");
        setScore(s);
        finish(s);
      },
      Math.max(0, t0 + secs * 1000 - Date.now()),
    );
    return () => window.clearTimeout(id);
  }, [finish, secs, t0]);

  const tap = useCallback(
    (id: string) => {
      if (phaseRef.current !== "play") return;
      const now = Date.now();
      if (now - t0 >= secs * 1000) return;
      const done = placedRef.current;
      if (done.includes(id) || done.length >= sorted.length) return;
      if (sorted[done.length].id !== id) {
        wrongRef.current += 1;
        setWrongTaps(wrongRef.current);
        setFlashes((m) => ({ ...m, [id]: (m[id] ?? 0) + 1 }));
        sfx.wrong();
        return;
      }
      const next = [...done, id];
      placedRef.current = next;
      setPlaced(next);
      later(() => sfx.stamp(), FLY * 850);
      if (next.length === sorted.length) {
        const elapsed = Math.max(0, Math.min(secs, (now - t0) / 1000));
        const final = Math.max(400, Math.round(1000 - (450 * elapsed) / secs - 120 * wrongRef.current));
        finalRef.current = final;
        phaseRef.current = "flourish";
        setPhase("flourish");
        later(() => sfx.correct(), 420);
        later(() => sfx.stamp(), 820);
        later(() => {
          phaseRef.current = "done";
          setPhase("done");
          setScore(final);
          finish(final);
        }, FLOURISH_MS);
      }
    },
    [finish, later, secs, sorted, t0],
  );

  const live = phase === "play";
  const complete = phase === "flourish" || phase === "done";
  const expected = placed.length < sorted.length ? sorted[placed.length].id : "";

  return (
    <div
      ref={boxRef}
      className="relative h-full w-full touch-manipulation select-none overflow-hidden bg-[#17110c]"
      data-game="timeline"
      data-phase={phase}
      data-done={score !== null ? 1 : 0}
      data-score={score ?? ""}
      data-placed={placed.length}
      data-total={sorted.length}
      data-wrong={wrongTaps}
      {...qa({ "data-expected": expected })}
      {...qa({ "data-sequence": sorted.map((e) => e.id).join(",") })}
    >
      <CellTable />
      {box.w > 0 && (
        <>
          {/* Tờ báo viết tay: tên báo, dòng tên bài, sáu ô cho sáu mẩu tin. */}
          <div
            className="sheet absolute rounded-[2px]"
            style={{ left: L.art.x, top: L.art.y, width: L.art.w, height: L.art.h, boxShadow: "0 16px 26px -12px rgba(0,0,0,0.9), 0 2px 5px rgba(0,0,0,0.5)" }}
          >
            <Masthead fs={L.mastFs} top={L.ip} torches={L.art.w >= 200} />
            <div className="absolute flex items-center justify-between gap-2" style={{ left: L.ip, right: L.ip, top: L.ip + L.mastFs * 1.2 + 8, height: L.titleFs * 1.6 }}>
              {complete ? (
                <span className="block w-full overflow-hidden whitespace-nowrap text-center" style={{ fontSize: L.titleFs * 1.05 }}>
                  <Typed text={TITLE} cps={48} delay={0.35} cursor={false} className="font-head font-bold uppercase leading-none tracking-[0.06em] text-ink" />
                </span>
              ) : (
                <span aria-hidden className="h-0 flex-1 border-b border-dashed border-ink/35" />
              )}
              {!complete && wrongTaps > 0 && (
                <span
                  className="flex shrink-0 items-center gap-[2px] font-head font-semibold uppercase leading-none tracking-[0.06em] text-stamp"
                  style={{ fontSize: L.titleFs * 0.95 }}
                >
                  <X aria-hidden className="h-[1.05em] w-[1.05em]" strokeWidth={3} />
                  {wrongTaps}
                </span>
              )}
            </div>
          </div>

          {L.slots.map((r, k) => {
            const id = placed[k];
            const look = id ? slips.find((s) => s.ev.id === id) : undefined;
            return <Slot key={k} r={r} k={k} mode={L.slotMode} state={look ? "filled" : k === placed.length && live ? "next" : "empty"} look={look} rot={slotRot[k]} />;
          })}

          {/* Các mẩu tin rải trên bàn. */}
          {slips.map((s, n) => {
            const at = placed.indexOf(s.ev.id);
            const pos = slipPos(L, s);
            const flash = flashes[s.ev.id] ?? 0;
            let anim: Record<string, number | number[]> = { x: pos.x, y: pos.y, rotate: s.rot, scale: 1, opacity: 1 };
            if (at >= 0) {
              const r = L.slots[at];
              const k = Math.min(r.w / L.slip.w, r.h / L.slip.h) * 0.92;
              anim = {
                x: r.x + r.w / 2 - L.slip.w / 2,
                y: r.y + r.h / 2 - L.slip.h / 2,
                rotate: slotRot[at],
                scale: k,
                opacity: 0,
              };
            }
            return (
              <motion.button
                key={s.ev.id}
                type="button"
                data-slip={s.ev.id}
                data-placed={at >= 0 ? 1 : 0}
                aria-label={`Mẩu tin: ${s.ev.text}`}
                aria-disabled={at >= 0 || !live}
                tabIndex={at >= 0 ? -1 : 0}
                onClick={() => tap(s.ev.id)}
                className="group absolute left-0 top-0 touch-manipulation rounded-[2px] text-left outline-none focus-visible:ring-2 focus-visible:ring-gold/80"
                style={{ width: L.slip.w, height: L.slip.h, zIndex: at >= 0 ? 40 : 10 + n, pointerEvents: at >= 0 ? "none" : "auto", cursor: live ? "pointer" : "default" }}
                initial={{ x: pos.x, y: pos.y - 26, rotate: s.rot - 8, scale: 1.12, opacity: 0 }}
                animate={anim}
                transition={
                  at >= 0
                    ? { duration: FLY, ease: [0.4, 0, 0.2, 1], opacity: { duration: 0.12, delay: FLY - 0.08 } }
                    : { type: "spring", stiffness: 380, damping: 30, delay: n * 0.05, opacity: { duration: 0.2, delay: n * 0.05 } }
                }
                whileHover={live ? { scale: 1.03, transition: { duration: 0.12 } } : undefined}
                whileTap={live ? { scale: 0.98 } : undefined}
              >
                <motion.span
                  key={flash}
                  className="absolute inset-0 block"
                  animate={flash > 0 ? { x: [0, -9, 8, -6, 4, -2, 0] } : undefined}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  <SlipPaper look={s} f={L.f} flash={flash} />
                </motion.span>
              </motion.button>
            );
          })}

          <AnimatePresence>
            {complete && (
              <motion.div
                key="done"
                className="pointer-events-none absolute grid place-items-center"
                style={
                  L.mode === "side"
                    ? { left: L.art.x, top: L.art.y, width: L.art.w, height: L.art.h, zIndex: 60 }
                    : { left: 0, top: L.art.y + L.art.h, width: L.W, height: L.H - L.art.y - L.art.h, zIndex: 60 }
                }
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.05 }}
              >
                <Stamp ink="red" rotate={-10} delay={0.7} className="whitespace-nowrap border-[4px] bg-[#f1e7d0]/80 mix-blend-normal">
                  <span style={{ fontSize: Math.round(Math.max(20, Math.min(40, L.art.w * 0.13))) }}>Đã chép xong</span>
                </Stamp>
              </motion.div>
            )}
            {phase === "timeout" && (
              <motion.div key="timeout" className="pointer-events-none absolute inset-0 grid place-items-center" style={{ zIndex: 60 }}>
                <Stamp ink="red" rotate={-8} className="whitespace-nowrap border-[4px] bg-[#f1e7d0]/85 mix-blend-normal">
                  <span style={{ fontSize: Math.round(Math.max(18, Math.min(34, L.W * 0.055))) }}>Cai ngục khám phòng!</span>
                </Stamp>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
