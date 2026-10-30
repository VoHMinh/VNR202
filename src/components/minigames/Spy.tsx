"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, X } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Stamp } from "@/components/kit/Stamp";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/sfx";
import { WoodSurface, isTypingTarget, useBox, useFinishOnce } from "./shared";
import { makeSpyCases, type SpyCase, type SpySuspect } from "./spy-cases";
import type { MiniProps } from "./types";

/*
 * "Kẻ chỉ điểm" (đầu năm 1931): hai vụ liên tiếp. Theo nguyên tắc đơn tuyến, mỗi giao liên chỉ nắm vài cơ sở,
 * nên kẻ chỉ điểm là người nắm đúng và đủ các cơ sở vừa bị phá: không thiếu nơi nào, không có nơi nào còn an toàn.
 * Chạm vào người đó để cắt liên lạc. Chỉ đúng: 250 + 250 × (1 − thời gian của vụ / 20 giây) điểm.
 * Chỉ sai hoặc hết giờ: vụ đó 0 điểm. Tổng hai vụ tối đa 1000 điểm.
 */

const BONUS_S = 20;
const PAUSE_MS = 800;

type Phase = "play" | "reveal" | "done";
type CardState = "idle" | "cut" | "innocent" | "traitor" | "dim";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function Spy({ seconds, startedAt, onFinish }: MiniProps) {
  // Giữ mốc giờ và đề lúc mở trò chơi: khung cha vẽ lại cũng không đổi.
  const [t0] = useState(startedAt);
  const [secs] = useState(seconds);
  const [cases] = useState(() => makeSpyCases(startedAt));
  const finish = useFinishOnce(onFinish);
  const [boxRef, box] = useBox<HTMLDivElement>();

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("play");
  const [picks, setPicks] = useState<(number | null)[]>(() => cases.map(() => null));
  const [scores, setScores] = useState<number[]>(() => cases.map(() => 0));
  const [timeUp, setTimeUp] = useState(false);

  const phaseRef = useRef<Phase>("play");
  const roundRef = useRef(0);
  const roundStart = useRef(t0);
  const totalRef = useRef(0);
  const pauseTimer = useRef(0);
  const barRef = useRef<HTMLSpanElement>(null);

  const accuse = useCallback(
    (i: number) => {
      if (phaseRef.current !== "play") return;
      const now = Date.now();
      if (now >= t0 + secs * 1000) return;
      const r = roundRef.current;
      const c = cases[r];
      if (i < 0 || i >= c.suspects.length) return;
      const t = (now - roundStart.current) / 1000;
      const ok = i === c.traitor;
      const pts = ok ? 250 + Math.round(250 * Math.max(0, 1 - t / BONUS_S)) : 0;
      totalRef.current += pts;
      phaseRef.current = "reveal";
      setPhase("reveal");
      setPicks((p) => p.map((v, j) => (j === r ? i : v)));
      setScores((s) => s.map((v, j) => (j === r ? pts : v)));
      sfx.stamp();
      if (ok) sfx.correct();
      else sfx.wrong();
      window.clearTimeout(pauseTimer.current);
      pauseTimer.current = window.setTimeout(() => {
        if (phaseRef.current !== "reveal") return;
        if (r + 1 < cases.length) {
          roundRef.current = r + 1;
          roundStart.current = Date.now();
          phaseRef.current = "play";
          setRound(r + 1);
          setPhase("play");
        } else {
          phaseRef.current = "done";
          setPhase("done");
          finish(totalRef.current);
        }
      }, PAUSE_MS);
    },
    [cases, finish, secs, t0],
  );

  // Hết giờ: vụ đang dở tính 0 điểm, chốt điểm đúng một lần.
  useEffect(() => {
    const id = window.setTimeout(
      () => {
        if (phaseRef.current !== "done") {
          phaseRef.current = "done";
          setPhase("done");
          setTimeUp(true);
        }
        finish(totalRef.current);
      },
      Math.max(0, t0 + secs * 1000 - Date.now()),
    );
    return () => window.clearTimeout(id);
  }, [finish, secs, t0]);

  useEffect(() => {
    const timer = pauseTimer;
    return () => window.clearTimeout(timer.current);
  }, []);

  // Vạch thưởng tốc độ của vụ đang chơi: cạn dần trong BONUS_S giây.
  useEffect(() => {
    if (phase !== "play") return;
    let raf = 0;
    const loop = () => {
      const k = Math.max(0, 1 - (Date.now() - roundStart.current) / 1000 / BONUS_S);
      if (barRef.current) barRef.current.style.transform = `scaleX(${k})`;
      if (k > 0) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, round]);

  // Phím số 1–5 cũng chỉ mặt được.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > cases[roundRef.current].suspects.length) return;
      e.preventDefault();
      accuse(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [accuse, cases]);

  const W = box.w || 700;
  const H = box.h || 450;
  const wide = W >= 480;
  const k = wide ? clamp(Math.min(W / 700, H / 450), 0.9, 1.15) : clamp(H / 340, 0.92, 1.2);
  const pad = wide ? 12 : 7;
  const c = cases[round];
  const total = scores.reduce((a, b) => a + b, 0);
  // Màn thấp (điện thoại): thẻ cơ sở một dòng, để mỗi hàng hồ sơ vẫn cao ít nhất 40px.
  const tagsCompact = !wide && H < 345;
  const tall = wide && H >= 380;

  return (
    <div
      ref={boxRef}
      data-game="spy"
      data-phase={phase}
      data-round={round + 1}
      data-rounds={cases.length}
      data-answer={c.traitor}
      data-answer-alias={c.suspects[c.traitor].alias}
      data-picks={picks.map((p) => (p === null ? "" : p)).join(",")}
      data-results={scores.join(",")}
      data-score={total}
      data-done={phase === "done" ? 1 : 0}
      className="relative h-full w-full select-none overflow-hidden bg-[#1a110a]"
      style={{ fontSize: 16 * k }}
    >
      <Desk />
      {box.w > 0 && (
        <div className="absolute inset-0 flex flex-col" style={{ padding: pad, gap: wide ? 8 : 5 }}>
          <Header round={round} total={cases.length} picks={picks} cases={cases} wide={wide} W={W} barRef={barRef} raided={c.raided.filter(Boolean).length} bases={c.bases.length} />
          <div className="relative min-h-0 flex-1">
            <AnimatePresence initial={false}>
              <motion.div
                key={round}
                className="absolute inset-0 flex flex-col"
                style={{ gap: wide ? 10 : 5 }}
                initial={{ opacity: 0, x: 46 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -46, transition: { duration: 0.22, ease: "easeIn" } }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <Bases c={c} wide={wide} W={W - 2 * pad} compact={tagsCompact} tall={tall} />
                <Suspects
                  c={c}
                  wide={wide}
                  W={W - 2 * pad}
                  rootPx={16 * k}
                  pick={picks[round]}
                  phase={phase}
                  reveal={phase !== "play" && (picks[round] !== null || timeUp)}
                  onPick={accuse}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}
      <AnimatePresence>
        {timeUp && (
          <motion.div key="up" className="pointer-events-none absolute inset-0 grid place-items-center bg-black/35" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Stamp ink="red" rotate={-8} className="border-[4px] bg-[#efe3c6]/90 text-[2em] mix-blend-normal">
              Hết giờ
            </Stamp>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────────── Mặt bàn ───────────────────────────── */

const Desk = memo(function Desk() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <WoodSurface seed={13} plank={78} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 70% at 50% 38%, rgba(255,198,130,0.2), transparent 72%)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 125% 120% at 50% 40%, transparent 48%, rgba(0,0,0,0.66) 100%)" }} />
    </div>
  );
});

/* ───────────────────────────── Đầu bảng: vụ số mấy, thưởng tốc độ ───────────────────────────── */

function Header({
  round,
  total,
  picks,
  cases,
  wide,
  W,
  barRef,
  raided,
  bases,
}: {
  round: number;
  total: number;
  picks: (number | null)[];
  cases: SpyCase[];
  wide: boolean;
  W: number;
  barRef: React.RefObject<HTMLSpanElement | null>;
  raided: number;
  bases: number;
}) {
  const hint = wide && W >= 600;
  return (
    <div className="relative flex shrink-0 items-center gap-[0.5em] text-cream" style={{ fontSize: "0.8em" }}>
      <span className="press whitespace-nowrap font-head font-semibold uppercase leading-none tracking-[0.16em]">
        Vụ {round + 1}
        <span className="text-cream/55">/{total}</span>
      </span>
      <span className="flex items-center gap-[0.25em]" aria-hidden>
        {cases.map((cc, i) => {
          const p = picks[i];
          const ok = p !== null && p === cc.traitor;
          return (
            <span
              key={i}
              className={cn(
                "grid h-[1.1em] w-[1.1em] place-items-center rounded-[2px] border",
                p === null ? (i === round ? "border-cream/70" : "border-cream/30") : ok ? "border-[#8fb57f] bg-olive" : "border-[#e2766c] bg-stamp",
              )}
            >
              {p !== null && (ok ? <Check className="h-[0.8em] w-[0.8em]" strokeWidth={3} /> : <X className="h-[0.8em] w-[0.8em]" strokeWidth={3} />)}
            </span>
          );
        })}
      </span>
      <span className="whitespace-nowrap rounded-[2px] bg-[#5c120d]/85 px-[0.45em] py-[0.15em] font-head font-semibold uppercase leading-none tracking-[0.08em] text-cream">
        Bị phá {raided}/{bases}
      </span>
      {hint && <span className="min-w-0 flex-1 truncate text-center font-text italic text-cream/75">Ai nắm đúng và đủ các cơ sở bị phá?</span>}
      <span className={cn("flex items-center gap-[0.4em]", !hint && "ml-auto")}>
        {W >= 400 && <span className="label whitespace-nowrap text-cream/60">Thưởng tốc độ</span>}
        <span className="relative block h-[0.42em] overflow-hidden rounded-full bg-black/45 shadow-[inset_0_0_0_1px_rgba(241,231,208,0.18)]" style={{ width: wide ? "7em" : "5em" }}>
          <span ref={barRef} className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-[#c9952a] to-gold" />
        </span>
      </span>
    </div>
  );
}

/* ───────────────────────────── Các cơ sở ───────────────────────────── */

function Bases({ c, wide, W, compact, tall }: { c: SpyCase; wide: boolean; W: number; compact: boolean; tall: boolean }) {
  const n = c.bases.length;
  const cols = wide ? n : n <= 4 ? (W / n >= 96 ? n : 2) : 3;
  return (
    <div className="grid shrink-0" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: wide ? 6 : 4 }}>
      {c.bases.map((name, i) => (
        <BaseCard key={name} name={name} raided={c.raided[i]} wide={wide} compact={compact} tall={tall} i={i} />
      ))}
    </div>
  );
}

function BaseCard({ name, raided, wide, compact, tall, i }: { name: string; raided: boolean; wide: boolean; compact: boolean; tall: boolean; i: number }) {
  const Icon = raided ? X : Check;
  return (
    <motion.div
      data-base={i}
      data-raided={raided ? 1 : 0}
      title={`${name}: ${raided ? "bị phá" : "an toàn"}`}
      className="sheet relative overflow-hidden rounded-[2px] shadow-[0_5px_9px_-4px_rgba(0,0,0,0.75),0_1px_2px_rgba(0,0,0,0.45)]"
      style={{ padding: compact ? "0.3em 0.4em 0.26em 0.55em" : wide ? (tall ? "0.42em 0.55em 0.4em 0.72em" : "0.32em 0.5em 0.3em 0.62em") : "0.28em 0.4em 0.26em 0.55em" }}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.03 * i, duration: 0.25 }}
    >
      <span aria-hidden className="absolute inset-0 mix-blend-multiply" style={{ background: raided ? "rgba(200,70,50,0.24)" : "rgba(92,132,70,0.2)" }} />
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-[0.24em]", raided ? "bg-stamp" : "bg-olive")} />
      {compact ? (
        <span className={cn("relative flex items-center gap-[0.22em] font-head font-semibold leading-[1.15]", raided ? "text-[#7d140e]" : "text-[#22401c]")} style={{ fontSize: "0.74em" }}>
          <Icon className="h-[1em] w-[1em] shrink-0" strokeWidth={3.2} aria-hidden />
          <span className="truncate text-ink">{name}</span>
          <span className="sr-only">{raided ? "bị phá" : "an toàn"}</span>
        </span>
      ) : (
        <>
          <span className="relative block truncate font-head font-semibold leading-[1.15] text-ink" style={{ fontSize: tall ? "0.9em" : wide ? "0.8em" : "0.74em" }}>
            {name}
          </span>
          <span
            className={cn("relative mt-[0.1em] flex items-center gap-[0.2em] font-head font-bold uppercase leading-none tracking-[0.1em]", raided ? "text-stamp" : "text-olive")}
            style={{ fontSize: tall ? "0.64em" : "0.58em" }}
          >
            <Icon className="h-[1.05em] w-[1.05em]" strokeWidth={3.2} aria-hidden />
            {raided ? "Bị phá" : "An toàn"}
          </span>
        </>
      )}
    </motion.div>
  );
}

/* ───────────────────────────── Hồ sơ những người bị nghi ───────────────────────────── */

function Suspects({
  c,
  wide,
  W,
  rootPx,
  pick,
  phase,
  reveal,
  onPick,
}: {
  c: SpyCase;
  wide: boolean;
  W: number;
  rootPx: number;
  pick: number | null;
  phase: Phase;
  reveal: boolean;
  onPick: (i: number) => void;
}) {
  const n = c.suspects.length;
  // Hồ sơ dạng thẻ xếp một hàng khi mỗi thẻ (lúc có 5 người) còn rộng ít nhất 118px; hẹp hơn thì xếp thành các dòng như sổ ghi chép.
  const cards = wide && (W - 4 * 9) / 5 >= 118;
  const gap = cards ? 9 : 4;
  const cardW = cards ? (W - (n - 1) * gap) / n : W;
  // Thẻ: cỡ chữ theo bề ngang tấm thẻ để tên cơ sở dài nhất vẫn vừa một dòng.
  // Tên dài nhất ("Hiệu thuốc bắc") rộng khoảng 6,3 lần cỡ chữ, cộng dấu, lề và viền là khoảng 8,4 lần.
  const chipPx = cards ? clamp((cardW - 1.32 * rootPx - 4) / 8.4, 10, 16) : 0;
  const state = (i: number): CardState => {
    if (!reveal) return "idle";
    if (i === pick) return i === c.traitor ? "cut" : "innocent";
    if (i === c.traitor) return "traitor";
    return "dim";
  };
  return (
    <div
      className="grid min-h-0 flex-1"
      style={
        cards
          ? { gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, gridAutoRows: "auto", alignContent: "center", gap }
          : { gridTemplateColumns: "minmax(0, 1fr)", gridTemplateRows: `repeat(${n}, minmax(0, 1fr))`, gap, containerType: "size" }
      }
    >
      {c.suspects.map((s, i) => (
        <SuspectCard
          key={`${s.alias}-${i}`}
          s={s}
          c={c}
          i={i}
          cards={cards}
          rowFont={`clamp(13px, ${(100 / (n * 3.05)).toFixed(2)}cqh, 21px)`}
          chipPx={chipPx}
          cardW={cardW}
          state={state(i)}
          disabled={phase !== "play"}
          onPick={onPick}
        />
      ))}
    </div>
  );
}

function SuspectCard({
  s,
  c,
  i,
  cards,
  rowFont,
  chipPx,
  cardW,
  state,
  disabled,
  onPick,
}: {
  s: SpySuspect;
  c: SpyCase;
  i: number;
  cards: boolean;
  rowFont: string;
  chipPx: number;
  cardW: number;
  state: CardState;
  disabled: boolean;
  onPick: (i: number) => void;
}) {
  const tilt = cards ? (((i * 37 + s.alias.length * 11) % 7) - 3) * 0.32 : (((i * 37 + s.alias.length * 11) % 5) - 2) * 0.16;
  const twoLine = cards && cardW < 150;
  // Thẻ bị đóng dấu thì chữ bên dưới mờ đi để dấu đọc rõ; thẻ của kẻ chỉ điểm (lộ ra khi chỉ sai) vẫn giữ rõ để người chơi thấy vì sao.
  const fade = state === "cut" || state === "innocent";
  return (
    <motion.button
      type="button"
      data-suspect={i}
      data-alias={s.alias}
      aria-label={`Giao liên ${s.alias}, nắm các cơ sở: ${s.knows.map((b) => `${c.bases[b]} (${c.raided[b] ? "bị phá" : "an toàn"})`).join(", ")}`}
      onClick={() => onPick(i)}
      disabled={disabled}
      className={cn(
        "sheet group relative min-h-[40px] touch-manipulation rounded-[2px] text-left outline-none transition-[filter,opacity] duration-200 focus-visible:ring-2 focus-visible:ring-gold/80 disabled:cursor-default",
        cards ? "flex h-full flex-col" : "flex h-full items-center",
        state === "dim" && "opacity-55 saturate-[0.55]",
      )}
      style={{
        fontSize: cards ? undefined : rowFont,
        padding: cards ? "0.62em 0.66em 0.7em" : "0.15em 0.55em",
        gap: cards ? 0 : "0.55em",
        rotate: `${tilt}deg`,
        boxShadow: "0 10px 16px -8px rgba(0,0,0,0.85), 0 2px 3px rgba(0,0,0,0.45)",
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={disabled ? undefined : { y: -3 }}
      whileTap={disabled ? undefined : { y: 1, scale: 0.985 }}
      transition={{ delay: 0.05 + 0.04 * i, duration: 0.26 }}
    >
      {/* giấy thẻ sáng hơn giấy hồ sơ, có dòng kẻ */}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[2px] bg-[rgba(250,244,228,0.42)]" />
      {cards && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 top-[2.9em] opacity-70"
          style={{ backgroundImage: "repeating-linear-gradient(180deg, transparent 0 1.5em, rgba(70,96,140,0.2) 1.5em calc(1.5em + 1px))" }}
        />
      )}
      {cards && <Clip />}
      {cards ? (
        <>
          <span className={cn("relative flex items-center justify-between transition-opacity", fade && "opacity-35")}>
            <span className="label text-ink-3" style={{ fontSize: "0.56em" }}>
              Giao liên
            </span>
            <span className="grid h-[1.35em] w-[1.35em] place-items-center rounded-full border-[1.5px] border-ink/55 font-head font-semibold leading-none text-ink-2" style={{ fontSize: "0.62em" }}>
              {i + 1}
            </span>
          </span>
          <span
            className={cn(
              "relative block truncate border-b-[1.5px] border-ink/60 pb-[0.1em] font-head font-bold uppercase leading-[1.1] tracking-[0.04em] text-ink transition-[color,opacity] group-hover:text-stamp",
              fade && "opacity-35",
            )}
            style={{ fontSize: clamp(chipPx * 1.34, 13, 21) }}
          >
            {s.alias}
          </span>
          <span className={cn("label relative mt-[0.5em] text-ink-3 transition-opacity", fade && "opacity-35")} style={{ fontSize: "0.54em" }}>
            Nắm được
          </span>
          <span className={cn("relative mt-[0.25em] flex flex-col gap-[0.3em] transition-opacity", fade && "opacity-35")}>
            {s.knows.map((b) => (
              <Chip key={b} name={c.bases[b]} raided={c.raided[b]} px={chipPx} />
            ))}
          </span>
        </>
      ) : (
        <>
          <span
            className={cn(
              "relative w-[4.6em] shrink-0 truncate font-head font-bold uppercase leading-[1.1] tracking-[0.03em] text-ink transition-[color,opacity] group-hover:text-stamp",
              fade && "opacity-35",
            )}
            style={{ fontSize: "0.95em" }}
          >
            {s.alias}
          </span>
          <span className={cn("relative flex min-w-0 flex-1 flex-wrap content-center gap-[0.25em] transition-opacity", fade && "opacity-35")}>
            {s.knows.map((b) => (
              <Chip key={b} name={c.bases[b]} raided={c.raided[b]} />
            ))}
          </span>
        </>
      )}
      {(state === "traitor" || state === "cut") && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -inset-[3px] rounded-[3px] border-[3px] border-stamp"
          initial={{ opacity: 0 }}
          animate={{ opacity: state === "traitor" ? [0, 1, 0.45, 1] : 0.85 }}
          transition={{ duration: 0.55 }}
        />
      )}
      <AnimatePresence>
        {state === "cut" && (
          <StampOn key="cut" ink="red" size={cards ? `${Math.min(20, cardW / (twoLine ? 5.4 : 8.6))}px` : "1.08em"} place={cards ? "center" : "row"}>
            {twoLine ? (
              <>
                <span className="block">Cắt</span>
                <span className="block">liên lạc</span>
              </>
            ) : (
              "Cắt liên lạc"
            )}
          </StampOn>
        )}
        {state === "innocent" && (
          <StampOn key="oan" ink="ink" size={cards ? `${Math.min(30, cardW / 3.4)}px` : "1.35em"} place={cards ? "center" : "row"}>
            Oan
          </StampOn>
        )}
        {state === "traitor" && (
          <StampOn key="tr" ink="red" size={cards ? `${Math.min(16, cardW / 6.6)}px` : "0.92em"} delay={0.12} rotate={cards ? 9 : -6} place={cards ? "corner" : "end"}>
            Chỉ điểm
          </StampOn>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

const PLACE = {
  center: "inset-0 grid place-items-center",
  row: "inset-0 grid place-items-center pl-[30%]",
  end: "inset-y-0 right-[3%] grid place-items-center",
  corner: "right-[3%] top-[-0.45em]",
};

function StampOn({
  children,
  ink,
  size,
  delay = 0,
  rotate = -12,
  place,
}: {
  children: React.ReactNode;
  ink: "red" | "ink";
  size: string;
  delay?: number;
  rotate?: number;
  place: keyof typeof PLACE;
}) {
  return (
    <motion.span className={cn("pointer-events-none absolute z-10", PLACE[place])} exit={{ opacity: 0 }} style={{ fontSize: size }}>
      <Stamp ink={ink} rotate={rotate} delay={delay} className="whitespace-nowrap border-[3px] bg-[#f6eedb]/70 text-center leading-[1.02]">
        {children}
      </Stamp>
    </motion.span>
  );
}

function Chip({ name, raided, px }: { name: string; raided: boolean; px?: number }) {
  const Icon = raided ? X : Check;
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-[0.22em] rounded-[2px] border font-head font-medium leading-[1.25]",
        raided ? "border-stamp/70 bg-[#b3261e]/[0.14] text-[#7d140e]" : "border-olive/60 bg-[#35562d]/[0.14] text-[#22401c]",
      )}
      style={{ fontSize: px ? px : "0.7em", padding: px ? "0.12em 0.4em 0.1em 0.3em" : "0.06em 0.38em 0.04em 0.28em" }}
    >
      <Icon className="h-[1em] w-[1em] shrink-0" strokeWidth={3} aria-hidden />
      <span className="truncate">{name}</span>
    </span>
  );
}

/** Kẹp giấy bằng thép ở mép trên tấm thẻ. */
function Clip() {
  return (
    <svg aria-hidden viewBox="0 0 14 34" className="pointer-events-none absolute -top-[0.55em] right-[18%] h-[1.9em] w-[0.8em] drop-shadow-[1px_2px_1px_rgba(0,0,0,0.45)]">
      <path d="M4 22 V6 a3 3 0 0 1 6 0 V26 a4.5 4.5 0 0 1 -9 0 V9" fill="none" stroke="#8d8a83" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 22 V6 a3 3 0 0 1 6 0 V26 a4.5 4.5 0 0 1 -9 0 V9" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6" strokeLinecap="round" transform="translate(-0.4,-0.4)" />
    </svg>
  );
}
