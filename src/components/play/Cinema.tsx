"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { ART } from "@/game/data/art";
import { CHAPTERS, FINALE, PROLOGUE, chapterOf, MISSIONS, withName } from "@/game/story";
import { useStory } from "@/game/session";
import { FilmImage, PULL_OUT, PUSH_IN, preloadArt } from "@/components/fx/Film";
import { Btn } from "@/components/kit/Btn";
import { PartyFlag } from "@/components/kit/PartyFlag";
import { Typed } from "@/components/kit/Typed";
import { Rules } from "./Rules";

/** Khung chiếu phim: ảnh tư liệu phủ kín, tối dần về phía chữ, hai dải đen trên dưới. */
function Frame({ art, children, i = 0 }: { art: keyof typeof ART; children: React.ReactNode; i?: number }) {
  return (
    <motion.section
      key={art + i}
      className="absolute inset-0 overflow-hidden bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <FilmImage id={art} tone="sepia" camera={i % 2 ? PUSH_IN : PULL_OUT} duration={14} eager />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_90%_at_50%_40%,transparent_35%,rgba(0,0,0,0.75)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black via-black/70 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-[7vh] bg-black" />
      <div className="absolute inset-x-0 bottom-0 h-[7vh] bg-black" />
      <span className="absolute right-4 top-[7vh] mt-2 max-w-[60vw] text-right font-type text-[10.5px] text-cream/45 sm:right-8" title={ART[art].credit}>
        Ảnh tư liệu: {ART[art].short ?? ART[art].caption}
      </span>
      {children}
    </motion.section>
  );
}

export function Prologue() {
  const step = useStory((s) => s.step);
  const name = useStory((s) => s.session.name);
  const next = useStory((s) => s.nextPrologue);
  const [typedStep, setTypedStep] = useState(-1);
  const typed = typedStep === step;
  useEffect(() => {
    preloadArt(PROLOGUE.map((p) => p.art));
    preloadArt([CHAPTERS[0].art, MISSIONS[0].art]);
  }, []);

  if (step >= PROLOGUE.length) {
    return (
      <motion.section className="absolute inset-0 grid place-items-center px-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div initial={{ y: 30, rotate: -2 }} animate={{ y: 0, rotate: -0.8 }} className="sheet w-full max-w-[520px] rounded-[3px] p-5 sm:p-7">
          <Rules />
          <Btn className="mt-5 w-full" size="lg" onClick={next} autoFocus>
            Vào chương I <ChevronRight className="h-5 w-5" />
          </Btn>
        </motion.div>
      </motion.section>
    );
  }

  const panel = PROLOGUE[step];
  return (
    <AnimatePresence mode="wait">
      <Frame art={panel.art} i={step} key={step}>
        <div className="absolute inset-x-0 bottom-[7vh] mx-auto max-w-4xl px-5 pb-8 sm:px-10 sm:pb-12">
          <div className="label mb-3 text-gold/80">
            Mở đầu · {step + 1}/{PROLOGUE.length}
          </div>
          <p className="min-h-[5.5em] font-text text-[21px] italic leading-relaxed text-cream [text-shadow:0_2px_10px_rgba(0,0,0,0.85)] sm:text-[28px]">
            <Typed text={withName(panel.text, name)} cps={48} onDone={() => setTypedStep(step)} />
          </p>
          <div className="mt-5 flex items-center gap-3">
            <Btn size="lg" onClick={next} className={typed ? "" : "opacity-80"} autoFocus>
              Tiếp <ChevronRight className="h-5 w-5" />
            </Btn>
            <button onClick={() => useStory.setState({ step: PROLOGUE.length })} className="font-head text-[13px] uppercase tracking-wider text-cream/55 hover:text-cream">
              Bỏ qua phần mở đầu
            </button>
          </div>
        </div>
      </Frame>
    </AnimatePresence>
  );
}

export function ChapterIntro() {
  const index = useStory((s) => s.index);
  const next = useStory((s) => s.afterChapter);
  const ch = chapterOf(MISSIONS[index].chapter);
  useEffect(() => preloadArt([MISSIONS[index].art]), [index]);
  return (
    <Frame art={ch.art} i={ch.no}>
      <div className="absolute inset-x-0 bottom-[7vh] mx-auto max-w-5xl px-5 pb-8 sm:px-10 sm:pb-14">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="flex items-center gap-3">
          <span className="h-[3px] w-12 bg-party" />
          <span className="font-head text-[15px] font-semibold uppercase tracking-[0.3em] text-gold">
            Chương {ch.roman} · {ch.years}
          </span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 30, letterSpacing: "0.2em" }}
          animate={{ opacity: 1, y: 0, letterSpacing: "0.02em" }}
          transition={{ delay: 0.5, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="press mt-2 font-head text-[clamp(2.6rem,9vw,6.5rem)] font-bold uppercase leading-[1.02] text-cream"
        >
          {ch.title}
        </motion.h1>
        <div className="mt-4 max-w-2xl space-y-2 font-text text-[17px] leading-relaxed text-cream/90 sm:text-[19px]">
          {ch.intro.map((line, i) => (
            <p key={i}>
              <Typed text={line} cps={60} delay={1.2 + i * 1.6} cursor={false} />
            </p>
          ))}
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }} className="mt-6">
          <Btn size="lg" onClick={next} autoFocus>
            Mở hồ sơ nhiệm vụ <ChevronRight className="h-5 w-5" />
          </Btn>
        </motion.div>
      </div>
    </Frame>
  );
}

export function Finale() {
  const step = useStory((s) => s.step);
  const done = useStory((s) => s.afterFinale);
  const panel = FINALE[Math.min(step, FINALE.length - 1)];
  const last = step >= FINALE.length - 1;
  return (
    <AnimatePresence mode="wait">
      <Frame art={panel.art} i={step} key={step}>
        <div className="absolute right-[6vw] top-[14vh] hidden sm:block">
          <PartyFlag width={260} />
        </div>
        <div className="absolute left-5 top-[calc(7vh+14px)] sm:hidden">
          <PartyFlag width={150} />
        </div>
        <div className="absolute inset-x-0 bottom-[7vh] mx-auto max-w-4xl px-5 pb-8 sm:px-10 sm:pb-12">
          <div className="label mb-3 text-gold/80">Đại hội I · Ma Cao, 3/1935</div>
          <p className="min-h-[4.5em] font-text text-[21px] italic leading-relaxed text-cream [text-shadow:0_2px_10px_rgba(0,0,0,0.85)] sm:text-[28px]">
            <Typed text={panel.text} cps={48} />
          </p>
          <Btn size="lg" className="mt-5" onClick={() => (last ? done() : useStory.setState({ step: step + 1 }))} autoFocus>
            {last ? "Xem kết quả" : "Tiếp"} <ChevronRight className="h-5 w-5" />
          </Btn>
        </div>
      </Frame>
    </AnimatePresence>
  );
}
