"use client";

import { motion } from "motion/react";
import { ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { isAutomated } from "@/components/kit/HumanOnly";
import { Btn } from "@/components/kit/Btn";
import { Stamp } from "@/components/kit/Stamp";

/** Giấy thông hành: nhập bí danh (tên hiện trên bảng xếp hạng) và mã phòng nếu chơi cùng lớp. */
export function JoinForm({ initialRoom, focusRoom = false, onJoin }: { initialRoom: string; focusRoom?: boolean; onJoin: (name: string, room: string | null) => void }) {
  const [name, setName] = useState("");
  const [room, setRoom] = useState(initialRoom);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim().replace(/\s+/g, " ");
    const r = room.trim().toUpperCase();
    if (n.length < 2) return setError("Hãy nhập tên của bạn (ít nhất 2 ký tự).");
    if (r && process.env.NODE_ENV === "production" && isAutomated()) return setError("Phát hiện trình duyệt tự động (bot). Hãy vào phòng bằng trình duyệt thường trên điện thoại hoặc máy tính.");
    if (r) {
      setBusy(true);
      const res = await fetch(`/api/rooms/${encodeURIComponent(r)}`).catch(() => null);
      const data = res ? await res.json().catch(() => null) : null;
      setBusy(false);
      if (!res?.ok) return setError("Không tìm thấy phòng này. Hãy kiểm tra lại mã phòng.");
      if (data?.status === "ended") return setError("Trận trong phòng này đã kết thúc.");
    }
    onJoin(n, r || null);
  };

  return (
    <section className="absolute inset-0 grid place-items-center overflow-hidden px-3">
      <motion.form
        onSubmit={submit}
        initial={{ y: 30, rotate: -2, opacity: 0 }}
        animate={{ y: 0, rotate: -0.6, opacity: 1 }}
        className="sheet relative w-full max-w-[420px] rounded-[3px] p-5 sm:p-7"
      >
        <div className="flex items-start justify-between gap-3 border-b-2 border-ink/80 pb-2">
          <div>
            <Link href="/" className="label text-ink-2 hover:text-ink">
              Mạch Ngầm · 1930–1935
            </Link>
            <h1 className="font-head text-[28px] font-bold uppercase leading-tight tracking-wide text-ink">Giấy thông hành</h1>
          </div>
          <Stamp ink="red" rotate={10} className="text-[14px]">
            Mật
          </Stamp>
        </div>
        <label htmlFor="alias" className="label mt-4 block text-ink-2">
          Bí danh của bạn (hiện trên bảng xếp hạng)
        </label>
        <input
          id="alias"
          autoFocus={!focusRoom}
          value={name}
          maxLength={24}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          placeholder="Nguyễn Văn A"
          className="mt-1.5 h-12 w-full rounded-[2px] border-b-2 border-ink/70 bg-[#f6eedb] px-3 font-type text-[17px] text-ink outline-none placeholder:text-ink-3/70 focus:border-stamp"
        />
        <label htmlFor="room" className="label mt-4 block text-ink-2">
          Mã phòng (để trống nếu chơi một mình)
        </label>
        <input
          id="room"
          autoFocus={focusRoom}
          value={room}
          maxLength={6}
          autoCapitalize="characters"
          autoComplete="off"
          onChange={(e) => {
            setRoom(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
            setError("");
          }}
          placeholder="VD: K7Q2"
          className="mt-1.5 h-12 w-full rounded-[2px] border-b-2 border-ink/70 bg-[#f6eedb] px-3 font-type text-[20px] tracking-[0.3em] text-ink outline-none placeholder:tracking-normal placeholder:text-ink-3/70 focus:border-stamp"
        />
        {error && (
          <p role="alert" className="mt-2.5 font-type text-[13px] text-stamp">
            {error}
          </p>
        )}
        <Btn type="submit" size="lg" className="mt-5 w-full" disabled={busy}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null} {room ? "Vào phòng" : "Bắt đầu"} <ChevronRight className="h-5 w-5" />
        </Btn>
      </motion.form>
    </section>
  );
}
