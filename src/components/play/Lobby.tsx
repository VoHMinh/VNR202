"use client";

import { AnimatePresence, motion } from "motion/react";
import { Loader2, Users } from "lucide-react";
import { useEffect } from "react";
import { useStory } from "@/game/session";
import { Stamp } from "@/components/kit/Stamp";
import { useRoom } from "./Standings";

/** Phòng chờ: hiện danh sách người đã vào, tự vào trận khi chủ phòng bấm Bắt đầu. */
export function Lobby() {
  const session = useStory((s) => s.session);
  const begin = useStory((s) => s.beginStory);
  const endByHost = useStory((s) => s.endByHost);
  const { room, error } = useRoom(session.room, 1500);

  useEffect(() => {
    if (room?.status === "playing") begin();
    if (room?.status === "ended") endByHost("Trận trong phòng này đã kết thúc");
  }, [room?.status, begin, endByHost]);

  const players = room?.players ?? [];
  return (
    <motion.section className="absolute inset-0 grid place-items-center overflow-hidden px-3 py-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div initial={{ y: 30, rotate: -1.5 }} animate={{ y: 0, rotate: -0.5 }} className="sheet flex max-h-full w-full max-w-[560px] flex-col overflow-hidden rounded-[3px] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3 border-b-2 border-ink/80 pb-2">
          <div className="min-w-0">
            <div className="label text-ink-2">Phòng chờ · {room?.title ?? "…"}</div>
            <h2 className="font-head text-[26px] font-bold uppercase leading-tight tracking-wide text-ink">Chờ hiệu lệnh</h2>
          </div>
          <div className="text-right">
            <div className="label text-ink-2">Mã phòng</div>
            <div className="font-type text-[26px] font-bold tracking-[0.2em] text-stamp">{session.room}</div>
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 font-type text-[13.5px] leading-snug text-ink">
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
          <span>
            Đồng chí <b>{session.name}</b> đã có mặt. Trận bắt đầu khi chủ phòng ra hiệu lệnh.
          </span>
        </div>
        {error && <p className="mt-2 font-type text-[12.5px] text-stamp">{error}</p>}
        <div className="mt-4 flex items-center justify-between">
          <span className="label flex items-center gap-1.5 text-ink-2">
            <Users className="h-3.5 w-3.5" /> Danh sách đồng chí
          </span>
          <span className="font-head text-[15px] font-bold text-ink">{players.length} người</span>
        </div>
        <ul className="mt-2 grid min-h-0 flex-1 grid-cols-2 content-start gap-1.5 overflow-y-auto scrollbar-none sm:grid-cols-3">
          <AnimatePresence initial={false}>
            {players.map((p) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, scale: 1.3 }}
                animate={{ opacity: 1, scale: 1 }}
                className="truncate rounded-[2px] bg-[#f3e9d2] px-2.5 py-1.5 font-type text-[13px] text-ink shadow-[inset_0_0_0_1px_rgba(31,26,20,0.14)]"
              >
                {p.id === session.playerId ? <b>{p.name} (bạn)</b> : p.name}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <div className="mt-4 flex justify-center">
          <Stamp ink="ink" rotate={-4} className="text-[14px]">
            Đang chờ chủ phòng
          </Stamp>
        </div>
      </motion.div>
    </motion.section>
  );
}
