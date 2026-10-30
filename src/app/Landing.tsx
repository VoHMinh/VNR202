"use client";

import { motion } from "motion/react";
import { ChevronRight, CircleHelp, KeyRound, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CHAPTERS, MISSIONS, PLAY_TIME } from "@/game/story";
import { Btn } from "@/components/kit/Btn";
import { SheetModal } from "@/components/kit/Sheet";
import { Stamp } from "@/components/kit/Stamp";
import { Typed } from "@/components/kit/Typed";
import { Rules } from "@/components/play/Rules";
import { LineBoard } from "./LineBoard";

/** Màn hình tiêu đề: bìa hồ sơ mật trên mặt bàn, bốn lối vào và bảng ghim bốn chương của đường dây. */
export default function Landing() {
  const router = useRouter();
  const [rules, setRules] = useState(false);

  return (
    <main className="desk relative flex h-dvh flex-col overflow-hidden text-cream">
      {/* Màn hình rộng: bảng ghim bốn chương nối bằng sợi chỉ đỏ, đặt bên phải bìa hồ sơ */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden lg:block" style={{ left: "calc(6vw + 690px)" }}>
        <div className="absolute inset-x-[5%] bottom-[7%] top-[5%]">
          <LineBoard />
        </div>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 items-center px-3 py-3 sm:px-8 lg:px-[6%]">
        <motion.div
          initial={{ opacity: 0, y: 40, rotate: -4 }}
          animate={{ opacity: 1, y: 0, rotate: -1.2 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="folder relative w-full max-w-[640px] rounded-[4px] p-2.5 sm:p-3"
        >
          {/* Tab của bìa hồ sơ */}
          <span className="folder absolute -top-6 left-6 h-8 w-40 rounded-t-[4px] shadow-none" aria-hidden />
          <div className="sheet relative rounded-[2px] px-4 pb-4 pt-4 sm:px-8 sm:pb-7 sm:pt-7">
            <div className="flex items-start justify-between gap-3">
              <div className="font-type text-[12px] font-bold uppercase tracking-[0.18em] text-ink-2">Hồ sơ mật · 1930–1935</div>
              <Stamp ink="red" rotate={12} delay={0.9} className="text-[15px] sm:text-[18px]">
                Tối mật
              </Stamp>
            </div>
            {/* Hai dòng tách riêng, chừa khoảng cho dấu chấm dưới chữ Ạ và dấu mũ, dấu huyền trên chữ Ầ khỏi chạm nhau. */}
            <h1 className="inked mt-1 font-head text-[clamp(2.6rem,11.5vw,7rem)] font-bold uppercase leading-[0.98] tracking-[0.02em] text-ink sm:mt-2">
              <span className="block">Mạch</span> <span className="mt-[0.26em] block">Ngầm</span>
            </h1>
            <div className="mt-2 flex items-center gap-3">
              <span className="h-[3px] w-10 bg-party" />
              <span className="font-head text-[13px] font-semibold uppercase tracking-[0.2em] text-party sm:text-[17px]">Trò chơi lịch sử Đảng</span>
            </div>
            <p className="mt-3 font-text text-[14.5px] leading-snug text-ink sm:mt-4 sm:min-h-[4.5em] sm:text-[18px] sm:leading-relaxed">
              <Typed
                cps={65}
                delay={0.8}
                text="Bạn là một giao liên của Đảng. Qua cao trào 1930–1931 và những năm khủng bố trắng, hãy giữ vững đường dây bí mật cho tới ngày Đảng họp Đại hội I ở Ma Cao."
              />
            </p>
            <div className="mt-1 font-type text-[11px] text-ink-2 sm:text-[12px]">
              {MISSIONS.length} nhiệm vụ · {CHAPTERS.length} chương · {PLAY_TIME} · bảng xếp hạng trực tiếp
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-2.5">
              <Btn size="lg" className="col-span-2 h-12 sm:col-span-1 sm:h-14" onClick={() => router.push("/play?new=1")} autoFocus>
                Chơi một mình <ChevronRight className="h-5 w-5" />
              </Btn>
              <Btn size="lg" tone="ink" className="col-span-2 h-12 sm:col-span-1 sm:h-14" onClick={() => router.push("/host")}>
                <Users className="h-5 w-5" /> Tạo phòng cho lớp
              </Btn>
              <Btn size="lg" tone="paper" className="h-12 px-3 text-[15px] sm:h-14 sm:text-[18px]" onClick={() => router.push("/play?new=1&join=1")}>
                <KeyRound className="h-5 w-5" /> Vào phòng
              </Btn>
              <Btn size="lg" tone="paper" className="h-12 px-3 text-[15px] sm:h-14 sm:text-[18px]" onClick={() => setRules(true)}>
                <CircleHelp className="h-5 w-5" /> Cách chơi
              </Btn>
            </div>
          </div>
        </motion.div>
      </div>

      <footer className="relative z-10 flex shrink-0 items-center justify-center gap-4 px-4 pb-2 text-center font-type text-[10px] text-cream/50 sm:justify-between sm:px-8 sm:pb-2.5 sm:text-left sm:text-[10.5px]">
        <span className="hidden sm:inline">VNR202 · Sự kiện, nhân vật lịch sử theo Giáo trình Lịch sử Đảng Cộng sản Việt Nam (2021); nhân vật chính và tình huống của nhân vật là hư cấu · Số trang trích dẫn: chờ giảng viên xác nhận</span>
        <span>
          <span className="sm:hidden">VNR202 · </span>Ảnh tư liệu: Wikimedia Commons, phạm vi công cộng
        </span>
      </footer>

      <SheetModal open={rules} onClose={() => setRules(false)} label="Cách chơi" className="p-5 sm:p-7">
        <Rules />
        <Btn className="mt-5 w-full" onClick={() => router.push("/play?new=1")}>
          Chơi ngay <ChevronRight className="h-5 w-5" />
        </Btn>
      </SheetModal>
    </main>
  );
}
