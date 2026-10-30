"use client";

import { AnimatePresence, motion } from "motion/react";
import { CircleHelp, Home, Volume2, VolumeX } from "lucide-react";
import { useMemo } from "react";
import { MISSIONS, chapterOf } from "@/game/story";
import { tally } from "@/game/scoring";
import { useStory } from "@/game/session";
import { NumberTicker } from "@/components/fx/Motion";
import { cn } from "@/lib/cn";
import { setMuted, useMuted } from "@/lib/sfx";

/** Thanh trên cùng: chương, tiến độ các nhiệm vụ, chuỗi, hạng trong phòng và điểm. */
export function Hud({ onHelp, onExit }: { onHelp: () => void; onExit: () => void }) {
  const index = useStory((s) => s.index);
  const answers = useStory((s) => s.answers);
  const rank = useStory((s) => s.rank);
  const room = useStory((s) => s.session.room);
  const t = useMemo(() => tally(answers), [answers]);
  const muted = useMuted();
  const ch = chapterOf(MISSIONS[Math.min(index, MISSIONS.length - 1)].chapter);

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-2 px-3 sm:h-16 sm:gap-4 sm:px-6">
      <div className="min-w-0 flex-1 sm:flex-none">
        <div className="label truncate text-gold/90">
          Chương {ch.roman} · {ch.years}
        </div>
        <div className="truncate font-head text-[15px] font-medium uppercase tracking-wide text-cream sm:text-[17px]">{ch.title}</div>
      </div>

      <ol className="mx-auto hidden items-center gap-[3px] lg:flex" aria-label="Tiến độ nhiệm vụ">
        {MISSIONS.map((m, i) => {
          const r = t.results[i];
          const current = i === t.done && i <= index;
          return (
            <li
              key={m.id}
              title={`Nhiệm vụ ${i + 1}: ${m.title}`}
              className={cn(
                "grid h-[15px] w-[15px] place-items-center rounded-[2px] border font-head text-[9px] font-bold leading-none transition xl:h-[17px] xl:w-[17px] xl:text-[10px]",
                r?.ok && "border-olive bg-olive text-cream",
                r && !r.ok && "border-stamp bg-stamp text-cream",
                !r && current && "border-gold text-gold",
                !r && !current && "border-cream/25 text-cream/35",
                i > 0 && MISSIONS[i - 1].chapter !== m.chapter && "ml-2",
              )}
            >
              {r ? (r.ok ? "✓" : "✕") : current ? i + 1 : ""}
            </li>
          );
        })}
      </ol>
      <div className="font-head text-[13px] text-cream/70 lg:hidden">
        {Math.min(t.done + 1, MISSIONS.length)}/{MISSIONS.length}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <AnimatePresence>
          {t.streak >= 2 && (
            <motion.span
              key={t.streak}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="hidden rounded-[3px] bg-gold px-2 py-1 font-head text-[12px] font-bold uppercase tracking-wide text-ink sm:inline-block"
              title="Hoàn thành liên tiếp: thưởng thêm điểm"
            >
              Chuỗi ×{t.streak}
            </motion.span>
          )}
        </AnimatePresence>
        {room && rank && (
          <span className="whitespace-nowrap rounded-[3px] border border-cream/30 px-1.5 py-1 font-head text-[12px] font-semibold uppercase tracking-wide text-cream sm:px-2" title="Hạng hiện tại trong phòng">
            Hạng {rank.rank}/{rank.of}
          </span>
        )}
        <div className="flex h-10 items-center gap-2 rounded-[4px] bg-[#0d0906] px-2.5 shadow-[inset_0_0_0_1px_rgba(244,196,48,0.35),0_4px_10px_rgba(0,0,0,0.5)] sm:h-11 sm:px-3">
          <span className="label text-gold/80">Điểm</span>
          <NumberTicker value={t.total} className="min-w-[3.2ch] text-right font-head text-[20px] font-bold leading-none text-cream sm:text-[22px]" />
        </div>
        <button
          onClick={() => setMuted(!muted)}
          aria-label={muted ? "Bật âm thanh" : "Tắt âm thanh"}
          title={muted ? "Bật âm thanh" : "Tắt âm thanh"}
          className="grid h-8 w-8 place-items-center rounded-full text-cream/75 transition hover:bg-white/5 hover:text-cream sm:h-9 sm:w-9"
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
        <button onClick={onHelp} aria-label="Cách chơi" title="Cách chơi" className="grid h-8 w-8 place-items-center sm:h-9 sm:w-9 rounded-full text-cream/75 transition hover:bg-white/5 hover:text-cream">
          <CircleHelp className="h-5 w-5" />
        </button>
        <button onClick={onExit} aria-label="Về trang chủ" title="Về trang chủ" className="hidden h-9 w-9 place-items-center rounded-full text-cream/75 transition hover:bg-white/5 hover:text-cream sm:grid">
          <Home className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
