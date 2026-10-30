"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeftRight, ChevronRight, Mail, MessageSquareQuote, ScrollText, Ticket } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { SpyEvidenceKind } from "@/game/data/minis";
import { Stamp } from "@/components/kit/Stamp";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/sfx";
import { qa, useBox, useFinishOnce, WoodSurface } from "./shared";
import { CASE_MAX, WRONG, caseScore, confront, makeSpyCases, type SpyCase, type Verdict } from "./spy-cases";
import type { MiniProps } from "./types";

/*
 * "Kẻ chỉ điểm" (đầu năm 1931): hai vụ hư cấu, vụ sau khó hơn. Mỗi vụ có biên bản, manh mối về lúc kẻ chỉ điểm
 * liên lạc với mật thám, lời khai của 4 người và 4 vật chứng. Người chơi chọn một lời khai và một vật chứng rồi bấm
 * Đối chất: đúng cặp mâu thuẫn che giấu tối hôm đó thì vạch mặt được kẻ chỉ điểm. Vụ khó có thêm một lời nói dối
 * chuyện vặt và phải xét ai biết bí mật. Vụ 1 tới 450 điểm, vụ 2 tới 550 điểm; mỗi lần đối chất sai trừ 70.
 */

const ICON: Record<SpyEvidenceKind, typeof Ticket> = { ticket: Ticket, witness: MessageSquareQuote, paper: ScrollText, letter: Mail };
const REVEAL_MS = 4200;

type Phase = "play" | "solved" | "done";
type Tab = "report" | "says" | "evidence";
interface Feedback {
  verdict: Verdict;
  text: string;
  key: number;
}

export function Spy({ seconds, startedAt, onFinish }: MiniProps) {
  const finish = useFinishOnce(onFinish);
  // Đề lấy theo mốc bắt đầu, giữ nguyên suốt lượt chơi.
  const [cfg] = useState(() => ({ seconds, startedAt, cases: makeSpyCases(startedAt) }));
  const [boxRef, box] = useBox<HTMLDivElement>();
  const [ci, setCi] = useState(0);
  const [caseT0, setCaseT0] = useState(startedAt);
  const [phase, setPhase] = useState<Phase>("play");
  const [selS, setSelS] = useState<number | null>(null);
  const [selE, setSelE] = useState<number | null>(null);
  const [wrongs, setWrongs] = useState([0, 0]);
  const [scores, setScores] = useState([0, 0]);
  const [fb, setFb] = useState<Feedback | null>(null);
  const [tab, setTab] = useState<Tab>("report");
  const c = cfg.cases[ci];
  const total = scores[0] + scores[1];

  // Sang vụ sau (hoặc kết thúc nếu đã là vụ cuối).
  const next = useCallback(() => {
    if (ci + 1 < cfg.cases.length) {
      setCi(ci + 1);
      setCaseT0(Date.now());
      setSelS(null);
      setSelE(null);
      setFb(null);
      setTab("report");
      setPhase("play");
    } else setPhase("done");
  }, [ci, cfg.cases.length]);

  // Hết giờ: vụ đang dở không được điểm.
  useEffect(() => {
    const left = cfg.startedAt + cfg.seconds * 1000 - Date.now();
    const id = window.setTimeout(() => setPhase("done"), Math.max(0, left));
    return () => window.clearTimeout(id);
  }, [cfg]);

  // Vạch mặt xong: để người chơi đọc lời giải thích rồi sang vụ sau (hoặc kết thúc).
  useEffect(() => {
    if (phase !== "solved") return;
    const id = window.setTimeout(next, REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [phase, next]);

  useEffect(() => {
    if (phase !== "done") return;
    let sent = false;
    const id = window.setTimeout(() => {
      sent = true;
      finish(total);
    }, 900);
    return () => {
      window.clearTimeout(id);
      if (!sent) finish(total);
    };
  }, [phase, total, finish]);

  function doConfront() {
    if (phase !== "play" || selS === null || selE === null) return;
    const v = confront(c, selS, selE);
    const now = Date.now();
    if (v === "hit") {
      const pts = caseScore(c.level, (now - caseT0) / 1000, wrongs[ci]);
      setScores((s) => s.map((x, i) => (i === ci ? pts : x)));
      setPhase("solved");
      setFb({ verdict: v, text: c.reveal, key: now });
      setTab("says");
      sfx.stamp();
      sfx.correct();
      return;
    }
    const alias = c.suspects[selS].alias;
    const text =
      v === "decoy" && c.decoy
        ? `Có mâu thuẫn, nhưng chỉ là chuyện vặt: ${c.decoy[2]}`
        : v === "match"
          ? `Khớp nhau: lời khai của ${alias} đúng với vật chứng này.`
          : `Vật chứng này không nói về ${alias}, chưa đối chất được.`;
    setWrongs((w) => w.map((x, i) => (i === ci ? x + 1 : x)));
    setFb({ verdict: v, text, key: now });
    setSelS(null);
    setSelE(null);
    setTab("says");
    sfx.wrong();
  }

  const desktop = box.w >= 640 && box.w > box.h * 1.15;
  const small = box.h > 0 && box.h < 470;
  const solved = phase !== "play" && scores[ci] > 0;

  const says = c.suspects.map((sp, i) => (
    <button
      key={`${ci}-${sp.alias}`}
      type="button"
      data-suspect={i}
      onClick={() => {
        if (phase !== "play") return;
        setSelS(selS === i ? null : i);
        if (!desktop && selS !== i) setTab("evidence");
      }}
      className={cn(
        "relative w-full shrink-0 rounded-[3px] border-2 px-2 py-1 text-left transition lg:px-3 lg:py-2",
        selS === i ? "border-stamp bg-[#fbe9c8] shadow-[0_0_0_2px_rgba(179,38,30,0.25)]" : "border-ink/25 bg-[#f4ecd8] hover:border-ink/60",
        solved && c.answer[0] === i && "border-stamp",
        solved && c.answer[0] !== i && "opacity-55",
      )}
    >
      <span className={cn("font-head font-bold uppercase tracking-wide text-stamp", small ? "text-[11px]" : desktop ? "text-[14px]" : "text-[12.5px]")}>{sp.alias}</span>
      <span className={cn("block font-text leading-snug text-ink", small ? "text-[12px]" : desktop ? "text-[16px]" : "text-[13px]")}>«{sp.says}»</span>
      {solved && c.answer[0] === i && (
        <span className="pointer-events-none absolute right-1.5 top-1">
          <Stamp ink="red" rotate={-8} className="bg-[#f4ecd8]/80 px-1 text-[13px] sm:text-[16px]">
            Kẻ chỉ điểm
          </Stamp>
        </span>
      )}
    </button>
  ));

  const proofs = c.evidence.map((e, i) => {
    const Icon = ICON[e.kind];
    return (
      <button
        key={`${ci}-${i}`}
        type="button"
        data-evidence={i}
        onClick={() => phase === "play" && setSelE(selE === i ? null : i)}
        className={cn(
          "flex w-full shrink-0 items-start gap-1.5 rounded-[3px] border-2 px-2 py-1 text-left transition lg:gap-2 lg:px-3 lg:py-2",
          selE === i ? "border-stamp bg-[#fbe9c8] shadow-[0_0_0_2px_rgba(179,38,30,0.25)]" : "border-ink/25 bg-[#efe3c4] hover:border-ink/60",
          solved && c.answer[1] === i && "border-stamp",
          solved && c.answer[1] !== i && "opacity-55",
        )}
      >
        <Icon className={cn("mt-0.5 shrink-0 text-ink-2", small ? "h-3.5 w-3.5" : desktop ? "h-5 w-5" : "h-4 w-4")} />
        <span className={cn("font-text leading-snug text-ink", small ? "text-[12px]" : desktop ? "text-[16px]" : "text-[13px]")}>{e.text}</span>
      </button>
    );
  });

  const bar = <ActionBar c={c} ci={ci} selS={selS} selE={selE} fb={fb} phase={phase} solved={solved} wrongs={wrongs[ci]} onConfront={doConfront} onNext={next} desktop={desktop} />;

  return (
    <div
      ref={boxRef}
      className="absolute inset-0 select-none overflow-hidden"
      data-game="spy"
      data-case={ci + 1}
      data-phase={phase}
      {...qa({ "data-answer": `${c.answer[0]},${c.answer[1]}` })}
      {...qa({ "data-decoy": c.decoy ? `${c.decoy[0]},${c.decoy[1]}` : "" })}
      data-wrongs={wrongs.join(",")}
      data-results={scores.join(",")}
      data-score={total}
      data-done={phase === "done" ? 1 : 0}
    >
      <WoodSurface seed={5} plank={64} />
      {box.w > 0 &&
        (desktop ? (
          <div className="absolute inset-0 flex flex-col gap-2 p-2.5">
            <Report c={c} ci={ci} small={small} desktop />
            <div className="grid min-h-0 flex-1 grid-cols-[1fr_1.15fr] gap-2">
              <Column title="Lời khai" hint="chạm để chọn một người">
                {says}
              </Column>
              <Column title="Vật chứng" hint="chạm để chọn một vật chứng">
                {proofs}
              </Column>
            </div>
            {bar}
          </div>
        ) : (
          // Điện thoại: ba ngăn hồ sơ, xem lần lượt; lời khai đang chọn được ghim trên ngăn vật chứng để so.
          <div className="absolute inset-0 flex flex-col gap-1.5 p-1.5">
            <Tabs tab={tab} onTab={setTab} picked={[false, selS !== null, selE !== null]} />
            <div className="relative flex min-h-0 flex-1 flex-col gap-1">
              {tab === "report" && (
                <>
                  <Report c={c} ci={ci} small={small} desktop={false} />
                  <button type="button" onClick={() => setTab("says")} className="self-end rounded-[3px] bg-black/45 px-2.5 py-1 font-head text-[13px] font-semibold uppercase tracking-wider text-[#f1e2bd]">
                    Xem lời khai <ChevronRight className="inline h-4 w-4" />
                  </button>
                </>
              )}
              {tab === "says" && says}
              {tab === "evidence" && (
                <>
                  {selS !== null && (
                    <div className="rounded-[3px] border-2 border-dashed border-stamp/70 bg-[#fbe9c8]/90 px-2 py-1 font-text text-[12px] leading-snug text-ink">
                      <b className="font-head uppercase tracking-wide text-stamp">{c.suspects[selS].alias}</b> khai: «{c.suspects[selS].says}»
                    </div>
                  )}
                  {proofs}
                </>
              )}
            </div>
            {bar}
          </div>
        ))}
    </div>
  );
}

function Report({ c, ci, small, desktop }: { c: SpyCase; ci: number; small: boolean; desktop: boolean }) {
  return (
    <motion.div key={ci} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="sheet relative shrink-0 rounded-[2px] px-2.5 py-1.5 sm:px-3.5 sm:py-2">
      <div className="flex items-baseline justify-between gap-2 border-b border-ink/40 pb-0.5">
        <span className={cn("font-head font-bold uppercase tracking-wide text-ink", small ? "text-[13px]" : "text-[15px] sm:text-[17px]")}>
          Vụ {ci + 1}/2 · {c.title}
        </span>
        <span className="label shrink-0 text-[9.5px] text-stamp sm:text-[11px]">Biên bản mật</span>
      </div>
      <p className={cn("mt-1 font-text leading-snug text-ink", small ? "text-[12px]" : desktop ? "text-[16px]" : "text-[12.5px]")}>{c.report}</p>
      <p className={cn("mt-1 rounded-[2px] border-l-4 border-stamp bg-gold/45 px-1.5 py-0.5 font-text font-semibold leading-snug text-ink", small ? "text-[12px]" : desktop ? "text-[16px]" : "text-[12.5px]")}>
        Manh mối: {c.lead}
      </p>
    </motion.div>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: "report", label: "Biên bản" },
  { id: "says", label: "Lời khai" },
  { id: "evidence", label: "Vật chứng" },
];

function Tabs({ tab, onTab, picked }: { tab: Tab; onTab: (t: Tab) => void; picked: boolean[] }) {
  return (
    <div className="grid shrink-0 grid-cols-3 gap-1">
      {TABS.map((t, i) => (
        <button
          key={t.id}
          type="button"
          data-tab={t.id}
          onClick={() => onTab(t.id)}
          className={cn(
            "flex h-8 items-center justify-center gap-1 rounded-t-[4px] font-head text-[13px] font-semibold uppercase tracking-wider transition",
            tab === t.id ? "bg-[#efe3c4] text-ink" : "bg-black/40 text-[#f1e2bd]/85",
          )}
        >
          {t.label}
          {picked[i] && <span className="grid h-4 w-4 place-items-center rounded-full bg-stamp text-[10px] text-cream">✓</span>}
        </button>
      ))}
    </div>
  );
}

function Column({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-baseline justify-between gap-2 px-0.5 pb-0.5">
        <span className="label text-[10.5px] text-[#f1e2bd] sm:text-[12px]">{title}</span>
        <span className="font-text text-[10.5px] italic text-[#f1e2bd]/70 sm:text-[11.5px]">{hint}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-0.5 [scrollbar-color:rgba(241,226,189,0.4)_transparent] [scrollbar-width:thin] sm:gap-1.5">{children}</div>
    </div>
  );
}

function ActionBar({
  c,
  ci,
  selS,
  selE,
  fb,
  phase,
  solved,
  wrongs,
  onConfront,
  onNext,
  desktop,
}: {
  c: SpyCase;
  ci: number;
  selS: number | null;
  selE: number | null;
  fb: Feedback | null;
  phase: Phase;
  solved: boolean;
  wrongs: number;
  onConfront: () => void;
  onNext: () => void;
  desktop: boolean;
}) {
  const ready = selS !== null && selE !== null && phase === "play";
  const showFb = fb && (solved || fb.verdict !== "hit");
  return (
    <div className="relative shrink-0">
      <AnimatePresence mode="wait">
        {showFb && (
          <motion.div
            key={fb.key}
            initial={{ opacity: 0, y: 6, x: fb.verdict === "hit" ? 0 : -6 }}
            animate={{ opacity: 1, y: 0, x: fb.verdict === "hit" ? 0 : [-6, 5, -3, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "mb-1.5 rounded-[3px] border-l-4 px-2.5 py-1.5 font-text leading-snug shadow-[0_6px_16px_-6px_rgba(0,0,0,0.7)]",
              desktop ? "text-[15.5px]" : "text-[12.5px]",
              fb.verdict === "hit" ? "border-olive bg-[#e3ecd0] text-ink" : fb.verdict === "decoy" ? "border-[#a35d0c] bg-[#f6e3c4] text-ink" : "border-ink/50 bg-[#efe3c4] text-ink",
            )}
          >
            <b className={cn("mr-1 font-head uppercase tracking-wide", fb.verdict === "hit" ? "text-olive" : fb.verdict === "decoy" ? "text-[#8a4b0c]" : "text-ink-2")}>
              {fb.verdict === "hit" ? "Vạch mặt!" : `Sai hướng (−${WRONG})`}
            </b>
            {fb.text}
          </motion.div>
        )}
      </AnimatePresence>
      {solved && ci === 0 ? (
        <button type="button" onClick={onNext} className="flex h-11 w-full items-center justify-center gap-2 rounded-[3px] border-2 border-[#1d3318] bg-olive font-head text-[16px] font-bold uppercase tracking-wider text-cream shadow-[0_3px_0_#1d3318] active:translate-y-[2px] active:shadow-none sm:h-12 sm:text-[18px]">
          Sang vụ 2 <ChevronRight className="h-5 w-5" />
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 rounded-[3px] bg-black/45 px-2 py-1 font-text text-[12px] leading-tight text-[#f1e2bd] sm:text-[13.5px]">
            {phase !== "play" ? (
              solved ? "Đã vạch mặt kẻ chỉ điểm." : "Hết giờ."
            ) : selS === null && selE === null ? (
              <>Chọn <b>một lời khai</b> và <b>một vật chứng</b> mâu thuẫn với nhau{wrongs ? ` · đã sai ${wrongs} lần` : ""}</>
            ) : (
              <span className="line-clamp-2">
                <b>{selS !== null ? c.suspects[selS].alias : "…"}</b> ↔ <b>{selE !== null ? `vật chứng ${selE + 1}` : "…"}</b>
              </span>
            )}
          </div>
          <button
            type="button"
            data-act="confront"
            disabled={!ready}
            onClick={onConfront}
            className={cn(
              "flex h-11 shrink-0 items-center gap-1.5 rounded-[3px] border-2 px-3 font-head text-[16px] font-bold uppercase tracking-wider transition sm:h-12 sm:px-4 sm:text-[18px]",
              ready ? "border-[#5e120d] bg-stamp text-cream shadow-[0_3px_0_#5e120d] active:translate-y-[2px] active:shadow-none" : "border-ink/30 bg-[#d9cba8] text-ink-3",
            )}
          >
            <ArrowLeftRight className="h-5 w-5" /> Đối chất
          </button>
        </div>
      )}
      <span className="sr-only">
        Điểm tối đa: vụ 1 {CASE_MAX[0]}, vụ 2 {CASE_MAX[1]}.
      </span>
    </div>
  );
}
