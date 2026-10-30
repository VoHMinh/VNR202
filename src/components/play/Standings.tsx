"use client";

import { motion } from "motion/react";
import { ChevronRight, Crown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MISSIONS, chapterOf, withName } from "@/game/story";
import { tally } from "@/game/scoring";
import { useStory } from "@/game/session";
import { Btn } from "@/components/kit/Btn";
import { Stamp } from "@/components/kit/Stamp";
import { Typed } from "@/components/kit/Typed";
import { cn } from "@/lib/cn";

export interface RoomPlayer {
  id: string;
  name: string;
  total: number;
  done: number;
  correct: number;
  rank: number;
  finished: boolean;
}

export interface RoomView {
  code: string;
  title: string;
  status: "lobby" | "playing" | "ended";
  total: number;
  players: RoomPlayer[];
}

/** Hỏi trạng thái phòng định kỳ. */
export function useRoom(code: string | null, every = 3000) {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!code) return;
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/rooms/${encodeURIComponent(code)}`, { cache: "no-store" });
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) setError(data.error ?? "Không tải được phòng");
        else {
          setRoom(data);
          setError(null);
        }
      } catch {
        if (alive) setError("Mất kết nối, đang thử lại…");
      }
    };
    load();
    const id = setInterval(load, every);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [code, every]);
  return { room, error };
}

/** Bảng xếp hạng kiểu tờ danh sách đánh máy. */
export function Leaderboard({ players, me, limit = 5, dark = false }: { players: RoomPlayer[]; me?: string; limit?: number; dark?: boolean }) {
  const top = players.slice(0, limit);
  const mine = players.find((p) => p.id === me);
  const showMine = mine && mine.rank > limit;
  return (
    <ol className="space-y-1">
      {top.map((p, i) => (
        <Row key={p.id} p={p} me={p.id === me} dark={dark} delay={i * 0.06} />
      ))}
      {showMine && (
        <>
          <li className={cn("text-center font-type text-[12px]", dark ? "text-cream/40" : "text-ink-3")}>· · ·</li>
          <Row p={mine} me dark={dark} delay={0.3} />
        </>
      )}
    </ol>
  );
}

function Row({ p, me, dark, delay }: { p: RoomPlayer; me: boolean; dark: boolean; delay: number }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className={cn(
        "flex items-center gap-3 rounded-[2px] px-3 py-2",
        dark ? "bg-white/[0.05] text-cream" : "bg-[#f3e9d2] text-ink shadow-[inset_0_0_0_1px_rgba(31,26,20,0.12)]",
        me && (dark ? "ring-2 ring-gold" : "ring-2 ring-stamp"),
      )}
    >
      <span className={cn("w-7 text-center font-head text-[18px] font-bold", p.rank === 1 ? "text-gold" : dark ? "text-cream/60" : "text-ink-2")}>
        {p.rank === 1 ? <Crown className="mx-auto h-5 w-5" /> : p.rank}
      </span>
      <span className="min-w-0 flex-1 truncate font-type text-[14px] font-bold">
        {p.name}
        {me && <span className={cn("ml-1.5 font-normal", dark ? "text-gold" : "text-stamp")}>(bạn)</span>}
      </span>
      <span className={cn("hidden font-type text-[12px] sm:inline", dark ? "text-cream/55" : "text-ink-2")}>
        {p.done}/{MISSIONS.length} nhiệm vụ
      </span>
      <span className="w-20 text-right font-head text-[19px] font-bold tabular-nums">{p.total.toLocaleString("vi-VN")}</span>
    </motion.li>
  );
}

/** Hết mỗi chương: lời kết chương, rồi bảng xếp hạng (phòng lớp) hoặc tổng kết chương (chơi một mình). */
/** Bảng cuối chương. `index` là nhiệm vụ cuối của chương, truyền từ ngoài vào để bảng giữ nguyên nội dung lúc mờ dần. */
export function ChapterBoard({ index }: { index: number }) {
  const answers = useStory((s) => s.answers);
  const session = useStory((s) => s.session);
  const afterBoard = useStory((s) => s.afterBoard);
  const ch = chapterOf(MISSIONS[index].chapter);
  const { room } = useRoom(session.room);
  const t = useMemo(() => tally(answers), [answers]);
  const last = index >= MISSIONS.length - 1;
  const chapterMissions = MISSIONS.map((m, i) => ({ m, i })).filter(({ m }) => m.chapter === ch.no);

  return (
    <motion.section className="absolute inset-0 grid place-items-center overflow-hidden px-3 py-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div initial={{ y: 30, rotate: 1.5 }} animate={{ y: 0, rotate: 0.4 }} className="sheet flex max-h-full w-full max-w-[640px] flex-col overflow-hidden rounded-[3px] p-4 sm:p-7">
        <div className="flex items-start justify-between gap-3 border-b-2 border-ink/80 pb-2">
          <div>
            <div className="label text-ink-2">Hết chương {ch.roman}</div>
            <h2 className="font-head text-[24px] font-bold uppercase leading-tight tracking-wide text-ink sm:text-[30px]">{session.room ? "Bảng xếp hạng" : "Tổng kết chương"}</h2>
          </div>
          <Stamp ink="ink" rotate={6} className="text-[14px]">
            {ch.years}
          </Stamp>
        </div>
        {ch.outro && (
          <p className="mt-3 border-l-4 border-stamp pl-3 font-text text-[15.5px] italic leading-relaxed text-ink">
            <Typed text={withName(ch.outro, session.name)} cps={60} />
          </p>
        )}
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto scrollbar-none">
          {session.room ? (
            room ? (
              <Leaderboard players={room.players} me={session.playerId} limit={6} />
            ) : (
              <p className="font-type text-[13px] text-ink-2">Đang tải bảng xếp hạng…</p>
            )
          ) : (
            <ul className="space-y-1.5">
              {chapterMissions.map(({ m, i }) => {
                const r = t.results[i];
                return (
                  <li key={m.id} className="flex items-center gap-3 rounded-[2px] bg-[#f3e9d2] px-3 py-2 shadow-[inset_0_0_0_1px_rgba(31,26,20,0.12)]">
                    <span className={cn("grid h-6 w-6 place-items-center rounded-[2px] font-head text-[12px] font-bold text-cream", r?.ok ? "bg-olive" : "bg-stamp")}>{r?.ok ? "✓" : "✕"}</span>
                    <span className="min-w-0 flex-1 truncate font-type text-[14px] text-ink">{m.title}</span>
                    <span className="font-head text-[18px] font-bold tabular-nums text-ink">+{(r?.points ?? 0).toLocaleString("vi-VN")}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-ink/30 pt-3">
          <span className="font-type text-[13px] text-ink">
            Điểm của bạn: <b>{t.total.toLocaleString("vi-VN")}</b>
            {session.room && room && (() => {
              const me = room.players.find((p) => p.id === session.playerId);
              return me ? ` · hạng ${me.rank}/${room.players.length}` : "";
            })()}
          </span>
          <Btn size="lg" onClick={afterBoard} autoFocus>
            {last ? "Xem đoạn kết" : `Sang chương ${chapterOf(ch.no + 1).roman}`} <ChevronRight className="h-5 w-5" />
          </Btn>
        </div>
      </motion.div>
    </motion.section>
  );
}
