"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Eye, Flame, ScrollText, X } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stamp } from "@/components/kit/Stamp";
import { INK_COVER, INK_HIDDEN, INK_QUESTIONS, INK_SLOTS } from "@/game/data/minis";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/sfx";
import { GRAIN, mulberry32, qa, useBox, useFinishOnce, WoodSurface } from "./shared";
import type { MiniProps } from "./types";

/*
 * "Thư viết bằng nước chanh" (đầu năm 1935): lá thư hỏi thăm gia đình, giữa các dòng là lời dặn viết bằng nước chanh.
 * Giữ và kéo ngọn đèn dầu qua lá thư: chỗ được hơ nóng dần dần hiện chữ màu nâu (nhiệt tích lũy trên một lưới ô thô,
 * qua ngưỡng thì chữ hiện, đã hiện thì không mất). Giữ đèn yên một chỗ quá khoảng 1,2 giây: giấy cháy xém, chữ chỗ đó mất.
 * Hiện được 85% lời dặn (hoặc bấm "Đọc xong"): trả lời một câu hỏi, ba phương án là ba giá trị của chỗ trống tương ứng.
 * Đúng: 1000 − 350 × thời gian/thời gian cho phép − 120 × số chỗ cháy (350–1000). Sai: 100. Hết giờ chưa trả lời: 250 × tỉ lệ chữ đã hiện.
 * Lời dặn trong thư là hư cấu (xem data/minis.ts).
 */

const HEAT_RATE = 2.1; // nhiệt mỗi giây ở tâm ngọn đèn
const COOL = 1.1; // giấy nguội đi mỗi giây (luôn luôn): ở tâm đèn nhiệt tăng 1,0 mỗi giây
const REV0 = 0.08; // bắt đầu hiện chữ
const REV1 = 0.32; // chữ hiện rõ
const BURN = 1.2; // cháy xém: khoảng 1,2 giây giữ yên ở tâm
const DONE_AT = 0.85;
const FINISH_DELAY = 1050;

type Phase = "heat" | "question" | "done" | "timeout";

/* ───────────── Nội dung theo mốc bắt đầu ───────────── */

function pickLetter(seed: number) {
  const rnd = mulberry32(Math.floor(seed) ^ 0x51ed27);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length) % a.length];
  const v = { date: pick(INK_SLOTS.date), person: pick(INK_SLOTS.person), phrase: pick(INK_SLOTS.phrase) };
  const q = pick(INK_QUESTIONS);
  const opts: string[] = [...INK_SLOTS[q.slot]];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return { hidden: INK_HIDDEN(v), question: q.question, opts, answer: opts.indexOf(v[q.slot]) };
}

/* ───────────── Bố cục ───────────── */

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Lay {
  mode: "side" | "col";
  p: number;
  paper: Rect;
  panel: Rect;
  R: number;
}

function plan(w: number, h: number): Lay {
  const p = Math.round(Math.max(6, Math.min(12, Math.min(w, h) * 0.026)));
  const R = Math.round(Math.max(48, Math.min(66, Math.min(w, h) * 0.15 + 8)));
  if (w >= 520 && w >= h * 1.3) {
    const pw = Math.round(Math.max(170, Math.min(240, w * 0.3)));
    return { mode: "side", p, R, paper: { x: p, y: p, w: w - 3 * p - pw, h: h - 2 * p }, panel: { x: w - p - pw, y: p, w: pw, h: h - 2 * p } };
  }
  const bar = 44;
  return { mode: "col", p, R, paper: { x: p, y: 2 * p + bar, w: w - 2 * p, h: h - 3 * p - bar }, panel: { x: p, y: p, w: w - 2 * p, h: bar } };
}

/* ───────────── Dàn chữ trong lá thư (đo bằng canvas với đúng phông chữ) ───────────── */

interface Line {
  text: string;
  y: number;
  hidden: boolean;
}
interface TextLay {
  f: number;
  fh: number;
  padX: number;
  cover: Line[];
  hidden: Line[];
  family: string;
  key: string;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(" ");
  const out: string[] = [];
  let cur = "";
  for (const wd of words) {
    const t = cur ? `${cur} ${wd}` : wd;
    if (cur && ctx.measureText(t).width > maxW) {
      out.push(cur);
      cur = wd;
    } else cur = t;
  }
  if (cur) out.push(cur);
  return out;
}

function layoutText(paper: Rect, hidden: string[], family: string): TextLay {
  const ctx = document.createElement("canvas").getContext("2d")!;
  const padX = Math.round(Math.max(10, paper.w * 0.052));
  const padY = Math.round(Math.max(10, paper.h * 0.055));
  const innerW = paper.w - 2 * padX;
  const innerH = paper.h - 2 * padY;
  const build = (f: number) => {
    const fh = f * 0.93;
    const cover: Line[] = [];
    const hid: Line[] = [];
    let y = padY;
    INK_COVER.forEach((para, i) => {
      ctx.font = `italic 400 ${f}px ${family}`;
      for (const l of wrap(ctx, para, innerW)) {
        cover.push({ text: l, y, hidden: false });
        y += f * 1.36;
      }
      y += f * 0.12;
      ctx.font = `italic 400 ${fh}px ${family}`;
      for (const l of wrap(ctx, hidden[i], innerW)) {
        hid.push({ text: l, y, hidden: true });
        y += fh * 1.34;
      }
      y += f * 0.3;
    });
    return { f, fh, cover, hidden: hid, height: y - padY };
  };
  let lo = 8;
  let hi = Math.min(21, innerW / 17);
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (build(mid).height <= innerH) lo = mid;
    else hi = mid;
  }
  const b = build(Math.floor(lo * 4) / 4);
  // Còn thừa chỗ thì dàn đều xuống giữa tờ giấy.
  const spare = Math.max(0, innerH - b.height);
  const shift = Math.min(spare / 2, padY);
  const mv = (l: Line) => ({ ...l, y: l.y + shift });
  return { f: b.f, fh: b.fh, padX, cover: b.cover.map(mv), hidden: b.hidden.map(mv), family, key: `${paper.w}x${paper.h}:${b.f}:${family}` };
}

/* ───────────── Mô phỏng nhiệt trên lưới ô ───────────── */

interface Sim {
  w: number;
  h: number;
  dpr: number;
  g: number;
  cols: number;
  rows: number;
  heat: Float32Array;
  reveal: Float32Array;
  burned: Uint8Array;
  weight: Float32Array;
  totalW: number;
  ink: HTMLCanvasElement;
  mask: HTMLCanvasElement;
  maskImg: ImageData;
  tint: HTMLCanvasElement;
  tintImg: ImageData;
  burn: HTMLCanvasElement;
  dirty: boolean;
  revealed: number;
  burns: number;
  lastBurn: { at: number; x: number; y: number };
  rnd: () => number;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function makeSim(paper: Rect, text: TextLay, seed: number): Sim {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = paper.w;
  const h = paper.h;
  const g = Math.round(Math.max(8, Math.min(13, Math.min(w, h) / 26)));
  const cols = Math.ceil(w / g);
  const rows = Math.ceil(h / g);
  const ink = makeCanvas(w * dpr, h * dpr);
  const ictx = ink.getContext("2d", { willReadFrequently: true })!;
  ictx.scale(dpr, dpr);
  ictx.font = `italic 400 ${text.fh}px ${text.family}`;
  ictx.textBaseline = "alphabetic";
  // Nước chanh hơ nóng ngả màu nâu, nét loang nhẹ.
  for (const l of text.hidden) {
    const by = l.y + text.fh * 1.02;
    ictx.filter = "blur(0.7px)";
    ictx.fillStyle = "rgba(140,72,22,0.55)";
    ictx.fillText(l.text, text.padX + 0.4, by + 0.4);
    ictx.filter = "none";
    ictx.fillStyle = "#6a3410";
    ictx.fillText(l.text, text.padX, by);
  }
  // Lượng mực trong từng ô (để tính tỉ lệ chữ đã hiện).
  const weight = new Float32Array(cols * rows);
  const data = ictx.getImageData(0, 0, ink.width, ink.height).data;
  const gp = g * dpr;
  for (let y = 0; y < ink.height; y += 2) {
    const r = Math.min(rows - 1, Math.floor(y / gp));
    for (let x = 0; x < ink.width; x += 2) {
      const a = data[(y * ink.width + x) * 4 + 3];
      if (a > 40) weight[r * cols + Math.min(cols - 1, Math.floor(x / gp))] += a / 255;
    }
  }
  let totalW = 0;
  for (let i = 0; i < weight.length; i++) totalW += weight[i];
  const mask = makeCanvas(cols, rows);
  const tint = makeCanvas(cols, rows);
  return {
    w,
    h,
    dpr,
    g,
    cols,
    rows,
    heat: new Float32Array(cols * rows),
    reveal: new Float32Array(cols * rows),
    burned: new Uint8Array(cols * rows),
    weight,
    totalW: Math.max(1e-6, totalW),
    ink,
    mask,
    maskImg: mask.getContext("2d")!.createImageData(cols, rows),
    tint,
    tintImg: tint.getContext("2d")!.createImageData(cols, rows),
    burn: makeCanvas(w * dpr, h * dpr),
    dirty: true,
    revealed: 0,
    burns: 0,
    lastBurn: { at: -1e9, x: -1e4, y: -1e4 },
    rnd: mulberry32(Math.floor(seed) ^ 0x9e3779b9),
  };
}

/** Vết cháy xém: nhiều quầng nâu sẫm chồng lên nhau, mép loang, vài đốm than. */
function scorch(s: Sim, x: number, y: number, r: number) {
  const c = s.burn.getContext("2d")!;
  c.save();
  c.scale(s.dpr, s.dpr);
  for (let k = 0; k < 9; k++) {
    const a = s.rnd() * Math.PI * 2;
    const d = s.rnd() * r * 0.45;
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d;
    const rr = r * (0.55 + s.rnd() * 0.5);
    const gr = c.createRadialGradient(px, py, 0, px, py, rr);
    gr.addColorStop(0, "rgba(22,10,4,0.72)");
    gr.addColorStop(0.45, "rgba(50,23,8,0.58)");
    gr.addColorStop(0.75, "rgba(110,58,18,0.26)");
    gr.addColorStop(1, "rgba(150,90,30,0)");
    c.fillStyle = gr;
    c.beginPath();
    c.arc(px, py, rr, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = "rgba(12,6,2,0.85)";
  for (let k = 0; k < 7; k++) {
    const a = s.rnd() * Math.PI * 2;
    const d = s.rnd() * r * 0.5;
    c.beginPath();
    c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 0.8 + s.rnd() * 2.2, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

/* ───────────── Trò chơi ───────────── */

export function Ink({ seconds, startedAt, onFinish }: MiniProps) {
  const [t0] = useState(startedAt);
  const [secs] = useState(seconds);
  const finish = useFinishOnce(onFinish);
  const [boxRef, box] = useBox<HTMLDivElement>();
  const letter = useMemo(() => pickLetter(t0), [t0]);

  const [phase, setPhase] = useState<Phase>("heat");
  const [view, setView] = useState({ revealed: 0, burns: 0 });
  const [text, setText] = useState<TextLay | null>(null);
  const [active, setActive] = useState(false);
  const [touched, setTouched] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [peek, setPeek] = useState(false);
  const [burnFlash, setBurnFlash] = useState(0);

  const phaseRef = useRef<Phase>("heat");
  const simRef = useRef<Sim | null>(null);
  const scoreRef = useRef<number | null>(null);
  const lamp = useRef({ on: false, x: 0, y: 0, id: -1, dy: 0 });
  const paperRef = useRef<HTMLDivElement>(null);
  const textCv = useRef<HTMLCanvasElement>(null);
  const heatCv = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const hotRef = useRef<HTMLDivElement>(null);
  const smokeRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const lay = plan(box.w || 700, box.h || 450);
  const { paper, R } = lay;

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((id) => window.clearTimeout(id));
  }, []);

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // Dàn chữ khi biết kích thước tờ giấy và phông chữ đã tải xong; dựng lại lưới nhiệt cho khớp.
  const hasBox = box.w > 0;
  const pw = paper.w;
  const ph = paper.h;
  useEffect(() => {
    if (!hasBox) return;
    let alive = true;
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-text").trim() || "Georgia, serif";
    const fonts = document.fonts;
    Promise.all([fonts.load(`italic 400 16px ${family}`, "Đạ"), fonts.ready])
      .catch(() => null)
      .then(() => {
        if (!alive) return;
        const rect = { x: 0, y: 0, w: pw, h: ph };
        const tl = layoutText(rect, letter.hidden, family);
        const sim = makeSim(rect, tl, t0);
        for (const c of [textCv.current, heatCv.current]) {
          if (!c) continue;
          c.width = Math.round(sim.w * sim.dpr);
          c.height = Math.round(sim.h * sim.dpr);
        }
        simRef.current = sim;
        setText(tl);
      });
    return () => {
      alive = false;
    };
  }, [hasBox, pw, ph, letter, t0]);

  // Hiện câu hỏi; đèn vẫn dùng được để hơ nốt những chữ còn mờ.
  const openQuestion = useCallback(() => {
    if (phaseRef.current !== "heat") return;
    go("question");
  }, [go]);

  // Hết giờ: đã trả lời thì giữ điểm, chưa thì tính theo phần chữ đã hiện.
  useEffect(() => {
    const id = window.setTimeout(
      () => {
        lamp.current.on = false;
        setActive(false);
        if (scoreRef.current === null) go("timeout");
        finish(scoreRef.current ?? 250 * (simRef.current?.revealed ?? 0));
      },
      Math.max(0, t0 + secs * 1000 - Date.now()),
    );
    return () => window.clearTimeout(id);
  }, [finish, go, secs, t0]);

  // Vòng lặp mỗi khung hình: tích nhiệt, hiện chữ, cháy xém, vẽ lại canvas, cập nhật quầng đèn.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastView = 0;
    let shown = { revealed: -1, burns: -1 };
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = simRef.current;
      const L = lamp.current;
      const warm = phaseRef.current === "heat" || phaseRef.current === "question";
      const heating = warm && L.on && !!s;
      let danger = 0;
      if (s && warm) {
        const { g, cols, rows, heat, reveal, burned } = s;
        const r2 = R * R;
        let hottest = -1;
        let hotV = 0;
        for (let r = 0; r < rows; r++) {
          const yy = (r + 0.5) * g - L.y;
          for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            if (burned[i]) continue;
            let f = 0;
            if (heating) {
              const xx = (c + 0.5) * g - L.x;
              const d2 = xx * xx + yy * yy;
              if (d2 < r2) f = 1 - d2 / r2;
            }
            const h0 = heat[i];
            if (f > 0 || h0 > 0) heat[i] = Math.max(0, h0 + (HEAT_RATE * f - COOL) * dt);
            if (heat[i] !== h0) {
              s.dirty = true;
              const rv = smooth(REV0, REV1, heat[i]);
              if (rv > reveal[i]) reveal[i] = rv;
              if (f > 0 && heat[i] > hotV) {
                hotV = heat[i];
                hottest = i;
              }
            }
          }
        }
        danger = Math.max(0, Math.min(1, (hotV / BURN - 0.55) / 0.45));
        if (hottest >= 0 && hotV >= BURN) {
          const bx = ((hottest % cols) + 0.5) * g;
          const by = (Math.floor(hottest / cols) + 0.5) * g;
          const t = performance.now();
          const fresh = t - s.lastBurn.at > 800 || Math.hypot(bx - s.lastBurn.x, by - s.lastBurn.y) > R * 0.7;
          if (fresh) {
            s.burns += 1;
            s.lastBurn = { at: t, x: bx, y: by };
            setBurnFlash(s.burns);
            sfx.wrong();
          } else s.lastBurn.at = t;
          const rb = R * 0.42;
          scorch(s, bx, by, rb);
          for (let r = 0; r < rows; r++)
            for (let c = 0; c < cols; c++) {
              const i = r * cols + c;
              if (Math.hypot((c + 0.5) * g - bx, (r + 0.5) * g - by) <= rb * 0.9) {
                burned[i] = 1;
                heat[i] = 0;
              }
            }
          s.dirty = true;
        }
        if (s.dirty) {
          let sum = 0;
          for (let i = 0; i < s.weight.length; i++) if (s.weight[i] && !burned[i]) sum += s.weight[i] * reveal[i];
          s.revealed = Math.min(1, sum / s.totalW);
        }
      }
      if (s && s.dirty) {
        s.dirty = false;
        drawSim(s, textCv.current, heatCv.current);
      }
      // Quầng đèn: vị trí, độ nóng, khói khi sắp cháy.
      const gl = glowRef.current;
      if (gl) {
        gl.style.transform = `translate3d(${L.x - R}px, ${L.y - R}px, 0)`;
        gl.style.opacity = heating ? "1" : "0";
      }
      if (hotRef.current) hotRef.current.style.opacity = String(heating ? danger : 0);
      if (smokeRef.current) smokeRef.current.style.opacity = String(heating ? Math.max(0, (danger - 0.45) / 0.55) : 0);
      if (s && (now - lastView > 90 || s.burns !== shown.burns)) {
        lastView = now;
        const rv = Math.round(s.revealed * 100) / 100;
        if (rv !== shown.revealed || s.burns !== shown.burns) {
          shown = { revealed: rv, burns: s.burns };
          setView(shown);
        }
        if (s.revealed >= DONE_AT && phaseRef.current === "heat") openQuestion();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [R, openQuestion]);

  const toLocal = (e: React.PointerEvent) => {
    const r = paperRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return { x: e.clientX - r.left, y: e.clientY - r.top - lamp.current.dy };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((phaseRef.current !== "heat" && phaseRef.current !== "question") || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    // Trên màn hình cảm ứng, quầng đèn nằm phía trên ngón tay để ngón tay không che chữ.
    lamp.current.dy = e.pointerType === "mouse" ? 0 : Math.round(R * 0.6);
    const p = toLocal(e);
    lamp.current = { ...lamp.current, on: true, x: p.x, y: p.y, id: e.pointerId };
    setActive(true);
    setTouched(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!lamp.current.on || e.pointerId !== lamp.current.id) return;
    const p = toLocal(e);
    lamp.current.x = p.x;
    lamp.current.y = p.y;
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== lamp.current.id) return;
    lamp.current.on = false;
    lamp.current.id = -1;
    setActive(false);
  };

  const answer = (i: number) => {
    if (phaseRef.current !== "question" || scoreRef.current !== null) return;
    const used = (Date.now() - t0) / 1000;
    if (used >= secs) return;
    const burns = simRef.current?.burns ?? 0;
    const ok = i === letter.answer;
    scoreRef.current = ok ? Math.max(350, Math.min(1000, Math.round(1000 - 350 * (used / secs) - 120 * burns))) : 100;
    setPicked(i);
    setPeek(false);
    lamp.current.on = false;
    setActive(false);
    go("done");
    sfx.stamp();
    timers.current.push(window.setTimeout(() => finish(scoreRef.current ?? 0), FINISH_DELAY));
  };

  const asking = phase === "question" || phase === "done";
  const ok = picked !== null && picked === letter.answer;
  const pct = Math.round(view.revealed * 100);

  return (
    <div
      ref={boxRef}
      className="relative h-full w-full select-none overflow-hidden bg-[#1a110a]"
      data-game="ink"
      data-phase={phase}
      data-revealed={view.revealed.toFixed(2)}
      data-burns={view.burns}
      {...qa({ "data-answer": asking ? letter.answer : undefined })}
      data-picked={picked ?? undefined}
      data-ready={text ? 1 : 0}
    >
      <Desk />
      {box.w > 0 && (
        <>
          {/* Vùng kéo đèn: tờ thư và một chút lề quanh nó. */}
          <div
            data-stage
            className={cn("absolute touch-none", phase === "heat" || phase === "question" ? (active ? "cursor-none" : "cursor-pointer") : "cursor-default")}
            style={{ left: paper.x - lay.p, top: paper.y - lay.p, width: paper.w + 2 * lay.p, height: paper.h + 2 * lay.p }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onLostPointerCapture={onPointerUp}
          />
          <div
            ref={paperRef}
            data-paper
            className="sheet pointer-events-none absolute overflow-hidden rounded-[2px]"
            style={{ left: paper.x, top: paper.y, width: paper.w, height: paper.h, boxShadow: "0 16px 26px -10px rgba(0,0,0,0.85), 0 3px 6px rgba(0,0,0,0.45)" }}
          >
            <PaperDecor />
            {text && (
              <div aria-hidden className="absolute inset-0">
                {text.cover.map((l, i) => (
                  <div
                    key={i}
                    className="absolute whitespace-pre font-text italic"
                    style={{ left: text.padX, top: l.y, fontSize: text.f, lineHeight: `${text.f * 1.36}px`, color: "#28304d", textShadow: "0 0 0.6px rgba(40,48,77,0.5)" }}
                  >
                    {l.text}
                  </div>
                ))}
              </div>
            )}
            <canvas ref={textCv} aria-hidden className="absolute inset-0 h-full w-full" />
            <canvas ref={heatCv} aria-hidden className="absolute inset-0 h-full w-full" />
            {/* quầng đèn dầu */}
            <div ref={glowRef} aria-hidden className="absolute left-0 top-0 opacity-0 transition-opacity duration-150" style={{ width: 2 * R, height: 2 * R, willChange: "transform" }}>
              <div
                className="absolute inset-0 rounded-full"
                style={{ mixBlendMode: "screen", background: "radial-gradient(circle, rgba(255,226,160,0.62) 0%, rgba(255,186,96,0.34) 38%, rgba(255,150,60,0.12) 62%, rgba(255,140,40,0) 72%)" }}
              />
              <div
                ref={hotRef}
                className="absolute inset-0 rounded-full opacity-0"
                style={{ mixBlendMode: "multiply", background: "radial-gradient(circle, rgba(200,70,20,0.55) 0%, rgba(190,80,30,0.3) 30%, rgba(180,80,30,0) 60%)" }}
              />
              <FlameMark />
              <div ref={smokeRef} className="absolute left-1/2 top-[18%] h-[40%] w-[30%] -translate-x-1/2 opacity-0">
                <Smoke />
              </div>
            </div>
            {!touched && phase === "heat" && text && <StartHint />}
            {burnFlash > 0 && <BurnToast key={burnFlash} n={burnFlash} />}
          </div>
          <span aria-hidden className="tape pointer-events-none absolute h-[16px] w-[54px] -rotate-6" style={{ left: paper.x + paper.w * 0.1, top: paper.y - 7 }} />
          <span aria-hidden className="tape pointer-events-none absolute h-[16px] w-[50px] rotate-[5deg]" style={{ left: paper.x + paper.w * 0.72, top: paper.y - 6 }} />

          <AnimatePresence>
            {phase === "done" && (
              <motion.div
                key="st"
                className="pointer-events-none absolute z-30 flex justify-center"
                style={{ left: paper.x, width: paper.w, top: lay.mode === "side" ? paper.y + paper.h * 0.42 : paper.y + Math.min(paper.h * 0.18, 60) }}
                exit={{ opacity: 0 }}
              >
                <div style={{ fontSize: Math.max(22, Math.min(46, paper.w * 0.11)) }}>
                  <Stamp ink={ok ? "green" : "red"} rotate={-8} delay={0.05} className="whitespace-nowrap border-[4px] bg-[#efe3c6]/85 mix-blend-normal shadow-[0_6px_14px_rgba(0,0,0,0.35)]">
                    {ok ? "Đã đọc" : "Nhầm"}
                  </Stamp>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {lay.mode === "side" ? (
            <SidePanel rect={lay.panel}>
              {asking ? (
                <Question q={letter.question} opts={letter.opts} answer={letter.answer} picked={picked} onPick={answer} f={Math.max(11.5, Math.min(14, lay.panel.w / 15.5))} />
              ) : (
                <HeatStatus pct={pct} burns={view.burns} onDone={openQuestion} disabled={phase !== "heat"} wide />
              )}
            </SidePanel>
          ) : (
            <>
              <div className="absolute flex items-center gap-2" style={{ left: lay.panel.x, top: lay.panel.y, width: lay.panel.w, height: lay.panel.h }}>
                <HeatStatus pct={pct} burns={view.burns} onDone={openQuestion} disabled={phase !== "heat"} />
              </div>
              <AnimatePresence>
                {asking && (
                  <motion.div
                    key="q"
                    className="absolute inset-x-0 bottom-0 flex justify-center"
                    style={{ padding: lay.p }}
                    initial={{ y: "105%" }}
                    animate={{ y: peek ? "calc(100% - 46px)" : 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  >
                    <div className="sheet relative w-full max-w-[420px] rounded-[3px] px-3 pb-3 pt-2.5 shadow-[0_-10px_30px_rgba(0,0,0,0.55)]">
                      <button
                        type="button"
                        aria-pressed={peek}
                        className="absolute right-1.5 top-1 flex h-10 items-center gap-1 rounded-[3px] bg-[#1b140e] px-2.5 font-head text-[12px] font-semibold uppercase tracking-wide text-cream shadow-[0_2px_0_#000] active:translate-y-[1px] disabled:opacity-40"
                        onClick={() => setPeek((v) => !v)}
                        disabled={phase === "done"}
                      >
                        {peek ? <ScrollText className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                        {peek ? "Câu hỏi" : "Xem thư"}
                      </button>
                      <Question q={letter.question} opts={letter.opts} answer={letter.answer} picked={picked} onPick={answer} f={Math.max(11.5, Math.min(13.5, lay.panel.w / 26))} compact />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </>
      )}
    </div>
  );
}

function drawSim(s: Sim, textC: HTMLCanvasElement | null, heatC: HTMLCanvasElement | null) {
  const { cols, rows, reveal, burned, heat, maskImg, tintImg } = s;
  const md = maskImg.data;
  const td = tintImg.data;
  for (let i = 0; i < cols * rows; i++) {
    const o = i * 4;
    md[o] = md[o + 1] = md[o + 2] = 0;
    md[o + 3] = burned[i] ? 0 : Math.round(reveal[i] * 255);
    // giấy ngả vàng chỗ đã hơ, sẫm dần khi sắp cháy
    const pre = Math.max(0, Math.min(1, (heat[i] - 0.55) / 0.65));
    td[o] = Math.round(150 - 60 * pre);
    td[o + 1] = Math.round(96 - 50 * pre);
    td[o + 2] = Math.round(34 - 20 * pre);
    td[o + 3] = burned[i] ? 0 : Math.round((0.08 * reveal[i] + 0.5 * pre) * 255);
  }
  s.mask.getContext("2d")!.putImageData(maskImg, 0, 0);
  s.tint.getContext("2d")!.putImageData(tintImg, 0, 0);
  const W = cols * s.g * s.dpr;
  const H = rows * s.g * s.dpr;
  if (textC) {
    const c = textC.getContext("2d")!;
    c.globalCompositeOperation = "source-over";
    c.clearRect(0, 0, textC.width, textC.height);
    c.imageSmoothingEnabled = true;
    c.drawImage(s.mask, 0, 0, W, H);
    c.globalCompositeOperation = "source-in";
    c.drawImage(s.ink, 0, 0);
    c.globalCompositeOperation = "source-over";
  }
  if (heatC) {
    const c = heatC.getContext("2d")!;
    c.clearRect(0, 0, heatC.width, heatC.height);
    c.imageSmoothingEnabled = true;
    c.drawImage(s.tint, 0, 0, W, H);
    c.drawImage(s.burn, 0, 0);
  }
}

/* ───────────── Trang trí ───────────── */

const Desk = memo(function Desk() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <WoodSurface seed={14} plank={80} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 80% at 40% 45%, rgba(255,198,130,0.16), transparent 70%)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 120% 115% at 45% 45%, transparent 45%, rgba(0,0,0,0.62) 100%)" }} />
    </div>
  );
});

/** Giấy viết thư: vân giấy, nếp gấp làm ba, ố vàng ở mép. */
const PaperDecor = memo(function PaperDecor() {
  return (
    <div aria-hidden className="absolute inset-0">
      <div className="absolute inset-0 opacity-35 mix-blend-multiply" style={{ backgroundImage: GRAIN }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 100% at 30% 20%, rgba(255,248,226,0.28), transparent 60%)" }} />
      <div className="absolute inset-x-0 top-1/3 h-px bg-[rgba(90,60,30,0.16)] shadow-[0_1px_0_rgba(255,250,235,0.35)]" />
      <div className="absolute inset-x-0 top-2/3 h-px bg-[rgba(90,60,30,0.16)] shadow-[0_1px_0_rgba(255,250,235,0.35)]" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-[rgba(90,60,30,0.08)]" />
    </div>
  );
});

function FlameMark() {
  return (
    <svg viewBox="0 0 20 30" className="absolute left-1/2 top-1/2 h-[22%] w-[16%] -translate-x-1/2 -translate-y-1/2 opacity-80" aria-hidden>
      <path d="M10,1 C14,8 18,13 18,19 C18,25 14,29 10,29 C6,29 2,25 2,19 C2,13 6,8 10,1 Z" fill="rgba(255,190,90,0.55)" />
      <path d="M10,10 C12,14 14,17 14,20.5 C14,24 12,26 10,26 C8,26 6,24 6,20.5 C6,17 8,14 10,10 Z" fill="rgba(255,244,214,0.85)" />
    </svg>
  );
}

function Smoke() {
  return (
    <svg viewBox="0 0 30 60" className="h-full w-full overflow-visible" aria-hidden>
      {[0, 1, 2].map((i) => (
        <path key={i} d="M15,58 C8,46 22,38 14,26 C8,17 20,10 15,0" fill="none" stroke="rgba(70,60,52,0.55)" strokeWidth="3.4" strokeLinecap="round" style={{ animation: `mn-smoke 1.1s ${i * 0.36}s linear infinite` }} />
      ))}
      <style>{"@keyframes mn-smoke{0%{transform:translateY(10px) scaleX(0.8);opacity:0}30%{opacity:0.9}100%{transform:translateY(-14px) scaleX(1.3);opacity:0}}"}</style>
    </svg>
  );
}

function StartHint() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-x-0 bottom-[6%] flex justify-center"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.4 }}
    >
      <span className="flex items-center gap-1.5 rounded-[2px] bg-[#1b120b]/85 px-2.5 py-1 font-type text-[12px] font-bold text-cream shadow-[0_4px_10px_rgba(0,0,0,0.45)]">
        <Flame className="h-3.5 w-3.5 text-[#ffb35c]" aria-hidden />
        Giữ và kéo đèn qua lá thư
      </span>
    </motion.div>
  );
}

function BurnToast({ n }: { n: number }) {
  return (
    <motion.div
      className="pointer-events-none absolute inset-x-0 top-[5%] flex justify-center"
      initial={{ opacity: 0, scale: 1.3 }}
      animate={{ opacity: [0, 1, 1, 0], scale: 1 }}
      transition={{ duration: 1.4, times: [0, 0.1, 0.75, 1] }}
    >
      <span className="stamp bg-[#efe3c6]/80 text-[18px] text-stamp mix-blend-normal">Cháy xém! ({n})</span>
    </motion.div>
  );
}

function SidePanel({ rect, children }: { rect: Rect; children: React.ReactNode }) {
  return (
    <div className="absolute flex flex-col justify-center" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}>
      {children}
    </div>
  );
}

/** Đồng hồ chữ hiện ra, số chỗ cháy, nút Đọc xong. */
function HeatStatus({ pct, burns, onDone, disabled, wide = false }: { pct: number; burns: number; onDone: () => void; disabled: boolean; wide?: boolean }) {
  const btn = (
    <button
      type="button"
      onClick={onDone}
      disabled={disabled}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[4px] bg-party font-head font-semibold uppercase tracking-[0.07em] text-cream shadow-[0_3px_0_#7d140e,0_10px_22px_-10px_rgba(0,0,0,0.8)] transition-[transform,box-shadow] duration-100 hover:bg-[#e0321f] active:translate-y-[2px] active:shadow-[0_1px_0_#7d140e] disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
        wide ? "h-11 w-full px-4 text-[15px]" : "h-10 px-3 text-[13px]",
      )}
    >
      <ScrollText className="h-[17px] w-[17px]" aria-hidden />
      Đọc xong
    </button>
  );
  if (!wide)
    return (
      <>
        <div className="sheet flex h-full min-w-0 flex-1 items-center gap-2 rounded-[2px] px-2.5">
          <span className="font-head text-[11px] font-semibold uppercase leading-none tracking-wide text-ink-2">Chữ</span>
          <Meter pct={pct} />
          <span className="w-[2.6em] text-right font-head text-[15px] font-bold tabular-nums text-ink">{pct}%</span>
          <span className={cn("flex items-center gap-0.5 font-head text-[14px] font-bold tabular-nums", burns ? "text-stamp" : "text-ink-3")} title="Số chỗ cháy xém">
            <Flame className="h-3.5 w-3.5" aria-hidden />
            {burns}
          </span>
        </div>
        {btn}
      </>
    );
  return (
    <div className="flex flex-col gap-3">
      <div className="sheet rounded-[2px] px-3.5 pb-3 pt-2.5" style={{ rotate: "1deg" }}>
        <div className="label text-stamp">Lá thư nhà</div>
        <div className="mt-1.5 flex items-baseline justify-between font-head text-ink">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">Chữ đã hiện</span>
          <span className="text-[26px] font-bold leading-none tabular-nums">{pct}%</span>
        </div>
        <div className="mt-1.5">
          <Meter pct={pct} />
        </div>
        <div className={cn("mt-2 flex items-center gap-1.5 font-type text-[13px] font-bold", burns ? "text-stamp" : "text-ink-2")}>
          <Flame className="h-4 w-4" aria-hidden />
          Cháy xém: {burns} chỗ
        </div>
      </div>
      <Lamp />
      {btn}
    </div>
  );
}

function Meter({ pct }: { pct: number }) {
  return (
    <div className="relative h-[8px] min-w-[40px] flex-1 overflow-hidden rounded-full bg-[rgba(70,48,24,0.2)]">
      <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-150" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #a5642a, #6a3410)" }} />
      <div className="absolute inset-y-0 w-[2px] bg-[rgba(30,20,10,0.55)]" style={{ left: `${DONE_AT * 100}%` }} />
    </div>
  );
}

/** Đèn dầu trên bàn (minh họa). */
const Lamp = memo(function Lamp() {
  return (
    <svg viewBox="0 0 80 110" className="mx-auto h-[70px] w-[52px]" aria-hidden>
      <ellipse cx="40" cy="104" rx="28" ry="5" fill="rgba(0,0,0,0.45)" />
      <path d="M18,100 L62,100 L56,78 L24,78 Z" fill="#7a5a2a" stroke="#2d1f0c" strokeWidth="2" />
      <rect x="28" y="70" width="24" height="9" rx="2" fill="#a07a3a" stroke="#2d1f0c" strokeWidth="2" />
      <path d="M30,70 C22,58 24,40 32,30 L48,30 C56,40 58,58 50,70 Z" fill="rgba(255,236,200,0.22)" stroke="rgba(255,240,210,0.6)" strokeWidth="1.6" />
      <path d="M40,40 C44,48 46,53 46,58 C46,63 43,66 40,66 C37,66 34,63 34,58 C34,53 36,48 40,40 Z" fill="#ffb347">
        <animate attributeName="d" values="M40,40 C44,48 46,53 46,58 C46,63 43,66 40,66 C37,66 34,63 34,58 C34,53 36,48 40,40 Z;M40,37 C45,47 46,53 46,58 C46,63 43,66 40,66 C37,66 34,63 34,58 C34,52 37,46 40,37 Z;M40,40 C44,48 46,53 46,58 C46,63 43,66 40,66 C37,66 34,63 34,58 C34,53 36,48 40,40 Z" dur="0.9s" repeatCount="indefinite" />
      </path>
      <path d="M40,50 C42,54 43,57 43,59.5 C43,62 41.5,63.5 40,63.5 C38.5,63.5 37,62 37,59.5 C37,57 38,54 40,50 Z" fill="#fff4d6" />
      <rect x="31" y="24" width="18" height="6" rx="1.5" fill="#5c4420" stroke="#2d1f0c" strokeWidth="1.5" />
    </svg>
  );
});

/** Câu hỏi sau khi đọc thư: ba phương án, tô màu khi đã chọn. */
function Question({
  q,
  opts,
  answer,
  picked,
  onPick,
  f,
  compact = false,
}: {
  q: string;
  opts: string[];
  answer: number;
  picked: number | null;
  onPick: (i: number) => void;
  f: number;
  compact?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col" style={{ fontSize: f, gap: compact ? 6 : 8 }}>
      <div className={cn("font-text font-semibold leading-snug text-ink", compact ? "min-h-[40px] pr-[7.5em]" : "sheet rounded-[2px] px-3 py-2")} style={{ fontSize: "1.05em" }}>
        {q}
      </div>
      {opts.map((o, i) => {
        const chosen = picked === i;
        const right = picked !== null && i === answer;
        return (
          <button
            key={o}
            type="button"
            data-option={i}
            disabled={picked !== null}
            onClick={() => onPick(i)}
            className={cn(
              "flex min-h-[42px] w-full items-center gap-2 rounded-[3px] px-3 py-1.5 text-left font-type font-bold leading-tight shadow-[0_2px_0_rgba(0,0,0,0.55)] ring-1 transition-[transform,background-color] duration-100 active:translate-y-[1px] disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
              right ? "bg-olive text-cream ring-olive" : chosen ? "bg-stamp text-cream ring-stamp" : picked !== null ? "bg-[#e6d8b8] text-ink-3 ring-ink/20" : "bg-[#efe3c6] text-ink ring-ink/30 hover:bg-[#f6ecd4]",
            )}
          >
            <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 font-head text-[0.85em]", right || chosen ? "border-cream/80" : "border-ink/40")}>
              {right ? <Check className="h-3.5 w-3.5" aria-hidden /> : chosen ? <X className="h-3.5 w-3.5" aria-hidden /> : String.fromCharCode(65 + i)}
            </span>
            <span className="min-w-0">{o}</span>
          </button>
        );
      })}
    </motion.div>
  );
}
