"use client";

import { AnimatePresence, motion } from "motion/react";
import { DoorOpen, Repeat2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DELEGATES, DELEGATES_BEFORE } from "@/game/data/minis";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/sfx";
import { Silhouette } from "./door-art";
import { EndOverlay, HallBar } from "./door-hall";
import { Newspaper, type Mark } from "./door-paper";
import { FINE_RATIO, GENUINE, MISS, MS, describe, makePlan, speedFactor, type Visitor } from "./door-plan";
import { isTypingTarget, qa, useBox, useFinishOnce } from "./shared";
import type { MiniProps } from "./types";

/*
 * "Gác cửa hội trường" (nhiệm vụ 20, cuối tháng 3/1935): ca gác cuối trước giờ khai mạc Đại hội I ở phố Quan Công, Ma Cao.
 * Mỗi người gõ cửa đưa một tờ báo tín vật (hư cấu). Người chơi so với tờ báo gốc của mình:
 * thấy chỗ khác thì chạm vào chỗ đó trên tờ của khách để vạch tờ giả và mời ra; giống hệt thì bấm Mời vào.
 * Không thể mời ra khi chưa chỉ được chỗ khác, nên đại biểu thật không bao giờ bị mời nhầm ra.
 * Hết giờ thì đồng chí phụ trách đón nốt các đại biểu còn lại: phòng họp luôn đủ 13 người.
 * Điểm: mỗi khách xử lý đúng được trọn phần (1000 chia số khách) nếu xong trong 12 giây, chậm dần còn một nửa;
 * chạm nhầm chỗ giống nhau trừ 20; để lọt tờ giả trừ 0,6 phần.
 */

type Stage = "intro" | "approach" | "ready" | "verdict" | "escort" | "end";

interface Result {
  kind: "caught" | "admitted" | "leaked";
  text: string;
  points: number;
  key: number;
}

interface G {
  i: number;
  stage: Stage;
  key: number;
  readyAt: number;
  marks: Record<string, Mark>;
  misses: number;
  score: number;
  seats: string;
  seated: number;
  rightIn: number;
  caught: number;
  leaked: number;
  result: Result | null;
  toast: { text: string; key: number } | null;
  final: number;
  timeUp: boolean;
}

const START: G = {
  i: 0,
  stage: "intro",
  key: 0,
  readyAt: 0,
  marks: {},
  misses: 0,
  score: 0,
  seats: "e".repeat(DELEGATES_BEFORE) + ".".repeat(GENUINE),
  seated: DELEGATES_BEFORE,
  rightIn: 0,
  caught: 0,
  leaked: 0,
  result: null,
  toast: null,
  final: 0,
  timeUp: false,
};

const clampScore = (s: number) => Math.round(Math.min(1000, Math.max(0, s)));

function seat(g: G, mark: "a" | "e") {
  return { seats: g.seats.slice(0, g.seated) + mark + g.seats.slice(g.seated + 1), seated: g.seated + 1 };
}

function toEnd(g: G): G {
  return { ...g, stage: g.seated < DELEGATES ? "escort" : "end", key: g.key + 1, final: clampScore(g.score), toast: null };
}

function tick(g: G, plan: Visitor[], now: number): G {
  switch (g.stage) {
    case "intro":
      return { ...g, stage: "approach", key: g.key + 1 };
    case "approach":
      return { ...g, stage: "ready", key: g.key + 1, readyAt: now };
    case "verdict": {
      const i = g.i + 1;
      if (i >= plan.length) return toEnd(g);
      return { ...g, i, stage: "approach", key: g.key + 1, marks: {}, result: null, toast: null };
    }
    case "escort": {
      const s = { ...g, ...seat(g, "e"), key: g.key + 1 };
      return s.seated >= DELEGATES ? { ...s, stage: "end" } : s;
    }
    default:
      return g;
  }
}

function delayOf(g: G): number | null {
  if (g.stage === "intro") return MS.intro;
  if (g.stage === "approach") return MS.approach;
  if (g.stage === "verdict") return g.result?.kind === "leaked" ? MS.mistake : MS.verdict;
  if (g.stage === "escort") return MS.seat;
  return null;
}

export function Door({ seconds, startedAt, onFinish }: MiniProps) {
  const finish = useFinishOnce(onFinish);
  const [boxRef, box] = useBox<HTMLDivElement>();
  // Đọc mốc thời gian và thời lượng một lần lúc mở trò chơi; lịch khách lấy hạt giống từ mốc bắt đầu.
  const [cfg] = useState(() => ({ seconds, startedAt, plan: makePlan(startedAt) }));
  const { plan } = cfg;
  const per = 1000 / plan.length;
  const [g, setG] = useState<G>(START);
  // Điện thoại: đang lật xem tờ của mình cho khách thứ mấy (khách mới tới thì tự quay về tờ của khách).
  const [mineFor, setMineFor] = useState(-1);

  // Nhịp chuyển cảnh: mỗi cảnh hẹn giờ sang cảnh sau (bỏ qua nếu cảnh đã đổi vì người chơi bấm hoặc hết giờ).
  const key = g.key;
  const delay = delayOf(g);
  useEffect(() => {
    if (delay === null) return;
    const id = window.setTimeout(() => {
      const now = Date.now();
      setG((s) => (s.key === key ? tick(s, plan, now) : s));
    }, delay);
    return () => window.clearTimeout(id);
  }, [key, delay, plan]);

  // Hết giờ: thôi nhận khách, đồng chí phụ trách đón nốt các đại biểu còn ở ngoài.
  useEffect(() => {
    const left = cfg.startedAt + cfg.seconds * 1000 - Date.now();
    const id = window.setTimeout(() => setG((s) => (s.stage === "escort" || s.stage === "end" ? s : toEnd({ ...s, timeUp: true }))), Math.max(0, left));
    return () => window.clearTimeout(id);
  }, [cfg]);

  const stage = g.stage;
  useEffect(() => {
    if (stage === "approach") sfx.knock();
  }, [stage, key]);

  const result = g.result;
  useEffect(() => {
    if (!result) return;
    if (result.kind === "caught") {
      sfx.stamp();
      sfx.correct();
    } else if (result.kind === "admitted") sfx.stamp();
    else sfx.wrong();
  }, [result]);

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

  /** Chạm vào một ô trên tờ báo của khách. */
  const tap = useCallback(
    (id: string) => {
      const now = Date.now();
      setG((s) => {
        if (s.stage !== "ready" || s.marks[id]) return s;
        const v = plan[s.i];
        if (id in v.diffs) {
          const points = per * speedFactor((now - s.readyAt) / 1000);
          return {
            ...s,
            stage: "verdict",
            key: s.key + 1,
            marks: { ...s.marks, [id]: "hit" },
            score: s.score + points,
            caught: s.caught + 1,
            toast: null,
            result: { kind: "caught", text: `Vạch được chỗ khác: ${describe(id, v.diffs)}. Mời khách ra.`, points: Math.round(points), key: now },
          };
        }
        return { ...s, marks: { ...s.marks, [id]: "miss" }, misses: s.misses + 1, score: s.score - MISS, toast: { text: `Chỗ này giống hệt tờ của bạn (−${MISS})`, key: now } };
      });
    },
    [plan, per],
  );

  /** Giống hệt: mời vào. */
  const admit = useCallback(() => {
    const now = Date.now();
    setG((s) => {
      if (s.stage !== "ready") return s;
      const v = plan[s.i];
      if (v.genuine) {
        const points = per * speedFactor((now - s.readyAt) / 1000);
        return {
          ...s,
          ...seat(s, "a"),
          stage: "verdict",
          key: s.key + 1,
          score: s.score + points,
          rightIn: s.rightIn + 1,
          toast: null,
          result: { kind: "admitted", text: "Tờ báo giống hệt tờ gốc. Mời đại biểu vào!", points: Math.round(points), key: now },
        };
      }
      const ids = Object.keys(v.diffs);
      const marks = Object.fromEntries(ids.map((id) => [id, "reveal" as Mark]));
      return {
        ...s,
        stage: "verdict",
        key: s.key + 1,
        marks,
        score: s.score - per * FINE_RATIO,
        leaked: s.leaked + 1,
        toast: null,
        result: {
          kind: "leaked",
          text: `Tờ báo này có ${ids.length} chỗ khác: ${ids.map((id) => describe(id, v.diffs)).join("; ")}. Đồng chí phụ trách đã mời khách ra.`,
          points: -Math.round(per * FINE_RATIO),
          key: now,
        },
      };
    });
  }, [plan, per]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || isTypingTarget(e.target)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        admit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [admit]);

  const toast = g.toast;
  useEffect(() => {
    if (toast) sfx.tick();
  }, [toast]);

  /* ───────── bố cục ───────── */

  const ready = box.w > 0 && box.h > 0;
  const desktop = box.w >= 640 && box.w >= box.h * 1.15;
  const v = plan[Math.min(g.i, plan.length - 1)];
  const present = stage === "approach" || stage === "ready" || stage === "verdict";
  const mine = mineFor === g.i && present;
  const canAct = stage === "ready";
  const fakes = plan.filter((x) => !x.genuine).length;
  const STRIP = desktop ? 64 : 46;
  const BAR = desktop ? 56 : 48;
  const PAD = desktop ? 8 : 6;
  const LABEL = 20;
  const areaH = box.h - STRIP - BAR - PAD * 4 - LABEL;
  const slotW = desktop ? (box.w - PAD * 2 - 16) / 2 : box.w - PAD * 2;
  const paperW = Math.max(60, slotW);
  const paperH = Math.max(60, areaH);

  const visitorPaper = <Newspaper diffs={present ? v.diffs : {}} interactive enabled={canAct && !mine} marks={g.marks} onTap={tap} w={paperW} h={paperH} />;
  const minePaper = <Newspaper diffs={{}} w={paperW} h={paperH} />;

  return (
    <div
      ref={boxRef}
      className="absolute inset-0 select-none overflow-hidden"
      style={{ background: "radial-gradient(120% 100% at 30% 40%, #2a1d12 0%, #160f09 70%, #0d0905 100%)" }}
      data-game="door"
      data-stage={stage}
      data-i={g.i}
      {...qa({ "data-genuine": present ? (v.genuine ? 1 : 0) : "" })}
      {...qa({ "data-diffs": present ? Object.keys(v.diffs).join(",") : "" })}
      data-seated={g.seated}
      data-caught={g.caught}
      data-leaked={g.leaked}
      data-misses={g.misses}
      data-score={ended ? final : Math.round(g.score)}
      data-done={ended ? 1 : 0}
      data-started={cfg.startedAt}
      data-seconds={cfg.seconds}
    >
      {ready && (
        <div className="absolute inset-0 flex flex-col" style={{ padding: PAD, gap: PAD }}>
          {/* khách ở cửa, 13 ghế phòng họp, điểm */}
          <div className="flex shrink-0 items-stretch gap-2" style={{ height: STRIP }}>
            <Doorway v={v} present={present} result={g.result} small={!desktop} />
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <div className={cn("label text-[#f1e2bd]/80", desktop ? "text-[11px]" : "text-[9.5px]")}>
                {desktop ? "Ca gác cuối · Khách thứ" : "Khách"} {Math.min(g.i + 1, plan.length)}/{plan.length}
              </div>
              <AnimatePresence mode="wait">
                {present && (
                  <motion.p
                    key={v.n}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0, transition: { delay: 0.25 } }}
                    exit={{ opacity: 0 }}
                    className={cn("truncate font-text italic text-cream", desktop ? "text-[16px]" : "text-[12.5px]")}
                  >
                    «{v.line}»
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <div className={cn("shrink-0", desktop ? "w-[300px]" : "w-[150px]")}>
              <HallBar seats={g.seats} seated={g.seated} score={g.score} compact={!desktop} />
            </div>
          </div>

          {/* hai tờ báo */}
          <div className="relative min-h-0 flex-1">
            {desktop ? (
              <div className="grid h-full grid-cols-2 gap-4">
                <PaperSlot label="Tờ báo của bạn · bản gốc" tone="mine">
                  {minePaper}
                </PaperSlot>
                <PaperSlot label="Tờ báo khách đưa · chạm vào chỗ khác" tone="theirs">
                  {visitorPaper}
                </PaperSlot>
              </div>
            ) : (
              <PaperSlot label={mine ? "Tờ báo của bạn · bản gốc" : "Tờ báo khách đưa · chạm vào chỗ khác"} tone={mine ? "mine" : "theirs"}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={mine ? "mine" : "theirs"}
                    initial={{ rotateY: 90, opacity: 0.4 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: -90, opacity: 0.4 }}
                    transition={{ duration: 0.18 }}
                  >
                    {mine ? minePaper : visitorPaper}
                  </motion.div>
                </AnimatePresence>
              </PaperSlot>
            )}

            <AnimatePresence>
              {stage === "intro" && (
                <motion.div key="intro" className="absolute inset-0 grid place-items-center bg-black/45 px-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <motion.div initial={{ scale: 0.85, y: 10 }} animate={{ scale: 1, y: 0 }} className="sheet max-w-[460px] rounded-[2px] px-4 py-2.5 text-center">
                    <div className="label text-stamp">Phố Quan Công · Ma Cao · 3/1935</div>
                    <div className={cn("font-head font-bold uppercase leading-tight text-ink", desktop ? "text-[24px]" : "text-[18px]")}>Ca gác cuối</div>
                    <p className={cn("font-text leading-snug text-ink", desktop ? "text-[15px]" : "text-[13px]")}>
                      {DELEGATES_BEFORE}/{DELEGATES} đại biểu đã vào. Chỉ mời vào người mang tờ báo giống hệt tờ của bạn.
                    </p>
                  </motion.div>
                </motion.div>
              )}
              {stage === "verdict" && g.result && (
                <motion.div key={`r${g.result.key}`} className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center px-2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div
                    className={cn(
                      "sheet max-w-[560px] rounded-[2px] border-l-4 px-3 py-1.5 shadow-[0_10px_24px_-8px_rgba(0,0,0,0.85)]",
                      g.result.kind === "caught" ? "border-stamp" : g.result.kind === "admitted" ? "border-olive" : "border-[#a35d0c]",
                    )}
                  >
                    <div className={cn("font-head font-bold uppercase tracking-wide", desktop ? "text-[17px]" : "text-[14px]", g.result.kind === "caught" ? "text-stamp" : g.result.kind === "admitted" ? "text-olive" : "text-[#8a4b0c]")}>
                      {g.result.kind === "caught" ? "Tờ báo giả" : g.result.kind === "admitted" ? "Đại biểu" : "Để lọt tờ báo giả"} · {g.result.points >= 0 ? `+${g.result.points}` : `−${Math.abs(g.result.points)}`} điểm
                    </div>
                    <p className={cn("font-text leading-snug text-ink", desktop ? "text-[14.5px]" : "text-[12.5px]")}>{g.result.text}</p>
                  </div>
                </motion.div>
              )}
              {stage === "escort" && (
                <motion.div key="escort" className="absolute inset-x-0 top-[30%] flex justify-center px-2" initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
                  <span className="rounded-[2px] bg-[#1f1a14]/90 px-2.5 py-1 text-center font-head text-[13px] font-bold uppercase tracking-[0.1em] text-[#ffd77a] shadow-[0_4px_12px_rgba(0,0,0,0.6)] sm:text-[15px]">
                    Hết giờ · Đồng chí phụ trách đón các đại biểu còn lại
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* nút: (lật tờ báo trên điện thoại) và mời vào */}
          <div className="flex shrink-0 items-center gap-2" style={{ height: BAR }}>
            {desktop ? (
              <div className="min-w-0 flex-1 font-text text-[14px] leading-snug text-[#f1e2bd]/85">
                <AnimatePresence mode="wait">
                  {g.toast ? (
                    <motion.span key={g.toast.key} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: [-6, 4, -2, 0] }} exit={{ opacity: 0 }} className="font-semibold text-[#ffb08a]">
                      {g.toast.text}
                    </motion.span>
                  ) : (
                    <motion.span key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      So từng ô chữ, từng con số, từng hình vẽ. Thấy chỗ khác thì chạm vào chỗ đó trên tờ của khách.
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                type="button"
                data-act="flip"
                onClick={() => setMineFor(mine ? -1 : g.i)}
                className="flex h-full min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[3px] border-2 border-[#e8d6ae]/40 bg-black/40 px-1.5 font-head text-[13px] font-semibold uppercase leading-tight tracking-wide text-[#f1e2bd]"
              >
                <Repeat2 className="h-5 w-5 shrink-0" />
                {mine ? "Xem tờ khách đưa" : "Xem tờ của bạn"}
              </button>
            )}
            <button
              type="button"
              data-act="admit"
              onClick={admit}
              className={cn(
                "flex h-full shrink-0 items-center justify-center gap-2 rounded-[3px] border-2 border-[#1d3318] bg-olive px-4 font-head font-bold uppercase tracking-wider text-cream shadow-[0_3px_0_#1d3318] transition active:translate-y-[2px] active:shadow-none",
                desktop ? "min-w-[320px] text-[19px]" : "min-w-0 flex-[1.25] px-2 text-[14px] leading-tight",
                !canAct && "opacity-50",
              )}
            >
              <DoorOpen className="h-5 w-5" /> Giống hệt · Mời vào
              {desktop && <kbd className="rounded-[3px] border border-cream/40 px-1.5 font-type text-[13px] leading-5 text-cream/80">→</kbd>}
            </button>
          </div>
          {!desktop && g.toast && (
            <motion.div key={g.toast.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: [0, 1, 1, 0], y: [6, 0, 0, -4] }} transition={{ duration: 1.8, times: [0, 0.1, 0.75, 1] }} className="pointer-events-none absolute inset-x-0 flex justify-center" style={{ bottom: BAR + PAD * 2 }}>
              <span className="rounded-[2px] bg-[#1f1a14]/90 px-2 py-0.5 font-text text-[12px] font-semibold text-[#ffb08a]">{g.toast.text}</span>
            </motion.div>
          )}
        </div>
      )}
      <AnimatePresence>
        {ended && (
          <EndOverlay
            compact={!desktop}
            summary={
              <>
                Bạn đón đúng <b>{g.rightIn}/{GENUINE}</b> đại biểu cuối · vạch đúng <b>{g.caught}/{fakes}</b> tờ báo giả
              </>
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/** Khung tờ báo kèm nhãn; tờ báo tự thu phóng cho vừa khung. */
function PaperSlot({ label, tone, children }: { label: string; tone: "mine" | "theirs"; children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center">
      <div className={cn("label mb-1 h-4 shrink-0 truncate text-[10px] sm:text-[11.5px]", tone === "theirs" ? "text-[#ffd77a]" : "text-[#f1e2bd]/75")}>{label}</div>
      <div className="flex min-h-0 flex-1 items-start justify-center [perspective:900px]">{children}</div>
    </div>
  );
}

/** Ô cửa nhỏ: bóng khách đứng ngoài, mời vào thì bước vào, tờ giả thì quay đi. */
function Doorway({ v, present, result, small }: { v: Visitor; present: boolean; result: Result | null; small: boolean }) {
  const leaving = result ? (result.kind === "admitted" ? "in" : "out") : null;
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-[2px] shadow-[0_0_0_2px_#4a2e16]", small ? "w-[38px]" : "w-[54px]")} style={{ background: "linear-gradient(#0a1120, #1f2c42)" }}>
      <div aria-hidden className="absolute right-1 top-1 h-6 w-6 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,211,122,0.75), rgba(255,184,80,0))" }} />
      <AnimatePresence>
        {present && (
          <motion.svg
            key={v.n}
            viewBox="0 0 100 180"
            className="absolute bottom-0 left-1/2 h-[92%] -translate-x-1/2"
            initial={{ opacity: 0, x: -14 }}
            animate={leaving === "in" ? { opacity: 0, scale: 1.3, y: 6 } : leaving === "out" ? { opacity: 0, x: 18 } : { opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: leaving ? 0.6 : 0.4, delay: leaving ? 0.5 : 0 }}
          >
            <Silhouette look={v.look} />
          </motion.svg>
        )}
      </AnimatePresence>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] bg-[#2a190c]" />
    </div>
  );
}
