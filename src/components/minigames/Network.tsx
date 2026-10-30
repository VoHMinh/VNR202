"use client";

import { AnimatePresence, motion } from "motion/react";
import { RotateCcw, Undo2 } from "lucide-react";
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Stamp } from "@/components/kit/Stamp";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/sfx";
import { NET_PUZZLES } from "./network-puzzles";
import { GRAIN, WoodSurface, isTypingTarget, mulberry32, useBox, useFinishOnce } from "./shared";
import type { MiniProps } from "./types";

/*
 * "Nối lại đường dây" (1933): ra tù trở về Nghệ An, người giao liên nối lại một đường dây đơn tuyến
 * đi qua mọi xóm trong vùng, qua các cơ sở theo đúng thứ tự, tránh các đồn lính.
 * Luật (kiểu trò "Zip"): kéo MỘT đường liền từ cơ sở số 1, đi ngang hoặc dọc sang ô kề bên,
 * qua các cơ sở theo thứ tự tăng dần, phủ kín mọi ô trống đúng một lần và dừng ở cơ sở số cuối.
 * Kéo lùi về ô vừa đi thì xóa bước cuối; chạm (hoặc kéo) từ ô số 1 thì làm lại từ đầu; chạm một ô đã đi thì cắt đường về ô đó.
 * Đề lấy từ network-puzzles.ts (16 đề, mỗi đề một lời giải), xoay hoặc lật ngẫu nhiên theo mốc bắt đầu.
 * Giải được: 1000 − 500 × thời gian đã dùng / thời gian cho phép. Hết giờ: 400 × số ô đã nối / số ô trống.
 */

const N = 6;
const CELLS = N * N;
/** Khung vẽ bản đồ: lưới 6 × 6 nằm trong lề M. */
const VB = 600;
const M = 16;
const CS = (VB - 2 * M) / N;
const FINISH_DELAY = 1050;

type Bad = "post" | "visited" | "order" | "early" | "start";

const BAD_TEXT: Record<Bad, (next: number) => string> = {
  post: () => "Đồn lính! Phải đi vòng.",
  visited: () => "Xóm này đã có đường dây đi qua.",
  order: (next) => `Phải qua cơ sở số ${next} trước.`,
  early: () => "Phải nối hết các xóm rồi mới tới cơ sở cuối.",
  start: () => "Bắt đầu từ cơ sở số 1.",
};

const rowOf = (i: number) => Math.floor(i / N);
const colOf = (i: number) => i % N;
const adjacent = (a: number, b: number) => Math.abs(rowOf(a) - rowOf(b)) + Math.abs(colOf(a) - colOf(b)) === 1;
const cx = (i: number) => M + (colOf(i) + 0.5) * CS;
const cy = (i: number) => M + (rowOf(i) + 0.5) * CS;

/** Xoay, lật lưới (8 phép đối xứng của hình vuông): kề nhau vẫn kề nhau, đề vẫn chỉ có một lời giải. */
function transformCell(i: number, t: number) {
  let r = rowOf(i);
  let c = colOf(i);
  if (t & 4) [r, c] = [c, r];
  if (t & 1) c = N - 1 - c;
  if (t & 2) r = N - 1 - r;
  return r * N + c;
}

interface Puzzle {
  posts: number[];
  bases: number[];
  solution: number[];
  isPost: boolean[];
  numAt: number[];
  total: number;
  K: number;
}

function pickPuzzle(seed: number): Puzzle {
  const rnd = mulberry32(Math.floor(seed) ^ 0x2f6b1d3);
  const src = NET_PUZZLES[Math.floor(rnd() * NET_PUZZLES.length) % NET_PUZZLES.length];
  const t = Math.floor(rnd() * 8) % 8;
  const posts = src.posts.map((c) => transformCell(c, t));
  const bases = src.bases.map((c) => transformCell(c, t));
  const solution = src.path.map((c) => transformCell(c, t));
  const isPost = Array.from({ length: CELLS }, (_, i) => posts.includes(i));
  const numAt = Array.from({ length: CELLS }, (_, i) => bases.indexOf(i) + 1);
  return { posts, bases, solution, isPost, numAt, total: CELLS - posts.length, K: bases.length };
}

/** Số của cơ sở tiếp theo phải tới (1 khi chưa bắt đầu). */
const nextNumber = (pz: Puzzle, path: number[]) => path.reduce((n, c) => (pz.numAt[c] ? n + 1 : n), 1);

type Step = { path: number[]; kind: "none" | "start" | "undo" | "step" | "knot" | "solve" } | { path: number[]; kind: "bad"; bad: Bad; cell: number };

/** Một bước của người chơi khi con trỏ đi vào ô `j`. Chỉ nhận nước đi hợp lệ, nên đường đang vẽ luôn đúng luật. */
function stepInto(pz: Puzzle, path: number[], j: number): Step {
  if (!path.length) return j === pz.bases[0] ? { path: [j], kind: "start" } : { path, kind: "bad", bad: "start", cell: j };
  const head = path[path.length - 1];
  if (j === head) return { path, kind: "none" };
  if (path.length >= 2 && j === path[path.length - 2]) return { path: path.slice(0, -1), kind: "undo" };
  if (!adjacent(head, j)) return { path, kind: "none" };
  if (pz.isPost[j]) return { path, kind: "bad", bad: "post", cell: j };
  if (path.includes(j)) return { path, kind: "bad", bad: "visited", cell: j };
  const n = pz.numAt[j];
  if (n) {
    if (n !== nextNumber(pz, path)) return { path, kind: "bad", bad: "order", cell: j };
    if (n === pz.K && path.length + 1 !== pz.total) return { path, kind: "bad", bad: "early", cell: j };
  }
  const next = [...path, j];
  if (next.length === pz.total && n === pz.K) return { path: next, kind: "solve" };
  return { path: next, kind: n ? "knot" : "step" };
}

/** Kiểm tra một đường đi bất kỳ có phải lời giải hay không (không chỉ so với lời giải đã sinh). */
function isSolution(pz: Puzzle, path: number[]) {
  if (path.length !== pz.total || path[0] !== pz.bases[0] || path[path.length - 1] !== pz.bases[pz.K - 1]) return false;
  const seen = new Set<number>();
  let want = 1;
  for (let i = 0; i < path.length; i++) {
    const c = path[i];
    if (c < 0 || c >= CELLS || pz.isPost[c] || seen.has(c)) return false;
    if (i && !adjacent(path[i - 1], c)) return false;
    seen.add(c);
    if (pz.numAt[c]) {
      if (pz.numAt[c] !== want) return false;
      want++;
    }
  }
  return want === pz.K + 1;
}

/* ───────────── Bố cục ───────────── */

interface Lay {
  mode: "side" | "col";
  p: number;
  board: number;
  panelW: number;
  barH: number;
}

function plan(w: number, h: number): Lay {
  const p = Math.round(Math.max(6, Math.min(14, Math.min(w, h) * 0.026)));
  const barH = 40;
  const side = Math.floor(Math.min(h - 2 * p, w - 3 * p - 150));
  const col = Math.floor(Math.min(w - 2 * p, h - 3 * p - barH));
  if (side >= 230 && side >= col - 10) return { mode: "side", p, board: side, panelW: w - 3 * p - side, barH };
  return { mode: "col", p, board: Math.max(120, col), panelW: 0, barH };
}

/* ───────────── Trò chơi ───────────── */

export function Network({ seconds, startedAt, onFinish }: MiniProps) {
  const [t0] = useState(startedAt);
  const [secs] = useState(seconds);
  const finish = useFinishOnce(onFinish);
  const [boxRef, box] = useBox<HTMLDivElement>();
  const pz = useMemo(() => pickPuzzle(t0), [t0]);

  const [path, setPath] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [over, setOver] = useState(false);
  const [bad, setBad] = useState<{ cell: number; text: string; id: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const pathRef = useRef<number[]>([]);
  const scoreRef = useRef<number | null>(null);
  const overRef = useRef(false);
  const badRef = useRef({ cell: -1, at: 0, id: 0 });
  const timers = useRef<number[]>([]);
  const drag = useRef<{ id: number; left: number; top: number; scale: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((id) => window.clearTimeout(id));
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  // Hết giờ: đã giải thì giữ điểm lúc giải, chưa giải thì tính theo số ô đã nối.
  useEffect(() => {
    const id = window.setTimeout(
      () => {
        overRef.current = true;
        setOver(true);
        setDragging(false);
        drag.current = null;
        finish(scoreRef.current ?? (400 * pathRef.current.length) / pz.total);
      },
      Math.max(0, t0 + secs * 1000 - Date.now()),
    );
    return () => window.clearTimeout(id);
  }, [finish, pz.total, secs, t0]);

  const locked = () => overRef.current || scoreRef.current !== null;
  const isLocked = useCallback(() => overRef.current || scoreRef.current !== null, []);

  const flashBad = useCallback(
    (cell: number, kind: Bad) => {
      const now = Date.now();
      const b = badRef.current;
      if (b.cell === cell && now - b.at < 700) return;
      b.cell = cell;
      b.at = now;
      b.id += 1;
      const id = b.id;
      setBad({ cell, text: BAD_TEXT[kind](nextNumber(pz, pathRef.current)), id });
      later(() => setBad((cur) => (cur && cur.id === id ? null : cur)), 1500);
    },
    [later, pz],
  );

  const commit = useCallback((next: number[]) => {
    pathRef.current = next;
    setPath(next);
  }, []);

  const solve = useCallback(
    (next: number[]) => {
      if (!isSolution(pz, next)) return;
      const used = (Date.now() - t0) / 1000;
      if (used >= secs || isLocked()) return;
      scoreRef.current = Math.round(1000 - 500 * Math.max(0, Math.min(1, used / secs)));
      setSolved(true);
      setDragging(false);
      drag.current = null;
      sfx.stamp();
      later(() => {
        overRef.current = true;
        setOver(true);
        finish(scoreRef.current ?? 0);
      }, FINISH_DELAY);
    },
    [finish, isLocked, later, pz, secs, t0],
  );

  /** Áp dụng một lần con trỏ đi vào ô j; trả về false nếu ô đó không đi được. */
  const enter = useCallback(
    (j: number) => {
      const r = stepInto(pz, pathRef.current, j);
      if (r.kind === "bad") {
        flashBad(r.cell, r.bad);
        return false;
      }
      if (r.kind === "none") return true;
      commit(r.path);
      if (r.kind === "solve") solve(r.path);
      return true;
    },
    [commit, flashBad, pz, solve],
  );

  /** Đi tới ô (r, c) từ đầu đường; đi chéo qua góc thì tìm ô trung gian hợp lệ. */
  const reach = useCallback(
    (j: number) => {
      const path = pathRef.current;
      if (!path.length) return;
      const head = path[path.length - 1];
      if (j === head) return;
      const dr = rowOf(j) - rowOf(head);
      const dc = colOf(j) - colOf(head);
      if (Math.abs(dr) + Math.abs(dc) === 1) {
        enter(j);
        return;
      }
      if (Math.abs(dr) === 1 && Math.abs(dc) === 1) {
        const a = head + dc;
        const b = head + dr * N;
        for (const mid of [a, b]) {
          const s1 = stepInto(pz, path, mid);
          if (s1.kind === "bad" || s1.kind === "none") continue;
          const s2 = stepInto(pz, s1.path, j);
          if (s2.kind === "bad" || s2.kind === "none") continue;
          enter(mid);
          enter(j);
          return;
        }
      }
    },
    [enter, pz],
  );

  /** Ô dưới con trỏ (theo tọa độ trong khung vẽ), có vùng đệm ở mép ô để đường không giật qua lại. */
  const cellAt = (x: number, y: number, strict: boolean) => {
    const gx = (x - M) / CS;
    const gy = (y - M) / CS;
    if (gx < 0 || gy < 0 || gx >= N || gy >= N) return -1;
    if (strict) {
      const fx = gx - Math.floor(gx);
      const fy = gy - Math.floor(gy);
      if (fx < 0.12 || fx > 0.88 || fy < 0.12 || fy > 0.88) return -1;
    }
    return Math.floor(gy) * N + Math.floor(gx);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (locked() || (e.pointerType === "mouse" && e.button !== 0)) return;
    const r = e.currentTarget.getBoundingClientRect();
    const scale = VB / r.width;
    const x = (e.clientX - r.left) * scale;
    const y = (e.clientY - r.top) * scale;
    const j = cellAt(x, y, false);
    if (j < 0) return;
    e.preventDefault();
    const path = pathRef.current;
    if (j === pz.bases[0]) {
      commit([j]);
      sfx.tick();
    } else if (path.includes(j)) {
      commit(path.slice(0, path.indexOf(j) + 1));
    } else if (!path.length) {
      flashBad(j, "start");
      return;
    } else if (!adjacent(path[path.length - 1], j)) {
      return;
    } else if (!enter(j)) {
      return;
    }
    if (locked()) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, left: r.left, top: r.top, scale, x, y };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id || locked()) return;
    const x = (e.clientX - d.left) * d.scale;
    const y = (e.clientY - d.top) * d.scale;
    // Lấy mẫu dọc quãng vừa kéo để không bỏ sót ô khi kéo nhanh.
    const dist = Math.hypot(x - d.x, y - d.y);
    const n = Math.max(1, Math.ceil(dist / (CS * 0.22)));
    for (let k = 1; k <= n; k++) {
      const sx = d.x + ((x - d.x) * k) / n;
      const sy = d.y + ((y - d.y) * k) / n;
      const j = cellAt(sx, sy, true);
      if (j >= 0) reach(j);
      if (!drag.current) return;
    }
    d.x = x;
    d.y = y;
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    setDragging(false);
  };

  const undo = useCallback(() => {
    if (isLocked()) return;
    const path = pathRef.current;
    if (path.length) commit(path.slice(0, -1));
  }, [commit, isLocked]);

  const restart = useCallback(() => {
    if (isLocked()) return;
    commit([]);
  }, [commit, isLocked]);

  // Bàn phím: mũi tên để đi (đi ngược về ô trước là lùi), Backspace để lùi một bước.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || isLocked()) return;
      const mv = ({ ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] } as Record<string, [number, number]>)[e.key];
      if (mv) {
        e.preventDefault();
        const path = pathRef.current;
        if (!path.length) {
          enter(pz.bases[0]);
          return;
        }
        const head = path[path.length - 1];
        const r = rowOf(head) + mv[0];
        const c = colOf(head) + mv[1];
        if (r < 0 || c < 0 || r >= N || c >= N) return;
        enter(r * N + c);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enter, isLocked, pz, undo]);

  const lay = plan(box.w || 700, box.h || 450);
  const next = nextNumber(pz, path);
  const head = path.length ? path[path.length - 1] : -1;
  const moves = useMemo(() => {
    if (solved || over) return [] as number[];
    if (!path.length) return [pz.bases[0]];
    const out: number[] = [];
    const h = path[path.length - 1];
    for (const j of [h - N, h + N, h - 1, h + 1]) {
      if (j < 0 || j >= CELLS || !adjacent(h, j)) continue;
      const s = stepInto(pz, path, j);
      if (s.kind !== "bad" && s.kind !== "undo" && s.kind !== "none") out.push(j);
    }
    return out;
  }, [over, path, pz, solved]);

  const status = {
    covered: path.length,
    total: pz.total,
    next: Math.min(next, pz.K),
    last: next >= pz.K,
  };

  return (
    <div
      ref={boxRef}
      className="relative h-full w-full select-none overflow-hidden bg-[#1a110a]"
      data-game="network"
      data-solved={solved ? 1 : 0}
      data-over={over ? 1 : 0}
      data-path-len={path.length}
      data-total={pz.total}
      data-path={path.join(",")}
      data-solution={pz.solution.join(",")}
      data-bases={pz.bases.join(",")}
      data-posts={pz.posts.join(",")}
    >
      <Desk />
      {box.w > 0 &&
        (lay.mode === "side" ? (
          <div className="absolute inset-0 flex items-center" style={{ padding: lay.p, gap: lay.p }}>
            <BoardFrame size={lay.board}>
              <Board
                size={lay.board}
                pz={pz}
                path={path}
                head={head}
                moves={moves}
                bad={bad}
                solved={solved}
                dragging={dragging}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
              />
            </BoardFrame>
            <SidePanel width={lay.panelW} status={status} bad={bad} onUndo={undo} onRestart={restart} disabled={solved || over} pathLen={path.length} />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ padding: lay.p, gap: lay.p }}>
            <TopBar width={lay.board} height={lay.barH} status={status} onUndo={undo} onRestart={restart} disabled={solved || over} pathLen={path.length} />
            <BoardFrame size={lay.board}>
              <Board
                size={lay.board}
                pz={pz}
                path={path}
                head={head}
                moves={moves}
                bad={bad}
                solved={solved}
                dragging={dragging}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                toast
              />
            </BoardFrame>
          </div>
        ))}
    </div>
  );
}

/* ───────────── Mặt bàn ───────────── */

const Desk = memo(function Desk() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <WoodSurface seed={33} plank={78} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 80% at 42% 45%, rgba(255,198,130,0.18), transparent 70%)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 120% 115% at 45% 45%, transparent 45%, rgba(0,0,0,0.62) 100%)" }} />
    </div>
  );
});

function BoardFrame({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="sheet absolute inset-0 overflow-hidden rounded-[2px]"
        style={{ rotate: "-0.5deg", boxShadow: "0 16px 26px -10px rgba(0,0,0,0.85), 0 3px 6px rgba(0,0,0,0.45)" }}
      >
        <div aria-hidden className="absolute inset-0 opacity-40 mix-blend-multiply" style={{ backgroundImage: GRAIN }} />
        <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(120% 120% at 30% 25%, rgba(255,246,222,0.22), transparent 55%), radial-gradient(90% 70% at 85% 90%, rgba(120,78,30,0.16), transparent 70%)" }} />
        {children}
      </div>
      <span aria-hidden className="tape absolute -top-[7px] left-[12%] h-[16px] w-[54px] -rotate-6" />
      <span aria-hidden className="tape absolute -bottom-[6px] right-[10%] h-[16px] w-[50px] rotate-[4deg]" />
    </div>
  );
}

/* ───────────── Bản đồ ───────────── */

function Board({
  size,
  pz,
  path,
  head,
  moves,
  bad,
  solved,
  dragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  toast = false,
}: {
  size: number;
  pz: Puzzle;
  path: number[];
  head: number;
  moves: number[];
  bad: { cell: number; text: string; id: number } | null;
  solved: boolean;
  dragging: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  toast?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const inPath = useMemo(() => new Set(path), [path]);
  const points = path.map((c) => `${cx(c)},${cy(c)}`).join(" ");
  return (
    <div
      data-board
      role="application"
      aria-label={`Sơ đồ liên lạc 6 × 6: kéo đường dây từ cơ sở số 1, qua các cơ sở theo thứ tự, phủ kín ${pz.total} ô trống. Đã nối ${path.length} ô.`}
      tabIndex={0}
      className={cn("absolute inset-0 touch-none outline-none focus-visible:ring-2 focus-visible:ring-gold/70", solved ? "cursor-default" : dragging ? "cursor-grabbing" : "cursor-pointer")}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onLostPointerCapture={onPointerUp}
    >
      <svg viewBox={`0 0 ${VB} ${VB}`} className="absolute inset-0 h-full w-full">
        <style>{"@keyframes mn-net-x{0%,55%{opacity:0.95}100%{opacity:0}}"}</style>
        <defs>
          <pattern id={`ht${uid}`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="10" height="10" fill="rgba(70,40,18,0.06)" />
            <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(60,30,12,0.42)" strokeWidth="3" />
          </pattern>
          <filter id={`sh${uid}`} x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
          <filter id={`ro${uid}`} x="-3%" y="-3%" width="106%" height="106%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="6" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <MapDecor />
        {/* khung bản đồ: viền kép */}
        <rect x={M - 7} y={M - 7} width={VB - 2 * M + 14} height={VB - 2 * M + 14} fill="none" stroke="rgba(52,34,16,0.75)" strokeWidth="3" />
        <rect x={M - 1.5} y={M - 1.5} width={VB - 2 * M + 3} height={VB - 2 * M + 3} fill="none" stroke="rgba(52,34,16,0.55)" strokeWidth="1.2" />
        {/* lưới chì */}
        {Array.from({ length: N - 1 }, (_, i) => (
          <g key={i} stroke="rgba(70,50,28,0.32)" strokeWidth="1.3" strokeDasharray="3 6">
            <line x1={M + (i + 1) * CS} y1={M} x2={M + (i + 1) * CS} y2={VB - M} />
            <line x1={M} y1={M + (i + 1) * CS} x2={VB - M} y2={M + (i + 1) * CS} />
          </g>
        ))}
        {/* đồn lính */}
        {pz.posts.map((c) => (
          <g key={`p${c}`}>
            <rect x={M + colOf(c) * CS + 3} y={M + rowOf(c) * CS + 3} width={CS - 6} height={CS - 6} fill={`url(#ht${uid})`} />
            <Fort x={cx(c)} y={cy(c)} />
          </g>
        ))}
        {/* xóm */}
        {Array.from({ length: CELLS }, (_, i) =>
          pz.isPost[i] || pz.numAt[i] ? null : <Hamlet key={`h${i}`} x={cx(i)} y={cy(i)} lit={inPath.has(i)} seed={i} />,
        )}
        {/* nước đi được: vòng chì mờ */}
        {moves.map((c) => (
          <circle key={`m${c}`} cx={cx(c)} cy={cy(c)} r={CS * 0.36} fill="none" stroke="rgba(150,34,24,0.45)" strokeWidth="2" strokeDasharray="4 5">
            <animate attributeName="stroke-dashoffset" values="0;18" dur="1.6s" repeatCount="indefinite" />
          </circle>
        ))}
        {/* sợi chỉ đỏ */}
        {path.length > 1 && (
          <g strokeLinecap="round" strokeLinejoin="round" fill="none">
            <polyline points={points} stroke="rgba(30,8,4,0.45)" strokeWidth="15" transform="translate(2.5,4)" filter={`url(#sh${uid})`} />
            <polyline points={points} stroke="#8e1710" strokeWidth="12" />
            <polyline points={points} stroke="#c23527" strokeWidth="7" />
            <polyline points={points} stroke="rgba(255,190,170,0.55)" strokeWidth="2" strokeDasharray="5 7" />
          </g>
        )}
        {path.length === 1 && <circle cx={cx(path[0])} cy={cy(path[0])} r="7" fill="#8e1710" />}
        {/* cơ sở */}
        {pz.bases.map((c, k) => (
          <Base key={`b${c}`} x={cx(c)} y={cy(c)} n={k + 1} tied={inPath.has(c)} />
        ))}
        {/* đầu sợi chỉ */}
        {head >= 0 && !solved && (
          <g pointerEvents="none">
            <circle cx={cx(head)} cy={cy(head)} r={CS * 0.2} fill="none" stroke="#b3261e" strokeWidth="3">
              <animate attributeName="r" values={`${CS * 0.18};${CS * 0.42};${CS * 0.18}`} dur="1.3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0;0.9" dur="1.3s" repeatCount="indefinite" />
            </circle>
            {!pz.numAt[head] && <circle cx={cx(head)} cy={cy(head)} r="9" fill="#7d130d" stroke="#f3dcc0" strokeWidth="2" />}
          </g>
        )}
        {/* ô không đi được: dấu gạch chéo đỏ */}
        {bad && (
          <g key={bad.id} filter={`url(#ro${uid})`} style={{ animation: "mn-net-x 1.2s ease-in forwards" }}>
            <path
              d={`M${cx(bad.cell) - CS * 0.28},${cy(bad.cell) - CS * 0.28} L${cx(bad.cell) + CS * 0.28},${cy(bad.cell) + CS * 0.28} M${cx(bad.cell) + CS * 0.28},${cy(bad.cell) - CS * 0.28} L${cx(bad.cell) - CS * 0.28},${cy(bad.cell) + CS * 0.28}`}
              stroke="#c0281c"
              strokeWidth="8"
              strokeLinecap="round"
            />
          </g>
        )}
        {/* ô bắt sự kiện, để kịch bản kiểm thử tìm được tâm từng ô */}
        {Array.from({ length: CELLS }, (_, i) => (
          <rect key={`c${i}`} data-cell={i} x={M + colOf(i) * CS} y={M + rowOf(i) * CS} width={CS} height={CS} fill="transparent" />
        ))}
      </svg>
      {toast && (
        <AnimatePresence>
          {bad && (
            <motion.div
              key={bad.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-x-0 bottom-[5%] flex justify-center px-3"
            >
              <span className="rounded-[2px] bg-[#1b120b]/90 px-2.5 py-1 text-center font-type text-[12px] font-bold leading-tight text-cream shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                {bad.text}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      )}
      <AnimatePresence>
        {solved && (
          <motion.div key="ok" className="pointer-events-none absolute inset-0 grid place-items-center" initial={{ opacity: 1 }}>
            <div style={{ fontSize: Math.max(18, Math.min(40, size * 0.085)) }}>
              <Stamp ink="red" rotate={-9} delay={0.12} className="whitespace-nowrap border-[4px] bg-[#efe3c6]/90 mix-blend-normal shadow-[0_6px_14px_rgba(0,0,0,0.35)]">
                Đường dây thông
              </Stamp>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Trang trí bản đồ cũ: một khúc sông, vài bờ ruộng, hoa gió nhỏ (mờ, không lẫn với ô chơi). */
const MapDecor = memo(function MapDecor() {
  return (
    <g pointerEvents="none">
      <path
        d="M-10,412 C60,380 110,446 182,420 C252,394 268,318 340,310 C420,300 452,372 520,350 C566,335 590,300 612,288"
        fill="none"
        stroke="rgba(72,96,112,0.2)"
        strokeWidth="22"
        strokeLinecap="round"
      />
      <path
        d="M-10,412 C60,380 110,446 182,420 C252,394 268,318 340,310 C420,300 452,372 520,350 C566,335 590,300 612,288"
        fill="none"
        stroke="rgba(52,74,92,0.28)"
        strokeWidth="1.5"
        strokeDasharray="10 8"
      />
      {[
        [70, 120],
        [250, 520],
        [470, 150],
        [520, 500],
        [140, 300],
      ].map(([x, y], i) => (
        <g key={i} stroke="rgba(72,92,40,0.22)" strokeWidth="1.6">
          {[0, 1, 2, 3].map((k) => (
            <line key={k} x1={x + k * 9} y1={y} x2={x + k * 9 + 4} y2={y - 9} />
          ))}
        </g>
      ))}
    </g>
  );
});

/** Xóm: cụm hai mái nhà nhỏ góc trên ô và chấm giữa ô (nơi đường dây đi qua). */
const Hamlet = memo(function Hamlet({ x, y, lit, seed }: { x: number; y: number; lit: boolean; seed: number }) {
  const ox = x - CS * 0.27 + ((seed * 7) % 5) - 2;
  const oy = y - CS * 0.22 + ((seed * 3) % 4) - 2;
  const ink = lit ? "rgba(130,30,20,0.8)" : "rgba(64,44,24,0.62)";
  const hut = (hx: number, hy: number, s: number) => `M${hx - 7 * s},${hy} L${hx},${hy - 7 * s} L${hx + 7 * s},${hy} M${hx - 5 * s},${hy} L${hx - 5 * s},${hy + 5 * s} L${hx + 5 * s},${hy + 5 * s} L${hx + 5 * s},${hy}`;
  return (
    <g pointerEvents="none">
      <path d={hut(ox, oy, 1)} fill="none" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
      <path d={hut(ox + 13, oy + 5, 0.8)} fill="none" stroke={ink} strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx={x} cy={y} r={lit ? 5 : 4.2} fill={lit ? "#7d130d" : "rgba(64,44,24,0.55)"} />
    </g>
  );
});

/** Đồn lính: lô cốt có lỗ châu mai, cột cờ. */
const Fort = memo(function Fort({ x, y }: { x: number; y: number }) {
  const s = CS / 94;
  return (
    <g transform={`translate(${x},${y}) scale(${s})`} pointerEvents="none">
      <ellipse cx="0" cy="22" rx="30" ry="6" fill="rgba(40,22,10,0.25)" />
      <path d="M-22,20 L-22,-6 L-16,-6 L-16,-12 L-9,-12 L-9,-6 L-3,-6 L-3,-12 L4,-12 L4,-6 L10,-6 L10,-12 L16,-12 L16,-6 L22,-6 L22,20 Z" fill="#3b2a1a" stroke="#1d130a" strokeWidth="2" strokeLinejoin="round" />
      <rect x="-6" y="6" width="12" height="14" fill="#1a110a" />
      <rect x="-16" y="1" width="6" height="4" fill="#d9c6a0" opacity="0.7" />
      <rect x="10" y="1" width="6" height="4" fill="#d9c6a0" opacity="0.7" />
      <line x1="0" y1="-12" x2="0" y2="-36" stroke="#1d130a" strokeWidth="2.4" />
      <path d="M0,-36 L17,-31 L0,-26 Z" fill="#9b1d14" stroke="#1d130a" strokeWidth="1.2" />
    </g>
  );
});

/** Cơ sở: vòng mực đỏ đánh số; khi sợi chỉ đã buộc qua thì tô đỏ, có nút thắt. */
const Base = memo(function Base({ x, y, n, tied }: { x: number; y: number; n: number; tied: boolean }) {
  const r = CS * 0.3;
  return (
    <g pointerEvents="none">
      {tied && (
        <g stroke="#6d0f0a" strokeWidth="4" fill="none" strokeLinecap="round">
          <path d={`M${x - r - 7},${y + 4} q6,-12 12,-2`} />
          <path d={`M${x + r + 7},${y - 4} q-6,12 -12,2`} />
        </g>
      )}
      <circle cx={x + 1.5} cy={y + 2.5} r={r + 1} fill="rgba(30,10,4,0.28)" />
      <circle cx={x} cy={y} r={r} fill={tied ? "#a51f17" : "#efe1c2"} stroke="#9d1f16" strokeWidth="4" />
      <circle cx={x} cy={y} r={r - 6} fill="none" stroke={tied ? "rgba(255,220,200,0.5)" : "rgba(157,31,22,0.55)"} strokeWidth="1.5" />
      <text x={x} y={y + r * 0.38} textAnchor="middle" fontSize={r * 1.12} fontWeight="700" className="font-head" fill={tied ? "#f7ead2" : "#9d1f16"}>
        {n}
      </text>
    </g>
  );
});

/* ───────────── Bảng tình trạng ───────────── */

interface Status {
  covered: number;
  total: number;
  next: number;
  last: boolean;
}

function SidePanel({
  width,
  status,
  bad,
  onUndo,
  onRestart,
  disabled,
  pathLen,
}: {
  width: number;
  status: Status;
  bad: { text: string; id: number } | null;
  onUndo: () => void;
  onRestart: () => void;
  disabled: boolean;
  pathLen: number;
}) {
  const f = Math.max(11, Math.min(14, width / 16));
  return (
    <div className="flex min-w-0 shrink-0 flex-col justify-center gap-3" style={{ width, fontSize: f }}>
      <div className="sheet relative rounded-[2px] px-[0.9em] pb-[0.8em] pt-[0.75em]" style={{ rotate: "1.2deg" }}>
        <div className="label text-stamp" style={{ fontSize: "0.8em" }}>
          Phiếu giao liên · 1933
        </div>
        <div className="mt-[0.35em] flex items-baseline gap-[0.35em] font-head text-ink">
          <span className="text-[2.3em] font-bold leading-none tabular-nums">{status.covered}</span>
          <span className="text-[1.15em] font-semibold text-ink-2">/ {status.total} xóm</span>
        </div>
        <Progress value={status.covered / status.total} />
        <div className="mt-[0.5em] font-type text-[0.92em] font-bold leading-snug text-ink">
          {status.covered === 0 ? "Bắt đầu ở cơ sở số 1" : status.last ? `Tới cơ sở cuối: số ${status.next}` : `Cơ sở kế tiếp: số ${status.next}`}
        </div>
        <div className="mt-[0.35em] h-[2.6em] font-type text-[0.82em] leading-snug text-stamp" aria-live="polite">
          <AnimatePresence mode="wait">
            {bad && (
              <motion.span key={bad.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="block font-bold">
                {bad.text}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
      <Legend />
      <div className="flex flex-wrap gap-2">
        <PanelButton onClick={onUndo} disabled={disabled || pathLen === 0} label="Lùi một bước">
          <Undo2 className="h-[18px] w-[18px]" aria-hidden />
        </PanelButton>
        <PanelButton onClick={onRestart} disabled={disabled || pathLen === 0} label="Nối lại">
          <RotateCcw className="h-[17px] w-[17px]" aria-hidden />
        </PanelButton>
      </div>
    </div>
  );
}

function TopBar({
  width,
  height,
  status,
  onUndo,
  onRestart,
  disabled,
  pathLen,
}: {
  width: number;
  height: number;
  status: Status;
  onUndo: () => void;
  onRestart: () => void;
  disabled: boolean;
  pathLen: number;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2" style={{ width, height }}>
      <div className="sheet flex h-full min-w-0 flex-1 items-center gap-1.5 whitespace-nowrap rounded-[2px] px-2.5" style={{ rotate: "-0.4deg" }}>
        <span className="font-head text-[20px] font-bold leading-none tabular-nums text-ink">{status.covered}</span>
        <span className="font-head text-[13px] font-semibold leading-none text-ink-2">
          /{status.total}
          {width >= 300 && <span className="uppercase tracking-wide"> xóm</span>}
        </span>
        <span className="ml-auto truncate font-type text-[12px] font-bold text-stamp">
          {status.covered === 0 ? "Từ số 1" : status.last ? `Cuối: số ${status.next}` : `Tiếp: số ${status.next}`}
        </span>
      </div>
      <IconButton onClick={onUndo} disabled={disabled || pathLen === 0} label="Lùi một bước">
        <Undo2 className="h-[18px] w-[18px]" aria-hidden />
      </IconButton>
      <IconButton onClick={onRestart} disabled={disabled || pathLen === 0} label="Nối lại từ đầu">
        <RotateCcw className="h-[17px] w-[17px]" aria-hidden />
      </IconButton>
    </div>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="relative mt-[0.45em] h-[0.5em] w-full rounded-full bg-[rgba(70,48,24,0.18)]">
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: "linear-gradient(180deg, #c23527, #8e1710)" }}
        initial={false}
        animate={{ width: `${Math.round(value * 100)}%` }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    </div>
  );
}

function Legend() {
  return (
    <div className="grid gap-[0.3em] px-[0.2em] font-type text-[0.86em] font-bold text-cream/85">
      <div className="flex items-center gap-[0.55em]">
        <svg viewBox="0 0 30 30" className="h-[1.9em] w-[1.9em] shrink-0" aria-hidden>
          <circle cx="15" cy="15" r="11" fill="#efe1c2" stroke="#9d1f16" strokeWidth="2.5" />
          <text x="15" y="19.5" textAnchor="middle" fontSize="13" fontWeight="700" className="font-head" fill="#9d1f16">
            1
          </text>
        </svg>
        Cơ sở (đi theo thứ tự số)
      </div>
      <div className="flex items-center gap-[0.55em]">
        <svg viewBox="-30 -40 60 66" className="h-[1.9em] w-[1.9em] shrink-0 rounded-[2px] bg-[#e7d9b8]" aria-hidden>
          <path d="M-22,20 L-22,-6 L-16,-6 L-16,-12 L-9,-12 L-9,-6 L-3,-6 L-3,-12 L4,-12 L4,-6 L10,-6 L10,-12 L16,-12 L16,-6 L22,-6 L22,20 Z" fill="#3b2a1a" />
          <line x1="0" y1="-12" x2="0" y2="-36" stroke="#1d130a" strokeWidth="2.4" />
          <path d="M0,-36 L17,-31 L0,-26 Z" fill="#9b1d14" />
        </svg>
        Đồn lính (không đi qua)
      </div>
      <div className="flex items-center gap-[0.55em]">
        <svg viewBox="0 0 30 30" className="h-[1.9em] w-[1.9em] shrink-0 rounded-[2px] bg-[#e7d9b8]" aria-hidden>
          <path d="M5,14 L11,8 L17,14 M7,14 L7,19 L15,19 L15,14" fill="none" stroke="#40301b" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="21" cy="21" r="2.6" fill="#40301b" />
        </svg>
        Xóm (phải qua hết)
      </div>
    </div>
  );
}

function PanelButton({ onClick, disabled, label, children }: { onClick: () => void; disabled: boolean; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[4px] bg-[#1b140e] px-3 font-head text-[14px] font-semibold uppercase tracking-[0.06em] text-cream shadow-[0_3px_0_#000,0_10px_18px_-10px_rgba(0,0,0,0.9)] ring-1 ring-cream/20 transition-[transform,box-shadow] duration-100 hover:bg-[#261c13] active:translate-y-[2px] active:shadow-[0_1px_0_#000] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      {children}
      {label}
    </button>
  );
}

function IconButton({ onClick, disabled, label, children }: { onClick: () => void; disabled: boolean; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-[4px] bg-[#1b140e] text-cream shadow-[0_3px_0_#000] ring-1 ring-cream/20 transition-[transform,box-shadow] duration-100 active:translate-y-[2px] active:shadow-[0_1px_0_#000] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      {children}
    </button>
  );
}
