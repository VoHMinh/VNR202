"use client";

import { AnimatePresence, motion } from "motion/react";
import { Copy, Crown, Flag, Loader2, Play, Plus, Square, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { CHAPTERS, MISSIONS, PLAY_TIME } from "@/game/story";
import { Btn } from "@/components/kit/Btn";
import { PartyFlag } from "@/components/kit/PartyFlag";
import { Stamp } from "@/components/kit/Stamp";
import { useRoom, type RoomView } from "@/components/play/Standings";
import { useOrigin } from "@/lib/useOrigin";
import { cn } from "@/lib/cn";

export const hostKeyFor = (code: string) => `mach-ngam:host:${code}`;

const noSubscribe = () => () => {};
function readHostKey(code: string) {
  try {
    return localStorage.getItem(hostKeyFor(code));
  } catch {
    return null;
  }
}

/** Màn hình của chủ phòng (chiếu lên máy chiếu): phòng chờ → đường đua trực tiếp → bục vinh danh. */
export function HostRoom({ code, readOnly = false }: { code: string; readOnly?: boolean }) {
  const origin = useOrigin();
  const { room, error } = useRoom(code, 1500);
  const hostKey = useSyncExternalStore(noSubscribe, () => (readOnly ? null : readHostKey(code)), () => null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const link = `${origin}/play?room=${code}`;
  const act = async (what: "start" | "end") => {
    if (!hostKey) return;
    setBusy(true);
    await fetch(`/api/rooms/${code}/${what}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ hostKey }) }).catch(() => null);
    setBusy(false);
  };

  if (!room) {
    return (
      <main className="desk grid h-dvh place-items-center text-cream">
        <p className="font-type text-[15px]">{error ?? "Đang mở phòng…"}</p>
      </main>
    );
  }

  const canControl = !!hostKey && !readOnly;
  return (
    <main className="desk flex h-dvh flex-col overflow-hidden text-cream">
      <header className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 px-4 pb-2 pt-3 sm:px-8 sm:pt-4">
        <div className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
          <Link href="/" className="label text-gold/85 hover:text-gold">
            Mạch Ngầm<span className="hidden sm:inline"> · Hồ sơ mật 1930–1935</span>
          </Link>
          <h1 className="truncate font-head text-[24px] font-bold uppercase leading-tight tracking-wide text-cream sm:text-[38px]">{room.title}</h1>
        </div>
        <StatusChip room={room} />
        <div className="ml-auto flex items-center gap-3 rounded-[4px] bg-black/40 px-3 py-1.5 ring-1 ring-cream/15 sm:ml-0 sm:py-2">
          {origin && (
            <span className="hidden rounded-[3px] bg-[#f3ead6] p-1.5 sm:block">
              <QRCodeSVG value={link} size={58} bgColor="#f3ead6" fgColor="#1f1a14" />
            </span>
          )}
          <div className="flex items-baseline gap-2 sm:block">
            <div className="label text-cream/60">Mã phòng</div>
            <div className="font-type text-[22px] font-bold leading-none tracking-[0.2em] text-gold sm:text-[30px]">{code}</div>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 px-4 pb-4 sm:px-8 sm:pb-6">
        {room.status === "lobby" && <LobbyView room={room} link={link} canControl={canControl} busy={busy} onStart={() => act("start")} copied={copied} onCopy={async () => {
          await navigator.clipboard.writeText(link).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }} />}
        {room.status === "playing" && <RaceView room={room} canControl={canControl} busy={busy} onEnd={() => act("end")} />}
        {room.status === "ended" && <PodiumView room={room} />}
      </div>
    </main>
  );
}

function StatusChip({ room }: { room: RoomView }) {
  const label = room.status === "lobby" ? "Phòng chờ" : room.status === "playing" ? "Đang thi đấu" : "Đã kết thúc";
  return (
    <span className={cn("flex items-center gap-2 rounded-[3px] px-2.5 py-1 font-head text-[12.5px] font-semibold uppercase tracking-wider sm:px-3 sm:py-1.5 sm:text-[14px]", room.status === "playing" ? "bg-party text-cream" : "bg-black/40 text-cream/80 ring-1 ring-cream/15")}>
      {room.status === "playing" && <span className="h-2 w-2 animate-pulse rounded-full bg-cream" />}
      {label}
    </span>
  );
}

function LobbyView({ room, link, canControl, busy, onStart, copied, onCopy }: { room: RoomView; link: string; canControl: boolean; busy: boolean; onStart: () => void; copied: boolean; onCopy: () => void }) {
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:grid-rows-1">
      <div className="sheet flex min-h-0 items-center gap-4 rounded-[3px] p-3 sm:flex-col sm:justify-center sm:gap-0 sm:p-5 sm:text-center">
        <div className="label hidden text-ink-2 sm:block">Quét mã để vào phòng</div>
        <div className="shrink-0 rounded-[4px] bg-[#f3ead6] p-2 shadow-[inset_0_0_0_2px_rgba(31,26,20,0.25)] sm:mt-3 sm:p-3">
          <QRCodeSVG value={link} size={220} bgColor="#f3ead6" fgColor="#1f1a14" level="M" className="h-[96px] w-[96px] sm:h-[min(220px,28vh)] sm:w-[min(220px,28vh)]" />
        </div>
        <div className="min-w-0 sm:flex sm:flex-col sm:items-center">
          <div className="label text-ink-2 sm:hidden">Quét mã hoặc nhập mã</div>
          <div className="font-type text-[32px] font-bold leading-none tracking-[0.25em] text-stamp sm:mt-3 sm:text-[44px]">{room.code}</div>
          <button onClick={onCopy} className="mt-2 flex items-center gap-1.5 break-all text-left font-type text-[11.5px] text-ink-2 hover:text-ink sm:text-[12.5px]">
            <Copy className="h-3.5 w-3.5 shrink-0" /> {copied ? "Đã sao chép đường dẫn" : link}
          </button>
          <p className="mt-3 hidden max-w-sm font-text text-[14px] leading-snug text-ink-2 sm:block">Mở camera điện thoại quét mã, hoặc vào trang chủ, chọn “Vào phòng” và nhập mã.</p>
        </div>
      </div>
      <div className="sheet flex min-h-0 flex-col rounded-[3px] p-4 sm:p-5">
        <div className="flex items-center justify-between border-b-2 border-ink/80 pb-2">
          <h2 className="flex items-center gap-2 font-head text-[20px] font-bold uppercase tracking-wide text-ink sm:text-[22px]">
            <Users className="h-5 w-5" /> Danh sách đồng chí
          </h2>
          <span className="font-head text-[28px] font-bold text-stamp">{room.players.length}</span>
        </div>
        <ul className="mt-3 grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto scrollbar-none sm:grid-cols-3">
          <AnimatePresence initial={false}>
            {room.players.map((p) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, scale: 1.4, rotate: -4 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                className="truncate rounded-[2px] bg-[#f3e9d2] px-3 py-1.5 font-type text-[14px] font-bold text-ink shadow-[inset_0_0_0_1px_rgba(31,26,20,0.14)] sm:py-2 sm:text-[15px]"
              >
                {p.name}
              </motion.li>
            ))}
          </AnimatePresence>
          {room.players.length === 0 && <li className="col-span-full py-8 text-center font-type text-[14px] text-ink-3">Chưa có ai vào phòng. Hãy chiếu mã QR cho cả lớp.</li>}
        </ul>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-ink/30 pt-3 sm:mt-4">
          <p className="font-type text-[12px] text-ink-2 sm:text-[12.5px]">{TOTAL_TEXT}</p>
          {canControl ? (
            <Btn size="lg" onClick={onStart} disabled={busy || room.players.length === 0}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />} Bắt đầu trận
            </Btn>
          ) : (
            <Stamp ink="ink" rotate={-3} className="text-[14px]">
              Chờ chủ phòng bắt đầu
            </Stamp>
          )}
        </div>
      </div>
    </div>
  );
}

const TOTAL_TEXT = `${MISSIONS.length} nhiệm vụ, ${PLAY_TIME}. Bấm Bắt đầu khi mọi người đã vào.`;

/** Số làn hiện trên đường dây (người đứng đầu); những người còn lại xem ở bảng xếp hạng. */
const LANES = 10;
const LANE_COLS = "grid-cols-[1.75rem_minmax(0,7.5rem)_minmax(0,1fr)_4.75rem]";

/** Đường dây liên lạc: mỗi người một làn, thẻ chạy theo số nhiệm vụ đã làm, chia theo bốn chương. */
function RaceView({ room, canControl, busy, onEnd }: { room: RoomView; canControl: boolean; busy: boolean; onEnd: () => void }) {
  const total = MISSIONS.length;
  const finished = room.players.filter((p) => p.finished).length;
  const chapters = useMemo(
    () =>
      CHAPTERS.map((c) => {
        const from = MISSIONS.findIndex((m) => m.chapter === c.no);
        const to = MISSIONS.findLastIndex((m) => m.chapter === c.no) + 1;
        return { c, from, to };
      }),
    [],
  );

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <div className="sheet relative hidden min-h-0 flex-col overflow-hidden rounded-[3px] p-4 sm:flex sm:p-5">
        <div className="flex items-center justify-between border-b-2 border-ink/80 pb-2">
          <h2 className="font-head text-[22px] font-bold uppercase tracking-wide text-ink">Đường dây liên lạc</h2>
          <span className="font-type text-[13px] text-ink-2">
            Đã về đích: <b className="text-ink">{finished}</b>/{room.players.length}
          </span>
        </div>
        <div className={cn("mt-2 grid items-end gap-2", LANE_COLS)}>
          <span />
          <span className="label text-ink-2">Đồng chí</span>
          <div className="relative mx-3 h-8">
            {chapters.map(({ c, from, to }) => (
              <div key={c.no} className="absolute bottom-0 border-l-2 border-stamp/60 pl-1" style={{ left: `${(from / total) * 100}%`, width: `${((to - from) / total) * 100}%` }}>
                <span className="label block truncate text-stamp">Ch. {c.roman}</span>
                <span className="block truncate font-type text-[10px] leading-tight text-ink-2">{c.years}</span>
              </div>
            ))}
          </div>
          <span className="label text-right text-ink-2">Điểm</span>
        </div>
        <ol className="mt-1 flex min-h-0 flex-1 flex-col gap-1">
          {room.players.slice(0, LANES).map((p) => (
            <li key={p.id} className={cn("grid min-h-0 max-h-[76px] flex-1 basis-0 items-center gap-2", LANE_COLS)}>
              <span className={cn("text-center font-head text-[16px] font-bold", p.rank === 1 ? "text-stamp" : "text-ink-2")}>{p.rank}</span>
              <span className="truncate font-type text-[14px] font-bold text-ink" title={p.name}>
                {p.name}
              </span>
              <div className="relative mx-3 h-full min-h-[28px]">
                <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-[repeating-linear-gradient(90deg,rgba(31,26,20,0.5)_0_6px,transparent_6px_10px)]" />
                {chapters.slice(1).map(({ c, from }) => (
                  <span key={c.no} className="absolute top-[18%] h-[64%] w-px bg-stamp/40" style={{ left: `${(from / total) * 100}%` }} />
                ))}
                <Flag className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 translate-x-1/2 text-party" />
                <span
                  className={cn(
                    "absolute top-1/2 grid h-7 min-w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 px-1 font-head text-[12px] font-bold shadow-[0_2px_4px_rgba(0,0,0,0.35)] transition-[left] duration-700 ease-out",
                    p.finished ? "border-party bg-party text-cream" : p.rank <= 3 ? "border-stamp bg-[#f6e3d8] text-stamp" : "border-ink bg-[#f3ead6] text-ink",
                  )}
                  style={{ left: `${(p.done / total) * 100}%` }}
                  title={`${p.name}: ${p.done}/${total} nhiệm vụ`}
                >
                  {p.done}
                </span>
              </div>
              <span className="text-right font-head text-[18px] font-bold tabular-nums text-ink">{p.total.toLocaleString("vi-VN")}</span>
            </li>
          ))}
          {room.players.length > LANES && <li className="font-type text-[12px] text-ink-2">Còn {room.players.length - LANES} đồng chí khác, xem ở bảng xếp hạng.</li>}
        </ol>
      </div>
      <div className="flex min-h-0 flex-col rounded-[3px] bg-black/40 p-4 ring-1 ring-cream/12 sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-head text-[22px] font-bold uppercase tracking-wide text-cream">Bảng xếp hạng</h2>
          <span className="label hidden text-cream/55 sm:inline">Tự cập nhật</span>
          <span className="label text-cream/70 sm:hidden">
            Về đích {finished}/{room.players.length}
          </span>
        </div>
        <ol className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto scrollbar-none">
          {room.players.slice(0, 12).map((p) => (
            <motion.li layout key={p.id} className={cn("flex items-center gap-3 rounded-[2px] px-3 py-2", p.rank <= 3 ? "bg-white/[0.08]" : "bg-white/[0.03]")}>
              <span className={cn("w-7 text-center font-head text-[20px] font-bold", p.rank === 1 ? "text-gold" : "text-cream/60")}>{p.rank === 1 ? <Crown className="mx-auto h-5 w-5" /> : p.rank}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-type text-[16px] font-bold">{p.name}</span>
                <span className="mt-1 flex gap-[2px] sm:hidden" aria-hidden>
                  {MISSIONS.map((m, i) => (
                    <span key={m.id} className={cn("h-1.5 flex-1 rounded-[1px]", i < p.done ? "bg-gold" : "bg-cream/15")} />
                  ))}
                </span>
              </span>
              <span className="font-type text-[12px] text-cream/50">{p.done}/{MISSIONS.length}</span>
              <span className="w-20 text-right font-head text-[22px] font-bold tabular-nums text-gold">{p.total.toLocaleString("vi-VN")}</span>
            </motion.li>
          ))}
        </ol>
        {canControl && (
          <Btn tone="dark" className="mt-3" onClick={onEnd} disabled={busy}>
            <Square className="h-4 w-4" /> Kết thúc trận, chốt điểm
          </Btn>
        )}
      </div>
    </div>
  );
}

function PodiumView({ room }: { room: RoomView }) {
  const router = useRouter();
  const top = [room.players[1], room.players[0], room.players[2]];
  const heights = ["h-[26%] sm:h-[38%]", "h-[38%] sm:h-[52%]", "h-[18%] sm:h-[30%]"];
  return (
    <div className="grid h-full min-h-0 grid-rows-[minmax(0,1.15fr)_minmax(0,1fr)] gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:grid-rows-1">
      <div className="relative flex min-h-0 flex-col rounded-[3px] bg-black/35 p-4 ring-1 ring-cream/12">
        <div className="flex items-center justify-between">
          <h2 className="font-head text-[22px] font-bold uppercase tracking-wide text-cream sm:text-[26px]">Vinh danh</h2>
          <div className="hidden sm:block">
            <PartyFlag width={150} />
          </div>
        </div>
        <div className="mt-2 grid min-h-0 flex-1 grid-cols-3 items-end gap-2 sm:gap-3">
          {top.map((p, i) => (
            <div key={i} className="flex h-full min-h-0 flex-col items-center justify-end">
              {p ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.2 }} className="sheet mb-2 w-full max-w-[220px] rounded-[3px] p-2 text-center sm:p-3">
                  {i === 1 && <Crown className="mx-auto h-5 w-5 text-[#a0710c] sm:h-6 sm:w-6" />}
                  <div className="truncate font-type text-[14px] font-bold text-ink sm:text-[18px]">{p.name}</div>
                  <div className="font-head text-[24px] font-bold leading-none text-stamp sm:text-[34px]">{p.total.toLocaleString("vi-VN")}</div>
                  <div className="font-type text-[10.5px] text-ink-2 sm:text-[11px]">
                    <span className="sm:hidden">✓ </span>{p.correct}/{MISSIONS.length}<span className="hidden sm:inline"> nhiệm vụ hoàn thành</span>
                  </div>
                </motion.div>
              ) : (
                <div className="mb-2 w-full max-w-[220px] rounded-[3px] border border-dashed border-cream/20 p-3 text-center font-type text-[13px] text-cream/40">Trống</div>
              )}
              <div className={cn("flex w-full items-start justify-center rounded-t-[3px] bg-gradient-to-b from-[#3a2a1c] to-[#1a120c] pt-3 ring-1 ring-cream/10", heights[i])}>
                <span className={cn("font-head text-[30px] font-bold leading-none sm:text-[44px]", i === 1 ? "text-gold" : "text-cream/70")}>{i === 1 ? 1 : i === 0 ? 2 : 3}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="sheet flex min-h-0 flex-col rounded-[3px] p-4 sm:p-5">
        <h2 className="border-b-2 border-ink/80 pb-2 font-head text-[22px] font-bold uppercase tracking-wide text-ink">Kết quả chung cuộc</h2>
        <ol className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto scrollbar-none">
          {room.players.map((p) => (
            <li key={p.id} className="flex items-center gap-3 border-b border-dotted border-ink/25 py-1.5">
              <span className="w-7 text-center font-head text-[17px] font-bold text-ink-2">{p.rank}</span>
              <span className="min-w-0 flex-1 truncate font-type text-[15px] font-bold text-ink">{p.name}</span>
              <span className="font-type text-[12px] text-ink-2">{p.correct}/{MISSIONS.length}</span>
              <span className="w-20 text-right font-head text-[19px] font-bold tabular-nums text-ink">{p.total.toLocaleString("vi-VN")}</span>
            </li>
          ))}
        </ol>
        <Btn tone="red" className="mt-3 w-full" onClick={() => router.push("/host")}>
          <Plus className="h-4 w-4" /> Tạo phòng mới
        </Btn>
      </div>
    </div>
  );
}
