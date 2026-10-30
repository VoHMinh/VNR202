"use client";

import { motion } from "motion/react";
import { ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MISSIONS, PLAY_TIME } from "@/game/story";
import { hostKeyFor } from "@/components/host/HostRoom";
import { Btn } from "@/components/kit/Btn";
import { Stamp } from "@/components/kit/Stamp";

const STEPS = [
  "Đặt tên phòng rồi bấm Tạo phòng.",
  "Chiếu màn hình phòng chờ lên máy chiếu: cả lớp quét mã QR, nhập bí danh.",
  "Khi đủ người, bấm Bắt đầu trận: mọi người cùng chơi một lúc.",
  "Màn chiếu hiện đường đua và bảng xếp hạng trực tiếp; hết giờ bấm Kết thúc trận để chốt điểm.",
];

/** Tạo phòng cho cả lớp. Khóa chủ phòng được lưu trên trình duyệt này để bắt đầu và kết thúc trận. */
export default function HostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("Lớp VNR202");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/rooms", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title }) });
      const data = (await res.json()) as { code: string; hostKey: string };
      if (!res.ok) throw new Error();
      try {
        localStorage.setItem(hostKeyFor(data.code), data.hostKey);
      } catch {}
      router.push(`/host/${data.code}`);
    } catch {
      setError("Không tạo được phòng. Hãy thử lại.");
      setBusy(false);
    }
  };

  return (
    <main className="desk grid h-dvh place-items-center overflow-hidden px-3 text-cream">
      <motion.form
        onSubmit={create}
        initial={{ y: 30, rotate: -2, opacity: 0 }}
        animate={{ y: 0, rotate: -0.6, opacity: 1 }}
        className="sheet w-full max-w-[520px] rounded-[3px] p-5 sm:p-7"
      >
        <div className="flex items-start justify-between gap-3 border-b-2 border-ink/80 pb-2">
          <div>
            <Link href="/" className="label text-ink-2 hover:text-ink">
              Mạch Ngầm · Dành cho chủ phòng
            </Link>
            <h1 className="font-head text-[30px] font-bold uppercase leading-tight tracking-wide text-ink">Tạo phòng cho lớp</h1>
          </div>
          <Stamp ink="red" rotate={9} className="text-[14px]">
            Mật
          </Stamp>
        </div>
        <ol className="mt-3 space-y-1.5">
          {STEPS.map((s, i) => (
            <li key={s} className="flex gap-2.5 font-text text-[14px] leading-snug text-ink">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-ink font-head text-[12px] font-bold">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <label htmlFor="room-title" className="label mt-5 block text-ink-2">
          Tên phòng
        </label>
        <input
          id="room-title"
          value={title}
          maxLength={60}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1.5 h-12 w-full rounded-[2px] border-b-2 border-ink/70 bg-[#f6eedb] px-3 font-type text-[17px] text-ink outline-none focus:border-stamp"
        />
        {error && <p className="mt-2 font-type text-[13px] text-stamp">{error}</p>}
        <Btn type="submit" size="lg" className="mt-5 w-full" disabled={busy}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null} Tạo phòng <ChevronRight className="h-5 w-5" />
        </Btn>
        <p className="mt-3 font-type text-[11.5px] leading-relaxed text-ink-2">
          Trận gồm {MISSIONS.length} nhiệm vụ, {PLAY_TIME}. Phòng tồn tại trong 24 giờ. Để cả lớp vào được từ điện thoại, chạy lệnh <code className="font-bold">npm run class</code> trên máy chủ phòng và mở trang bằng đường dẫn công khai mà lệnh in ra.
        </p>
      </motion.form>
    </main>
  );
}
