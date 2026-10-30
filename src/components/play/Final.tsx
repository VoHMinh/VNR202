"use client";

import confetti from "canvas-confetti";
import { motion } from "motion/react";
import { AnimatePresence } from "motion/react";
import { Download, FileImage, Home, Loader2, RotateCcw, Trophy, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MISSIONS, titleFor } from "@/game/story";
import { MAX_SCORE, tally } from "@/game/scoring";
import { useStory } from "@/game/session";
import { CountUp } from "@/components/fx/Motion";
import { Btn } from "@/components/kit/Btn";
import { PartyFlag } from "@/components/kit/PartyFlag";
import { Stamp } from "@/components/kit/Stamp";
import { Leaderboard, useRoom } from "./Standings";
import { POSTER_H, POSTER_W, Poster } from "./Poster";
import { cn } from "@/lib/cn";

/** Hồ sơ khép lại: tổng điểm, danh hiệu, hạng trong phòng, từng nhiệm vụ. */
export function FinalScreen() {
  const answers = useStory((s) => s.answers);
  const session = useStory((s) => s.session);
  const notice = useStory((s) => s.notice);
  const restart = useStory((s) => s.restart);
  const router = useRouter();
  const t = useMemo(() => tally(answers), [answers]);
  const title = titleFor(t.total);
  const { room } = useRoom(session.room, 4000);
  const me = room?.players.find((p) => p.id === session.playerId);
  const [poster, setPoster] = useState(false);

  useEffect(() => {
    if (t.total < 6000) return;
    const id = setTimeout(() => confetti({ particleCount: 90, spread: 80, origin: { y: 0.35 }, colors: ["#d42a1e", "#f4c430", "#f1e7d0"] }), 700);
    return () => clearTimeout(id);
  }, [t.total]);

  return (
    <motion.section className="absolute inset-0 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="mx-auto flex h-full max-w-[1100px] flex-col gap-3 px-3 py-3 lg:flex-row lg:items-center lg:gap-6 lg:px-6">
        <motion.div initial={{ y: 30, rotate: -2 }} animate={{ y: 0, rotate: -0.6 }} className="sheet relative flex min-h-0 flex-col rounded-[3px] p-4 sm:p-6 lg:w-[52%]">
          <div className="flex items-start justify-between gap-3 border-b-2 border-ink/80 pb-2">
            <div>
              <div className="label text-ink-2">Hồ sơ giao liên · bí danh {session.name}</div>
              <h2 className="font-head text-[26px] font-bold uppercase leading-tight tracking-wide text-ink sm:text-[32px]">Hồ sơ khép lại</h2>
            </div>
            <Stamp ink="red" rotate={9} delay={0.4} className="text-[16px]">
              Tối mật
            </Stamp>
          </div>
          {notice && <p className="mt-2 rounded-[2px] bg-stamp/10 px-3 py-2 font-type text-[12.5px] text-stamp">{notice}. Điểm của bạn đã được chốt.</p>}
          <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
            <div>
              <div className="label text-ink-2">Tổng điểm</div>
              <CountUp to={t.total} className="font-head text-[56px] font-bold leading-none text-ink" />
              <span className="ml-1 font-type text-[12px] text-ink-2">/ {MAX_SCORE.toLocaleString("vi-VN")}</span>
            </div>
            {me && (
              <div>
                <div className="label text-ink-2">Hạng trong phòng</div>
                <div className="font-head text-[40px] font-bold leading-none text-stamp">
                  {me.rank}
                  <span className="text-[18px] text-ink-2">/{room!.players.length}</span>
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 rounded-[2px] bg-[#efe3c6] p-3 shadow-[inset_0_0_0_1px_rgba(31,26,20,0.15)]">
            <div className="label text-stamp">Danh hiệu</div>
            <div className="font-head text-[22px] font-bold uppercase tracking-wide text-ink">{title.name}</div>
            <p className="font-text text-[14px] leading-snug text-ink-2">{title.desc}</p>
          </div>
          <div className="mt-3 grid grid-cols-10 gap-1">
            {MISSIONS.map((m, i) => {
              const r = t.results[i];
              return (
                <div
                  key={m.id}
                  title={`${m.title}: ${r ? `+${r.points}` : "chưa làm"}`}
                  className={cn("grid h-7 place-items-center rounded-[2px] font-head text-[12px] font-bold sm:h-8", r?.ok ? "bg-olive text-cream" : r ? "bg-stamp text-cream" : "bg-ink/10 text-ink-3")}
                >
                  {i + 1}
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 font-type text-[12px] text-ink-2">
            Hoàn thành {t.correct}/{MISSIONS.length} nhiệm vụ · chuỗi dài nhất ×{t.bestStreak}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Btn tone="ink" className="col-span-2" onClick={() => setPoster(true)}>
              <FileImage className="h-4 w-4" /> Sơ đồ tiến trình (poster)
            </Btn>
            <Btn tone="red" onClick={restart}>
              <RotateCcw className="h-4 w-4" /> Chơi lại
            </Btn>
            <Btn tone="paper" onClick={() => router.push("/")}>
              <Home className="h-4 w-4" /> Trang chủ
            </Btn>
          </div>
        </motion.div>

        <div className="flex min-h-0 flex-1 flex-col">
          {session.room ? (
            <div className="flex min-h-0 flex-1 flex-col rounded-[3px] bg-black/35 p-4 ring-1 ring-cream/10">
              <div className="label flex items-center gap-2 text-gold">
                <Trophy className="h-4 w-4" /> Bảng xếp hạng phòng {session.room}
              </div>
              <div className="mt-2 min-h-0 flex-1 overflow-y-auto scrollbar-none">
                {room ? <Leaderboard players={room.players} me={session.playerId} limit={8} dark /> : <p className="font-type text-[13px] text-cream/60">Đang tải…</p>}
              </div>
              <p className="mt-2 font-type text-[11.5px] text-cream/55">Bảng tự cập nhật khi các bạn khác chơi xong.</p>
            </div>
          ) : (
            <div className="hidden flex-1 items-center justify-center lg:flex">
              <PartyFlag width={360} />
            </div>
          )}
        </div>
      </div>
      <AnimatePresence>{poster && <PosterView name={session.name} onClose={() => setPoster(false)} />}</AnimatePresence>
    </motion.section>
  );
}

/** Xem trước và tải sơ đồ tiến trình dạng ảnh PNG. */
function PosterView({ name, onClose }: { name: string; onClose: () => void }) {
  const answers = useStory((s) => s.answers);
  const t = useMemo(() => tally(answers), [answers]);
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [scale, setScale] = useState(0.4);
  useEffect(() => {
    const fit = () => setScale(Math.min((window.innerHeight - 120) / POSTER_H, (window.innerWidth - 32) / POSTER_W, 0.62));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const download = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      const { domToPng } = await import("modern-screenshot");
      const url = await domToPng(ref.current, { scale: 2, width: POSTER_W, height: POSTER_H, backgroundColor: "#e9ddc1" });
      const a = document.createElement("a");
      a.href = url;
      a.download = `mach-ngam-so-do-tien-trinh-${(name || "poster").replace(/\s+/g, "-")}.png`;
      a.click();
    } finally {
      setBusy(false);
    }
  };
  return (
    <motion.div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/80 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="overflow-hidden shadow-2xl" style={{ width: POSTER_W * scale, height: POSTER_H * scale }} onClick={(e) => e.stopPropagation()}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: POSTER_W }}>
          <Poster ref={ref} name={name} t={t} />
        </div>
      </div>
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <Btn onClick={download} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Tải ảnh PNG
        </Btn>
        <Btn tone="paper" onClick={onClose}>
          <X className="h-4 w-4" /> Đóng
        </Btn>
      </div>
    </motion.div>
  );
}
