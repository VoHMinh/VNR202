"use client";

import { AnimatePresence, motion } from "motion/react";
import { BookOpen, ChevronDown, ChevronRight, EyeOff, Lightbulb, Play, Target, Timer, Trophy } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MISSIONS, TOTAL, isChapterEnd, withName, type DecisionMission, type Mission, type MiniMission } from "@/game/story";
import { tally } from "@/game/scoring";
import { useStory } from "@/game/session";
import { ART } from "@/game/data/art";
import { MINI_GUIDES } from "@/game/data/minis";
import { preloadArt } from "@/components/fx/Film";
import { Btn } from "@/components/kit/Btn";
import { Photo } from "@/components/kit/Photo";
import { Stamp } from "@/components/kit/Stamp";
import { Stopwatch } from "@/components/kit/Stopwatch";
import { Typed } from "@/components/kit/Typed";
import { MiniGameView } from "./MiniGameView";
import { cn } from "@/lib/cn";
import { seededShuffle } from "@/lib/shuffle";
import { sfx } from "@/lib/sfx";

/** Hồ sơ nhiệm vụ: trang trái là ảnh tư liệu, trang phải là nội dung (đọc hồ sơ → làm nhiệm vụ → kết quả). */
export function MissionScreen({ index, phase }: { index: number; phase: "brief" | "ready" | "task" | "result" }) {
  const m = MISSIONS[index];
  const photo = phase === "result" && m.reveal ? m.reveal : m.art;
  // Trò chơi cần bản đồ lớn (màn cuối): lúc chơi dùng cả hai trang hồ sơ, ẩn ảnh tư liệu.
  const wide = phase === "task" && m.kind === "mini" && !!m.wide;
  // Điện thoại: ảnh chỉ hiện lúc đọc hồ sơ; lúc làm nhiệm vụ và xem kết quả nhường chỗ cho nội dung.
  const mobilePhoto = phase === "brief";
  // Tải trước ảnh sẽ cần trong lúc người chơi đọc hồ sơ: bản đồ Hà Nội của hai trò chơi trên bản đồ, ảnh hiện sau khi trả lời.
  useEffect(() => {
    if (m.kind === "mini" && (m.game === "protect" || m.game === "sneak")) new window.Image().src = ART["hanoi-play-1929"].src;
    if (m.reveal) preloadArt([m.reveal], "40vw");
  }, [m]);

  return (
    <motion.section
      key={m.id}
      className="absolute inset-0 flex items-center justify-center px-2 pb-2 pt-1 sm:px-5 sm:pb-5"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="folder relative flex h-full max-h-[760px] w-full max-w-[1120px] flex-col overflow-hidden rounded-[4px] p-2 sm:p-3 lg:flex-row lg:gap-3">
        {/* Gáy hồ sơ */}
        <span aria-hidden className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-black/15 lg:block" />
        <aside className={cn("relative shrink-0 lg:flex lg:h-auto lg:w-[42%] lg:flex-col lg:p-4", mobilePhoto ? "mb-2 h-[30%] min-h-[150px]" : "hidden", wide && "lg:hidden")}>
          <Photo key={photo} id={photo} className="h-full w-full lg:h-[78%]" rotate={-1.2} eager />
          <div className="mt-3 hidden lg:block">
            <div className="font-type text-[12px] text-ink-2">
              {m.date} · {m.place}
            </div>
          </div>
        </aside>
        <div className={cn("sheet relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2px]", wide ? "p-2.5 sm:p-4" : "p-3.5 sm:p-5 lg:p-6")}>
          {!wide && <DossierHeader m={m} index={index} />}
          <AnimatePresence mode="wait">
            {phase === "brief" && <Brief key="brief" m={m} />}
            {phase === "ready" && m.kind === "mini" && <GuideCard key="ready" m={m} />}
            {phase === "task" && m.kind === "decision" && <DecisionTask key="task" m={m} />}
            {phase === "task" && m.kind === "mini" && <MiniTask key="task" m={m} />}
            {phase === "result" && <ResultPanel key="result" m={m} index={index} />}
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  );
}

function DossierHeader({ m, index }: { m: Mission; index: number }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b-2 border-ink/80 pb-2">
      <div className="min-w-0">
        <div className="label text-ink-2">
          Hồ sơ nhiệm vụ số {String(index + 1).padStart(2, "0")}/{TOTAL}
        </div>
        <h2 className="font-head text-[22px] font-bold uppercase leading-tight tracking-wide text-ink sm:text-[28px]">{m.title}</h2>
        <div className="font-type text-[12px] text-ink-2 lg:hidden">
          {m.date} · {m.place}
        </div>
      </div>
      <Stamp ink="red" rotate={8} className="mt-1 shrink-0 text-[15px] sm:text-[18px]">
        Mật
      </Stamp>
    </div>
  );
}

function Brief({ m }: { m: Mission }) {
  const name = useStory((s) => s.session.name);
  const startTask = useStory((s) => s.startTask);
  const prepareTask = useStory((s) => s.prepareTask);
  // Trò chơi nhỏ: sang thẻ cách chơi trước, đồng hồ chỉ chạy khi người chơi bấm Bắt đầu.
  const start = m.kind === "mini" ? prepareTask : startTask;
  const [ready, setReady] = useState(false);
  const paras = m.brief.map((p) => withName(p, name));
  const intro = m.kind === "decision" ? `Nhiệm vụ: chọn cách xử lý đúng. Thời gian: ${m.time} giây.` : "Nhiệm vụ: một trò chơi. Xem cách chơi trước khi bắt đầu tính giờ.";
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pt-3 scrollbar-none">
        {paras.map((p, i) => (
          <p key={i} className="font-text text-[15.5px] leading-relaxed text-ink sm:text-[17px]">
            <Typed text={p} cps={70} delay={i * (paras[0].length / 70 + 0.2)} cursor={i === paras.length - 1} onDone={i === paras.length - 1 ? () => setReady(true) : undefined} />
          </p>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-ink/30 pt-3">
        <span className="font-type text-[12.5px] text-ink-2">{intro}</span>
        <Btn size="lg" onClick={start} className={cn(!ready && "opacity-90")} autoFocus>
          Nhận nhiệm vụ <ChevronRight className="h-5 w-5" />
        </Btn>
      </div>
    </motion.div>
  );
}

function DecisionTask({ m }: { m: DecisionMission }) {
  const name = useStory((s) => s.session.name);
  const playerId = useStory((s) => s.session.playerId);
  const startedAt = useTaskStart();
  // Mỗi người chơi thấy các phương án theo một thứ tự riêng, để đáp án đúng không cố định ở một ô.
  const options = useMemo(() => seededShuffle(m.options, `${playerId || name}:${m.id}`), [m, playerId, name]);
  const submit = useStory((s) => s.submit);
  const [picked, setPicked] = useState<string | null>(null);
  const [away, awayShown] = useAway();
  const choose = (id: string | undefined) => {
    if (picked) return;
    setPicked(id ?? "-");
    submit({ choice: id, ms: Date.now() - startedAt, away: away.current });
  };
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative flex min-h-0 flex-1 select-none flex-col pt-3" onCopy={noCopy} onCut={noCopy} onContextMenu={noCopy}>
      <AwayNotice n={awayShown} />
      <div className="flex items-start gap-3">
        <p className="min-w-0 flex-1 font-text text-[17px] font-semibold leading-snug text-ink sm:text-[20px]">{withName(m.prompt, name)}</p>
        <Stopwatch seconds={m.time} startedAt={startedAt} onExpire={() => choose(undefined)} size={58} />
      </div>
      <div className="mt-3 grid min-h-0 flex-1 content-start gap-2.5 overflow-y-auto pb-1 scrollbar-none">
        {options.map((o, i) => (
          <motion.button
            key={o.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 * i }}
            onClick={() => choose(o.id)}
            disabled={!!picked}
            className={cn(
              "group flex w-full items-start gap-3 rounded-[3px] border-2 border-ink/70 bg-[#f4ecd8] px-3.5 py-3 text-left shadow-[0_3px_0_rgba(31,26,20,0.55)] transition active:translate-y-[2px] active:shadow-none",
              !picked && "hover:-translate-y-0.5 hover:border-stamp hover:bg-[#fbf3df]",
              picked === o.id && "border-stamp bg-[#fbe9d8]",
            )}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-ink font-head text-[15px] font-bold text-ink group-hover:border-stamp group-hover:text-stamp">
              {String.fromCharCode(65 + i)}
            </span>
            <span className="pt-1 font-text text-[15px] leading-snug text-ink sm:text-[16px]">{o.text}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

/** Không cho sao chép, cắt, mở menu chuột phải ở màn làm nhiệm vụ (khó dán câu hỏi sang công cụ khác). */
const noCopy = (e: React.SyntheticEvent) => e.preventDefault();

/**
 * Đếm số lần rời màn hình trò chơi (chuyển tab, chuyển ứng dụng) trong lúc làm nhiệm vụ.
 * Con số được gửi kèm kết quả; ở phòng lớp, màn chiếu của chủ phòng sẽ thấy.
 */
function useAway() {
  const count = useRef(0);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let away = false;
    const leave = () => {
      if (away) return;
      away = true;
      count.current += 1;
    };
    const back = () => {
      if (!away) return;
      away = false;
      setShown(count.current);
    };
    const onVis = () => (document.visibilityState === "hidden" ? leave() : back());
    window.addEventListener("blur", leave);
    window.addEventListener("focus", back);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("blur", leave);
      window.removeEventListener("focus", back);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return [count, shown] as const;
}

/** Nhắc người chơi (phòng lớp) khi vừa quay lại sau khi rời màn hình trò chơi. */
function AwayNotice({ n }: { n: number }) {
  const room = useStory((s) => s.session.room);
  if (!room || n === 0) return null;
  return (
    <motion.div
      key={n}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-none absolute inset-x-2 top-1 z-20 flex items-center gap-2 rounded-[3px] bg-[#1f1a14]/90 px-2.5 py-1.5 font-text text-[12.5px] leading-snug text-[#ffd77a] shadow-[0_6px_14px_rgba(0,0,0,0.5)] sm:text-[13.5px]"
    >
      <EyeOff className="h-4 w-4 shrink-0" /> Bạn đã rời màn hình trò chơi {n} lần trong nhiệm vụ này. Màn chiếu của chủ phòng sẽ thấy số lần này.
    </motion.div>
  );
}

/** Mốc bắt đầu nhiệm vụ, giữ nguyên trong suốt lúc nhiệm vụ còn hiện (cả khi đang mờ dần sau khi nộp). */
function useTaskStart() {
  const stored = useStory((s) => s.taskStartedAt);
  const [startedAt] = useState(() => stored ?? Date.now());
  return startedAt;
}

/** Tô nổi bật phần chữ nằm trong **...** của thẻ cách chơi. */
function Rich({ text }: { text: string }) {
  return text.split("**").map((part, i) =>
    i % 2 ? (
      <mark key={i} className="rounded-[2px] bg-gold/50 px-0.5 font-semibold text-ink">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/** Thẻ cách chơi hiện trước trò chơi nhỏ; đồng hồ chỉ bắt đầu chạy khi bấm Bắt đầu. */
function GuideCard({ m }: { m: MiniMission }) {
  const start = useStory((s) => s.startTask);
  const g = MINI_GUIDES[m.game];
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex min-h-0 flex-1 flex-col pt-3 short:pt-2">
      <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-color:rgba(31,26,20,0.4)_transparent] [scrollbar-width:thin]">
        <div className="label text-stamp">Cách chơi</div>
        <div className="mt-1 flex items-start gap-2.5 rounded-[3px] bg-gold px-3 py-2 text-ink shadow-[0_2px_0_rgba(31,26,20,0.35)] short:py-1.5 sm:py-2.5">
          <Target className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="font-head text-[15.5px] font-bold leading-snug short:text-[14.5px] sm:text-[18px] lg:text-[20px]">{g.goal}</p>
        </div>
        <ol className="mt-2.5 space-y-2 short:mt-2 short:space-y-1.5 sm:mt-3 sm:space-y-2.5 lg:space-y-3.5">
          {g.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-stamp font-head text-[14px] font-bold text-cream sm:h-7 sm:w-7 sm:text-[15px]">{i + 1}</span>
              <p className="font-text text-[14.5px] leading-snug text-ink short:text-[13.5px] sm:pt-0.5 sm:text-[16px] lg:text-[17.5px]">
                <Rich text={step} />
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-2.5 flex items-start gap-2 font-text text-[13.5px] leading-snug text-ink-2 short:mt-2 short:text-[12.5px] sm:mt-3 sm:text-[14px] lg:mt-4 lg:text-[15.5px]">
          <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-[#a0710c]" /> {g.win}
        </p>
        {g.tip && (
          <p className="mt-2 flex items-start gap-2 rounded-[3px] border border-dashed border-ink/40 bg-white/30 px-3 py-1.5 font-text text-[13.5px] italic leading-snug text-ink short:mt-1.5 short:py-1 short:text-[12.5px] sm:py-2 sm:text-[14px] lg:text-[15.5px]">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-stamp" /> {g.tip}
          </p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-ink/30 pt-3">
        <span className="flex items-center gap-1.5 font-text text-[13px] text-ink-2">
          <Timer className="h-4 w-4 shrink-0" /> {m.time} giây · đồng hồ chỉ chạy khi bạn bấm Bắt đầu
        </span>
        <Btn size="lg" onClick={start} autoFocus>
          Bắt đầu <Play className="h-5 w-5" />
        </Btn>
      </div>
    </motion.div>
  );
}

function MiniTask({ m }: { m: MiniMission }) {
  const startedAt = useTaskStart();
  const submit = useStory((s) => s.submit);
  const [over, setOver] = useState(false);
  const [away, awayShown] = useAway();
  const finish = (score: number) => {
    if (over) return;
    setOver(true);
    submit({ mini: score, ms: Date.now() - startedAt, away: away.current });
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn("relative flex min-h-0 flex-1 select-none flex-col", m.wide ? "pt-0" : "pt-2.5")} onCopy={noCopy} onCut={noCopy} onContextMenu={noCopy}>
      <AwayNotice n={awayShown} />
      <div className="flex items-center gap-3">
        {m.wide && <span className="hidden shrink-0 font-head text-[20px] font-bold uppercase tracking-wide text-ink sm:inline">{m.title}</span>}
        <p
          className={cn(
            "flex min-w-0 flex-1 items-start gap-2 rounded-[3px] border-l-4 border-stamp bg-gold/85 px-2.5 py-1.5 font-text font-semibold leading-snug text-ink shadow-[0_1px_0_rgba(31,26,20,0.3)]",
            m.wide ? "text-[12px] sm:text-[13.5px]" : "text-[13px] sm:text-[14.5px]",
          )}
        >
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-stamp" />
          <span className={m.wide ? "line-clamp-2" : "line-clamp-3"}>{m.howto}</span>
        </p>
        <Stopwatch seconds={m.time} startedAt={startedAt} size={m.wide ? 46 : 54} />
      </div>
      <div className={cn("relative min-h-0 flex-1 overflow-hidden rounded-[3px] bg-[#1d150e] shadow-[inset_0_0_0_2px_rgba(31,26,20,0.8)]", m.wide ? "mt-1.5" : "mt-2.5")}>
        <MiniGameView game={m.game} seconds={m.time} startedAt={startedAt} onFinish={finish} />
      </div>
    </motion.div>
  );
}

function ResultPanel({ m, index }: { m: Mission; index: number }) {
  const answers = useStory((s) => s.answers);
  const name = useStory((s) => s.session.name);
  const next = useStory((s) => s.next);
  const [more, setMore] = useState(false);
  const t = useMemo(() => tally(answers), [answers]);
  const r = t.results[index];
  const a = answers[index];
  const ok = r?.ok;
  useEffect(() => {
    if (ok === undefined) return;
    const id = setTimeout(() => {
      sfx.stamp();
      if (ok) sfx.correct();
      else sfx.wrong();
    }, 120);
    return () => clearTimeout(id);
  }, [ok]);
  if (!r || !a) return null;
  const chosen = m.kind === "decision" ? m.options.find((o) => o.id === a.choice) : undefined;
  const right = m.kind === "decision" ? m.options.find((o) => o.correct) : undefined;
  const outcome = m.kind === "decision" ? (chosen ? chosen.outcome : "Hết giờ mà bạn chưa quyết định. Cơ hội đã trôi qua.") : r.ok ? m.win : m.lose;
  const lines: [string, number][] =
    m.kind === "decision"
      ? r.ok
        ? [
            ["Trả lời đúng", r.base],
            [`Tốc độ (${(Math.min(a.ms, m.time * 1000) / 1000).toFixed(1)} giây)`, r.speed],
          ]
        : [[chosen ? "Chưa đúng" : "Hết giờ", 0]]
      : [["Kết quả nhiệm vụ", r.base]];
  if (r.streakBonus) lines.push([`Chuỗi ×${r.streak}`, r.streakBonus]);
  const end = isChapterEnd(index);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative flex min-h-0 flex-1 flex-col pt-3">
      <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-color:rgba(31,26,20,0.4)_transparent] [scrollbar-width:thin]">
        <div className="flex flex-wrap items-center gap-4">
          <Stamp ink={r.ok ? "green" : "red"} rotate={-6} className="text-[26px] sm:text-[32px]">
            {r.ok ? "Hoàn thành" : "Thất bại"}
          </Stamp>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="font-head text-[34px] font-bold leading-none text-ink">
            +{r.points.toLocaleString("vi-VN")}
            <span className="ml-1 text-[14px] font-medium uppercase tracking-wider text-ink-2">điểm</span>
          </motion.div>
        </div>
        <div className="mt-3 max-w-md space-y-0.5 font-type text-[13px] text-ink">
          {lines.map(([label, v]) => (
            <div key={label} className="flex justify-between gap-6 border-b border-dotted border-ink/30 py-0.5">
              <span>{label}</span>
              <span className="tabular-nums">+{v.toLocaleString("vi-VN")}</span>
            </div>
          ))}
          {!r.ok && m.kind === "decision" && right && (
            <div className="pt-1.5 text-ink-2">
              Đáp án đúng: <b className="text-ink">{right.text}</b>
            </div>
          )}
        </div>
        <p className="mt-3 border-l-4 border-ink/70 pl-3 font-text text-[15.5px] italic leading-relaxed text-ink">{withName(outcome, name)}</p>
        <div className="mt-3 rounded-[2px] bg-[#efe3c6] p-3 shadow-[inset_0_0_0_1px_rgba(31,26,20,0.15)]">
          <div className="label flex items-center gap-1.5 text-stamp">
            <BookOpen className="h-3.5 w-3.5" /> Tư liệu lịch sử
          </div>
          <p className="mt-1 font-text text-[14px] leading-relaxed text-ink">{m.fact}</p>
          <p className="mt-1.5 font-type text-[12.5px] leading-snug text-ink">
            <b>Cơ chế phục hồi:</b> {m.mechanism}
          </p>
          <button onClick={() => setMore((v) => !v)} className="mt-1.5 flex items-center gap-1 font-head text-[12px] uppercase tracking-wider text-ink-2 hover:text-ink">
            Nguồn <ChevronDown className={cn("h-3.5 w-3.5 transition", more && "rotate-180")} />
          </button>
          {more && (
            <ul className="mt-1 space-y-0.5 font-type text-[11px] leading-snug text-ink-2">
              {m.sources.map((s) => (
                <li key={s.label}>{s.url ? <a className="underline" href={s.url} target="_blank" rel="noreferrer">{s.label}</a> : s.label}</li>
              ))}
              <li>
                Ảnh: {ART[m.art].caption}. {ART[m.art].credit}; <a className="underline" href={ART[m.art].page} target="_blank" rel="noreferrer">{ART[m.art].license ?? "phạm vi công cộng"}</a>.
              </li>
            </ul>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-dashed border-ink/30 pt-3">
        <span className="font-type text-[12.5px] text-ink-2">Tổng điểm: {t.total.toLocaleString("vi-VN")}</span>
        <Btn size="lg" onClick={next} autoFocus>
          {end ? (index === MISSIONS.length - 1 ? "Kết thúc chương" : "Xem bảng xếp hạng") : "Nhiệm vụ tiếp"} <ChevronRight className="h-5 w-5" />
        </Btn>
      </div>
    </motion.div>
  );
}
