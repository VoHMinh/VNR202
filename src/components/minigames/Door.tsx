"use client";

import { AnimatePresence, motion } from "motion/react";
import { DoorClosed, DoorOpen, Lock } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DELEGATES } from "@/game/data/minis";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/sfx";
import { DOOR, DoorScene, HalfIcon, PaperDoc, SealIcon, Silhouette, SlipPair } from "./door-art";
import { EndOverlay, HallBar, HallPanel, type DoorEnd, type LogItem } from "./door-hall";
import { MS, VISITORS, WAVE_START, judge, makePlan, type Flaw, type Plan, type Visitor, type Wave } from "./door-plan";
import { WoodSurface, isTypingTarget, useBox, useFinishOnce } from "./shared";
import type { MiniProps } from "./types";

/*
 * "Gác cửa hội trường" (nhiệm vụ 20, cuối tháng 3/1935): người chơi gác cửa nơi họp Đại hội I ở phố Quan Công, Ma Cao.
 * Lần lượt 21 người gõ cửa. Người chơi so câu đáp ám hiệu với thẻ; từ khách thứ 7 xem thêm dấu trên giấy giới thiệu,
 * từ khách thứ 14 so thêm nửa mảnh giấy xé đôi; rồi bấm Mời vào hoặc Mời ra (phím ← →).
 * Nguyên tắc lịch sử: đủ 13 đại biểu luôn dự Đại hội. Mời nhầm đại biểu ra thì đồng chí phụ trách xác minh lại và mời vào;
 * hết giờ thì đồng chí phụ trách đón nốt những người còn lại. Người chơi chỉ được hoặc mất điểm.
 * Điểm: mỗi khách xử lý đúng được tới 1000/21 điểm, chậm thì bớt dần (tối đa bớt 20%); để lọt người không hợp lệ bị trừ gấp rưỡi.
 */

type Stage = "wave" | "approach" | "ready" | "leave" | "mistake" | "escort" | "end";

interface Last {
  n: number;
  admit: boolean;
  correct: boolean;
  points: number;
  delegate: boolean;
  flaw: Flaw | null;
  reason: string;
  key: number;
}

interface G {
  /** Khách đang ở cửa (chỉ số trong lịch). */
  i: number;
  stage: Stage;
  /** Tăng mỗi lần đổi cảnh, để hẹn giờ chuyển cảnh không chạy nhầm. */
  key: number;
  wave: Wave;
  readyAt: number;
  admit: boolean;
  last: Last | null;
  seats: string;
  seated: number;
  rightIn: number;
  rightOut: number;
  wrongIn: number;
  wrongOut: number;
  score: number;
  log: LogItem[];
  final: number;
  timeUp: boolean;
}

const START: G = {
  i: 0,
  stage: "wave",
  key: 0,
  wave: 1,
  readyAt: 0,
  admit: false,
  last: null,
  seats: ".".repeat(DELEGATES),
  seated: 0,
  rightIn: 0,
  rightOut: 0,
  wrongIn: 0,
  wrongOut: 0,
  score: 0,
  log: [],
  final: 0,
  timeUp: false,
};

const WAVE_TEXT: Record<Wave, { head: string; title: string; body: string }> = {
  1: { head: "Có người gõ cửa", title: "Kiểm tra ám hiệu", body: "So câu khách đáp với thẻ ám hiệu: khác một chữ cũng phải mời ra." },
  2: { head: "Quy định mới", title: "Xem giấy giới thiệu", body: "Từ khách này, giấy giới thiệu phải có dấu đỏ, hình vuông." },
  3: { head: "Quy định mới", title: "So nửa mảnh giấy", body: "Từ khách này, mép xé phải khớp với nửa của bạn, nét kẻ liền mạch." },
};

const clampScore = (s: number) => Math.round(Math.min(1000, Math.max(0, s)));

/** Xếp một đại biểu vào ghế trống tiếp theo: "a" người chơi mời vào, "e" đồng chí phụ trách mời vào. */
function seat(g: G, mark: "a" | "e") {
  return { seats: g.seats.slice(0, g.seated) + mark + g.seats.slice(g.seated + 1), seated: g.seated + 1 };
}

/** Kết thúc: còn đại biểu chưa vào (hết giờ) thì đồng chí phụ trách đón nốt, rồi cửa khép, Đại hội khai mạc. */
function toEnd(g: G): G {
  return { ...g, stage: g.seated < DELEGATES ? "escort" : "end", key: g.key + 1, final: clampScore(g.score) };
}

function advance(g: G, plan: Plan): G {
  const i = g.i + 1;
  if (i >= plan.visitors.length) return toEnd(g);
  const wave = plan.visitors[i].wave;
  return { ...g, i, wave, stage: wave !== g.wave ? "wave" : "approach", key: g.key + 1 };
}

function tick(g: G, plan: Plan, now: number): G {
  switch (g.stage) {
    case "wave":
      return { ...g, stage: "approach", key: g.key + 1 };
    case "approach":
      return { ...g, stage: "ready", key: g.key + 1, readyAt: now };
    case "leave":
      return g.last && !g.last.correct ? { ...g, stage: "mistake", key: g.key + 1 } : advance(g, plan);
    case "mistake":
      return advance(g, plan);
    case "escort": {
      const s = { ...g, ...seat(g, "e"), key: g.key + 1 };
      return s.seated >= DELEGATES ? { ...s, stage: "end" } : s;
    }
    default:
      return g;
  }
}

function delayOf(stage: Stage, i: number): number | null {
  if (stage === "wave") return i === 0 ? MS.firstWave : MS.wave;
  if (stage === "approach") return MS.approach;
  if (stage === "leave") return MS.leave;
  if (stage === "mistake") return MS.mistake;
  if (stage === "escort") return MS.seat;
  return null;
}

function decideState(g: G, plan: Plan, admit: boolean, now: number): G {
  const v = plan.visitors[g.i];
  const { correct, points } = judge(v, admit, (now - g.readyAt) / 1000);
  const pts = Math.round(points);
  const text = correct
    ? admit
      ? `Khách ${v.n}: đại biểu, mời vào (+${pts})`
      : `Khách ${v.n}: ${v.reason.toLowerCase()}, mời ra (+${pts})`
    : admit
      ? `Khách ${v.n}: để lọt người không hợp lệ (−${Math.abs(pts)})`
      : `Khách ${v.n}: mời nhầm đại biểu ra (0)`;
  return {
    ...g,
    ...(v.delegate ? seat(g, admit ? "a" : "e") : {}),
    stage: "leave",
    key: g.key + 1,
    admit,
    score: g.score + points,
    rightIn: g.rightIn + (correct && admit ? 1 : 0),
    rightOut: g.rightOut + (correct && !admit ? 1 : 0),
    wrongIn: g.wrongIn + (!correct && admit ? 1 : 0),
    wrongOut: g.wrongOut + (!correct && !admit ? 1 : 0),
    last: { n: v.n, admit, correct, points: pts, delegate: v.delegate, flaw: v.flaw, reason: v.reason, key: g.key + 1 },
    log: [{ id: g.key + 1, text, tone: correct ? (admit ? ("good" as const) : ("info" as const)) : admit ? ("bad" as const) : ("warn" as const) }, ...g.log].slice(0, 6),
  };
}

export function Door({ seconds, startedAt, onFinish }: MiniProps) {
  const finish = useFinishOnce(onFinish);
  const [boxRef, box] = useBox<HTMLDivElement>();
  // Đọc mốc thời gian và thời lượng một lần lúc mở trò chơi; lịch khách lấy hạt giống từ mốc bắt đầu.
  const [cfg] = useState(() => ({ seconds, startedAt, plan: makePlan(startedAt) }));
  const { plan } = cfg;
  const [g, setG] = useState<G>(START);

  // Nhịp chuyển cảnh: mỗi cảnh hẹn giờ sang cảnh sau (bỏ qua nếu cảnh đã đổi vì người chơi bấm hoặc hết giờ).
  const key = g.key;
  const delay = delayOf(g.stage, g.i);
  useEffect(() => {
    if (delay === null) return;
    const id = window.setTimeout(() => {
      const now = Date.now();
      setG((s) => (s.key === key ? tick(s, plan, now) : s));
    }, delay);
    return () => window.clearTimeout(id);
  }, [key, delay, plan]);

  // Hết giờ: dừng nhận khách, đồng chí phụ trách đón nốt các đại biểu còn ở ngoài.
  useEffect(() => {
    const left = cfg.startedAt + cfg.seconds * 1000 - Date.now();
    const id = window.setTimeout(() => setG((s) => (s.stage === "escort" || s.stage === "end" ? s : toEnd({ ...s, timeUp: true }))), Math.max(0, left));
    return () => window.clearTimeout(id);
  }, [cfg]);

  const stage = g.stage;
  useEffect(() => {
    if (stage === "approach") sfx.knock();
    else if (stage === "wave" && key > 0) sfx.stamp();
  }, [stage, key]);

  const last = g.last;
  useEffect(() => {
    if (!last) return;
    if (!last.correct) sfx.wrong();
    else if (last.admit) sfx.stamp();
    else sfx.tick();
  }, [last]);

  // Cửa khép, Đại hội khai mạc: gửi điểm sau khi màn kết chạy xong (gỡ sớm thì gửi ngay).
  const ended = stage === "end";
  const final = g.final;
  useEffect(() => {
    if (!ended) return;
    let sent = false;
    sfx.door();
    const a = window.setTimeout(() => sfx.stamp(), 1080);
    const b = window.setTimeout(() => sfx.correct(), 1400);
    const c = window.setTimeout(() => {
      sent = true;
      finish(final);
    }, MS.end);
    return () => {
      [a, b, c].forEach((id) => window.clearTimeout(id));
      if (!sent) finish(final);
    };
  }, [ended, final, finish]);

  const decide = useCallback(
    (admit: boolean) => {
      const now = Date.now();
      setG((s) => (s.stage === "ready" ? decideState(s, plan, admit, now) : s));
    },
    [plan],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || isTypingTarget(e.target)) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        decide(false);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        decide(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide]);

  /* ───────── bố cục ───────── */

  const ready = box.w > 0 && box.h > 0;
  const desktop = box.w >= 640 && box.w >= box.h * 1.2;
  const compact = box.h < 400;
  const v = plan.visitors[Math.min(g.i, plan.visitors.length - 1)];
  const present = stage === "approach" || stage === "ready";
  const showDocs = present || stage === "leave" || stage === "mistake";
  const flag = stage === "mistake" && last && !last.delegate ? last.flaw : null;
  const pause = stage === "wave" || stage === "mistake" || stage === "escort" || stage === "end";
  const end: DoorEnd | null = ended ? { score: final, rightIn: g.rightIn, rightOut: g.rightOut, outTotal: VISITORS - DELEGATES } : null;

  const scene = <Scene g={g} v={v} plan={plan} present={present} desktop={desktop} />;
  const docs = <Docs v={v} show={showDocs} wave={g.wave} plan={plan} flag={flag} desktop={desktop} />;
  const buttons = <Buttons decide={decide} dim={pause} desktop={desktop} compact={compact} />;

  return (
    <div
      ref={boxRef}
      className="absolute inset-0 select-none overflow-hidden"
      style={{ background: "radial-gradient(120% 100% at 30% 40%, #2a1d12 0%, #160f09 70%, #0d0905 100%)" }}
      data-game="door"
      data-stage={stage}
      data-i={g.i}
      data-n={v.n}
      data-wave={g.wave}
      data-valid={present ? (v.delegate ? 1 : 0) : ""}
      data-flaw={present ? (v.flaw ?? "") : ""}
      data-seated={g.seated}
      data-right={g.rightIn + g.rightOut}
      data-wrong={g.wrongIn + g.wrongOut}
      data-score={ended ? final : Math.round(g.score)}
      data-done={ended ? 1 : 0}
      data-started={cfg.startedAt}
      data-seconds={cfg.seconds}
    >
      {ready &&
        (desktop ? (
          <div className="absolute inset-0 flex gap-2 p-2">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {scene}
              <div className="shrink-0" style={{ height: Math.round(Math.min(165, Math.max(110, box.h * 0.27))) }}>
                {docs}
              </div>
              {buttons}
            </div>
            <div className="flex w-[37%] max-w-[420px] shrink-0 flex-col gap-2">
              <RuleCard plan={plan} wave={g.wave} fresh={stage === "wave" ? g.wave : 0} compact={box.h < 520} />
              <div className="min-h-0 flex-1">
                <HallPanel
                  seats={g.seats}
                  seated={g.seated}
                  score={g.score}
                  rightIn={g.rightIn}
                  rightOut={g.rightOut}
                  wrong={g.wrongIn + g.wrongOut}
                  log={g.log}
                  glow={ended}
                  compact={box.h < 520}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col gap-1.5 p-1.5">
            <div className={cn("shrink-0", compact ? "h-[30px]" : "h-[34px]")}>
              <HallBar seats={g.seats} seated={g.seated} score={g.score} />
            </div>
            <RuleStrip plan={plan} wave={g.wave} fresh={stage === "wave" ? g.wave : 0} />
            {scene}
            <div className={cn("shrink-0", compact ? "h-[66px]" : "h-[100px]")}>{docs}</div>
            {buttons}
          </div>
        ))}
      <AnimatePresence>{end && <EndOverlay end={end} compact={!desktop} />}</AnimatePresence>
    </div>
  );
}

/* ───────────────────────── Cảnh cửa và khách ───────────────────────── */

const VISITOR = {
  enter: { opacity: 0, x: -38 },
  idle: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
  exit: (admit: boolean) => (admit ? { opacity: 0, scale: 1.28, y: 14, transition: { duration: 0.42 } } : { opacity: 0, x: 64, transition: { duration: 0.42 } }),
};

function Scene({ g, v, plan, present, desktop }: { g: G; v: Visitor; plan: Plan; present: boolean; desktop: boolean }) {
  const [ref, sb] = useBox<HTMLDivElement>();
  const W = sb.h > 0 ? Math.max(320, (240 * sb.w) / sb.h) : 400;
  const k = sb.h / 240;
  const cx = W * (desktop ? 0.34 : 0.25);
  const bubbleLeft = (cx + DOOR.half + 14) * k;
  const small = sb.h < 130;
  const queue = VISITORS - g.i - (present || g.stage === "leave" || g.stage === "mistake" ? 1 : 0);
  const last = g.last;
  return (
    <div ref={ref} className="relative min-h-0 flex-1 overflow-hidden rounded-[2px] shadow-[0_0_0_2px_#2b1d10,0_10px_28px_-6px_rgba(0,0,0,0.9)]">
      {sb.h > 0 && (
        <DoorScene W={W} cx={cx} closed={g.stage === "end"}>
          <AnimatePresence custom={g.admit}>
            {present && (
              <motion.g key={v.n} custom={g.admit} variants={VISITOR} initial="enter" animate="idle" exit="exit" style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}>
                <g transform={`translate(${(cx - 46).toFixed(1)} ${DOOR.sill - 166}) scale(0.92)`}>
                  <Silhouette look={v.look} />
                </g>
              </motion.g>
            )}
          </AnimatePresence>
        </DoorScene>
      )}

      {/* lời khách nói ở cửa */}
      <AnimatePresence>
        {present && sb.w > 0 && (
          <motion.div
            key={v.n}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0, transition: { delay: 0.22, duration: 0.25 } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="absolute rounded-[3px] bg-[#f3e9d2] px-2.5 py-1.5 text-ink shadow-[0_6px_18px_rgba(0,0,0,0.55)]"
            style={{ left: bubbleLeft, top: small ? "7%" : "13%", maxWidth: Math.max(140, sb.w - bubbleLeft - 8) }}
          >
            <span className="label block text-[9.5px] leading-none text-ink-3">Khách thứ {v.n}</span>
            <p className={cn("mt-0.5 font-text font-semibold leading-snug", small ? "text-[12.5px]" : desktop ? "text-[16.5px]" : "text-[13.5px]")}>«{v.line}»</p>
            <span aria-hidden className="absolute -left-[7px] top-3 h-0 w-0 border-y-[7px] border-r-[8px] border-y-transparent border-r-[#f3e9d2]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* số người còn chờ ngoài cửa */}
      {g.stage !== "end" && g.stage !== "escort" && (
        <span className="absolute right-1.5 top-1.5 rounded-[2px] bg-black/55 px-1.5 py-0.5 font-text text-[11px] text-cream/90 sm:text-[12px]">
          {desktop ? "Ngoài cửa còn" : "Còn"} {queue} người
        </span>
      )}

      {/* kết quả lần quyết vừa rồi */}
      {last?.correct && (
        <motion.span
          key={last.key}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: [0, 1, 1, 0], y: [6, 0, 0, -4] }}
          transition={{ duration: 1.6, times: [0, 0.1, 0.75, 1] }}
          className={cn(
            "pointer-events-none absolute bottom-2 right-1.5 max-w-[62%] truncate rounded-[2px] px-1.5 py-0.5 font-text text-[11.5px] font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.5)] sm:text-[13px]",
            last.admit ? "bg-olive text-cream" : "bg-[#efe3c4] text-ink",
          )}
        >
          +{last.points} · {last.admit ? "Đại biểu, mời vào" : last.reason}
        </motion.span>
      )}

      {/* đợt mới, quy định mới */}
      <AnimatePresence>
        {g.stage === "wave" && (
          <motion.div key={`w${g.wave}`} className="absolute inset-0 grid place-items-center bg-black/40 px-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.85, y: 10 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 320, damping: 22 }} className="sheet max-w-[440px] rounded-[2px] px-4 py-2 text-center">
              <div className="label text-stamp">{WAVE_TEXT[g.wave].head}</div>
              <div className={cn("flex items-center justify-center gap-2 font-head font-bold uppercase leading-tight text-ink", small ? "text-[16px]" : "text-[20px] sm:text-[23px]")}>
                {g.wave === 2 && <SealIcon className="h-6 w-6" />}
                {g.wave === 3 && <HalfIcon edge={plan.edge} className="h-7 w-8" />}
                {WAVE_TEXT[g.wave].title}
              </div>
              <p className={cn("font-text leading-snug text-ink", small ? "text-[12px]" : "text-[13.5px] sm:text-[15px]")}>{WAVE_TEXT[g.wave].body}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* sai sót: giải thích, đồng chí phụ trách xử lý lại */}
      <AnimatePresence>
        {g.stage === "mistake" && last && (
          <motion.div key={`m${last.key}`} className="absolute inset-0 grid place-items-center bg-[#2a0b07]/55 px-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ x: -10 }} animate={{ x: [-10, 8, -5, 3, 0] }} transition={{ duration: 0.4 }} className="sheet max-w-[460px] rounded-[2px] border-l-4 border-stamp px-3.5 py-2">
              <div className={cn("font-head font-bold uppercase leading-tight text-stamp", small ? "text-[15px]" : "text-[18px] sm:text-[21px]")}>
                {last.delegate ? "Mời nhầm đại biểu ra" : "Để lọt người không hợp lệ"}
              </div>
              <p className={cn("font-text leading-snug text-ink", small ? "text-[12px]" : "text-[13.5px] sm:text-[15px]")}>
                {last.delegate ? "Ám hiệu, giấy tờ của khách đều đúng. Đồng chí phụ trách đã xác minh lại và mời đại biểu vào." : `${last.reason}. Đồng chí phụ trách đã mời khách ra.`}
              </p>
              {last.flaw === "answer" && (
                <p className={cn("font-text leading-snug text-ink-2", small ? "text-[11.5px]" : "text-[13px] sm:text-[14px]")}>
                  Câu đúng: <b className="text-ink">«{plan.answer}»</b>
                </p>
              )}
              <div className="mt-0.5 font-head text-[13px] font-bold uppercase tracking-wider text-ink-2">{last.points < 0 ? `−${Math.abs(last.points)} điểm` : "Không được điểm"}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* hết giờ: đồng chí phụ trách đón nốt các đại biểu */}
      <AnimatePresence>
        {g.stage === "escort" && (
          <motion.div key="escort" className="absolute inset-x-0 top-[14%] flex justify-center px-2" initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
            <span className="rounded-[2px] bg-[#1f1a14]/90 px-2.5 py-1 text-center font-head text-[12.5px] font-bold uppercase tracking-[0.1em] text-[#ffd77a] shadow-[0_4px_12px_rgba(0,0,0,0.6)] sm:text-[14px]">
              Hết giờ · Đồng chí phụ trách đón các đại biểu còn lại
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────── Giấy tờ khách đưa qua cửa ───────────────────────── */

function Docs({ v, show, wave, plan, flag, desktop }: { v: Visitor; show: boolean; wave: Wave; plan: Plan; flag: Flaw | null; desktop: boolean }) {
  const enter = { initial: { y: 26, opacity: 0, rotate: -3 }, animate: { y: 0, opacity: 1, rotate: 0 }, exit: { y: -8, opacity: 0 }, transition: { duration: 0.28 } };
  return (
    <div className="grid h-full min-h-0 grid-cols-2 gap-1.5 sm:gap-2">
      <Slot title="Giấy giới thiệu" locked={wave < 2} lock={`Từ khách thứ ${WAVE_START[2]}`} desktop={desktop}>
        <AnimatePresence mode="wait">
          {show && wave >= 2 && (
            <motion.div key={v.n} className="h-full w-full" {...enter}>
              {v.seal ? <PaperDoc seal={v.seal} seed={v.n} flag={flag === "seal"} /> : <Missing text="Không có giấy" />}
            </motion.div>
          )}
        </AnimatePresence>
      </Slot>
      <Slot title="Nửa mảnh giấy" locked={wave < 3} lock={`Từ khách thứ ${WAVE_START[3]}`} desktop={desktop}>
        <AnimatePresence mode="wait">
          {show && wave >= 3 && (
            <motion.div key={v.n} className="h-full w-full" {...enter}>
              {v.edge ? <SlipPair mine={plan.edge} theirs={v.edge} shift={v.shift} flag={flag === "slip"} /> : <Missing text="Không có mảnh giấy" />}
            </motion.div>
          )}
        </AnimatePresence>
      </Slot>
    </div>
  );
}

function Slot({ title, locked, lock, desktop, children }: { title: string; locked: boolean; lock: string; desktop: boolean; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-0 flex-col overflow-hidden rounded-[2px] p-1 shadow-[0_0_0_2px_#2b1d10]">
      <WoodSurface seed={11} plank={40} />
      <span className={cn("label relative z-10 truncate text-[#f1e2bd]", desktop ? "text-[11px]" : "text-[9.5px]")}>{title}</span>
      <div className="relative min-h-0 flex-1">
        {locked ? (
          <div className="absolute inset-0 flex items-center justify-center gap-1.5 rounded-[2px] border border-dashed border-[#e8d6ae]/45 bg-black/25 px-1 text-center font-text text-[11px] text-[#e8d6ae]/85 sm:text-[13px]">
            <Lock className="h-3.5 w-3.5 shrink-0" /> {lock}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function Missing({ text }: { text: string }) {
  return <div className="grid h-full place-items-center font-text text-[12px] italic text-[#e8d6ae]/80 sm:text-[14px]">{text}</div>;
}

/* ───────────────────────── Thẻ ám hiệu ───────────────────────── */

/** Thẻ ám hiệu đầy đủ (máy tính): câu hỏi – đáp và hai quy định mở dần theo đợt. */
function RuleCard({ plan, wave, fresh, compact }: { plan: Plan; wave: Wave; fresh: number; compact: boolean }) {
  return (
    <div className="sheet relative shrink-0 rounded-[2px] px-3 pb-2 pt-1.5">
      <div className="flex items-center justify-between border-b-2 border-ink/70 pb-1">
        <span className="label text-stamp">Thẻ ám hiệu hôm nay</span>
        <span className="stamp rotate-[5deg] px-1 text-[10px] text-stamp opacity-75">Tối mật</span>
      </div>
      <Rule no={1} on pulse={fresh === 1} title="Ám hiệu">
        <p className={cn("text-ink-2", compact ? "text-[12.5px]" : "text-[13.5px]")}>Bạn hỏi: «{plan.ask}»</p>
        <p className={cn("font-bold text-ink", compact ? "text-[14px]" : "text-[15.5px]")}>Khách đáp: «{plan.answer}»</p>
      </Rule>
      <Rule no={2} on={wave >= 2} pulse={fresh === 2} title="Giấy giới thiệu" lock={`từ khách thứ ${WAVE_START[2]}`}>
        <p className={cn("flex items-center gap-1.5 text-ink", compact ? "text-[13px]" : "text-[14px]")}>
          Dấu <b>đỏ, hình vuông</b> <SealIcon className="h-5 w-5 shrink-0" />
        </p>
      </Rule>
      <Rule no={3} on={wave >= 3} pulse={fresh === 3} title="Nửa mảnh giấy" lock={`từ khách thứ ${WAVE_START[3]}`}>
        <p className={cn("flex items-center gap-1.5 text-ink", compact ? "text-[13px]" : "text-[14px]")}>
          <b>Khớp mép</b> với nửa của bạn <HalfIcon edge={plan.edge} className="h-6 w-7 shrink-0" />
        </p>
      </Rule>
    </div>
  );
}

function Rule({ no, on, pulse, title, lock, children }: { no: number; on: boolean; pulse: boolean; title: string; lock?: string; children: React.ReactNode }) {
  return (
    <motion.div
      animate={{ backgroundColor: pulse ? ["rgba(244,196,48,0)", "rgba(244,196,48,0.6)", "rgba(244,196,48,0.3)"] : "rgba(244,196,48,0)" }}
      transition={{ duration: pulse ? 1.4 : 0.6 }}
      className={cn("mt-1 flex gap-2 rounded-[2px] px-1 py-0.5", !on && "opacity-55")}
    >
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-stamp font-head text-[12px] font-bold text-cream">{no}</span>
      <div className="min-w-0 flex-1 font-text leading-snug">
        <div className="label flex items-center gap-1 text-ink-3">
          {title}
          {!on && lock && (
            <span className="flex items-center gap-0.5 normal-case tracking-normal">
              · <Lock className="h-3 w-3" /> {lock}
            </span>
          )}
        </div>
        {children}
      </div>
    </motion.div>
  );
}

/** Thẻ ám hiệu gọn (điện thoại). */
function RuleStrip({ plan, wave, fresh }: { plan: Plan; wave: Wave; fresh: number }) {
  return (
    <div className="sheet shrink-0 rounded-[2px] px-2 py-1">
      <div className="flex items-baseline gap-1.5">
        <span className="label shrink-0 text-[9.5px] text-stamp">Thẻ ám hiệu</span>
        <span className="truncate font-text text-[11.5px] text-ink-2">Bạn hỏi: «{plan.ask}»</span>
      </div>
      <motion.p
        animate={{ backgroundColor: fresh === 1 ? ["rgba(244,196,48,0)", "rgba(244,196,48,0.6)", "rgba(244,196,48,0.25)"] : "rgba(244,196,48,0)" }}
        transition={{ duration: 1.4 }}
        className="rounded-[2px] font-text text-[13px] font-bold leading-tight text-ink"
      >
        Khách đáp: «{plan.answer}»
      </motion.p>
      <div className="mt-0.5 grid grid-cols-2 gap-1">
        <Chip on={wave >= 2} pulse={fresh === 2} lock={`từ khách ${WAVE_START[2]}`}>
          <SealIcon className="h-3.5 w-3.5 shrink-0" /> Dấu đỏ, vuông
        </Chip>
        <Chip on={wave >= 3} pulse={fresh === 3} lock={`từ khách ${WAVE_START[3]}`}>
          <HalfIcon edge={plan.edge} className="h-4 w-4 shrink-0" /> Khớp mép
        </Chip>
      </div>
    </div>
  );
}

function Chip({ on, pulse, lock, children }: { on: boolean; pulse: boolean; lock: string; children: React.ReactNode }) {
  return (
    <motion.span
      animate={{ backgroundColor: pulse ? ["rgba(244,196,48,0)", "rgba(244,196,48,0.65)", "rgba(244,196,48,0.35)"] : on ? "rgba(239,227,196,0.7)" : "rgba(239,227,196,0)" }}
      transition={{ duration: pulse ? 1.4 : 0.4 }}
      className={cn("flex min-w-0 items-center gap-1 rounded-[2px] border px-1 py-[1px] font-text text-[11.5px] leading-tight text-ink", on ? "border-ink/50 font-semibold" : "border-dashed border-ink/35 text-ink-3")}
    >
      {children}
      {!on && (
        <span className="ml-auto flex shrink-0 items-center gap-0.5 text-[10px]">
          <Lock className="h-2.5 w-2.5" />
          {lock}
        </span>
      )}
    </motion.span>
  );
}

/* ───────────────────────── Nút quyết định ───────────────────────── */

function Buttons({ decide, dim, desktop, compact }: { decide: (admit: boolean) => void; dim: boolean; desktop: boolean; compact: boolean }) {
  const base = cn(
    "flex items-center justify-center gap-2 rounded-[3px] border-2 font-head font-bold uppercase tracking-wider text-cream transition active:translate-y-[2px] active:shadow-none",
    desktop ? "h-14 text-[20px]" : compact ? "h-11 text-[16px]" : "h-12 text-[17px]",
    dim && "opacity-50",
  );
  const key = "rounded-[3px] border border-cream/40 px-1.5 font-type text-[13px] leading-5 text-cream/80";
  return (
    <div className="grid shrink-0 grid-cols-2 gap-2">
      <button type="button" data-act="out" onClick={() => decide(false)} className={cn(base, "border-[#5e120d] bg-stamp shadow-[0_3px_0_#5e120d] hover:brightness-110")}>
        {desktop && <kbd className={key}>←</kbd>}
        <DoorClosed className="h-5 w-5" /> Mời ra
      </button>
      <button type="button" data-act="in" onClick={() => decide(true)} className={cn(base, "border-[#1d3318] bg-olive shadow-[0_3px_0_#1d3318] hover:brightness-110")}>
        <DoorOpen className="h-5 w-5" /> Mời vào
        {desktop && <kbd className={key}>→</kbd>}
      </button>
    </div>
  );
}
