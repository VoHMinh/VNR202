"use client";

import { AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStory } from "@/game/session";
import { Btn } from "@/components/kit/Btn";
import { SheetModal } from "@/components/kit/Sheet";
import { ChapterIntro, Finale, Prologue } from "./Cinema";
import { FinalScreen } from "./Final";
import { Hud } from "./Hud";
import { Lobby } from "./Lobby";
import { MissionScreen } from "./Mission";
import { Rules } from "./Rules";
import { ChapterBoard } from "./Standings";

/** Điều phối các màn của một lượt chơi theo `phase`. */
export function PlayApp() {
  const phase = useStory((s) => s.phase);
  const index = useStory((s) => s.index);
  const room = useStory((s) => s.session.room);
  const endByHost = useStory((s) => s.endByHost);
  const router = useRouter();
  const [help, setHelp] = useState(false);
  const [exit, setExit] = useState(false);
  const hud = phase === "brief" || phase === "ready" || phase === "task" || phase === "result" || phase === "board";

  // Đang chơi trong phòng: nếu chủ phòng kết thúc trận thì chuyển sang tổng kết.
  useEffect(() => {
    if (!room || phase === "lobby" || phase === "done") return;
    let alive = true;
    const id = setInterval(async () => {
      const res = await fetch(`/api/rooms/${encodeURIComponent(room)}`, { cache: "no-store" }).catch(() => null);
      const data = res?.ok ? await res.json() : null;
      if (alive && data?.status === "ended") endByHost("Chủ phòng đã kết thúc trận");
    }, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [room, phase, endByHost]);

  let screen: React.ReactNode = null;
  if (phase === "lobby") screen = <Lobby key="lobby" />;
  else if (phase === "prologue") screen = <Prologue key="prologue" />;
  else if (phase === "chapter") screen = <ChapterIntro key={`ch-${index}`} />;
  else if (phase === "brief" || phase === "ready" || phase === "task" || phase === "result") screen = <MissionScreen key={`m-${index}`} index={index} phase={phase} />;
  else if (phase === "board") screen = <ChapterBoard key={`b-${index}`} index={index} />;
  else if (phase === "finale") screen = <Finale key="finale" />;
  else if (phase === "done") screen = <FinalScreen key="done" />;

  return (
    <main className="desk relative flex h-dvh flex-col overflow-hidden text-cream">
      {hud && <Hud onHelp={() => setHelp(true)} onExit={() => setExit(true)} />}
      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait">{screen}</AnimatePresence>
      </div>
      <SheetModal open={help} onClose={() => setHelp(false)} label="Cách chơi" className="p-5 sm:p-7">
        <Rules />
        <Btn className="mt-5 w-full" onClick={() => setHelp(false)}>
          Tiếp tục chơi
        </Btn>
      </SheetModal>
      <SheetModal open={exit} onClose={() => setExit(false)} label="Về trang chủ" className="max-w-[400px] p-5">
        <h2 className="font-head text-[22px] font-bold uppercase tracking-wide text-ink">Rời trận?</h2>
        <p className="mt-1.5 font-text text-[14.5px] leading-snug text-ink-2">Tiến độ được giữ trong thẻ trình duyệt này; mở lại trang chơi là chơi tiếp được.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Btn tone="paper" onClick={() => setExit(false)} autoFocus>
            Ở lại
          </Btn>
          <Btn tone="red" onClick={() => router.push("/")}>
            Về trang chủ
          </Btn>
        </div>
      </SheetModal>
    </main>
  );
}
