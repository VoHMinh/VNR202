"use client";

import { FileText, Link2, Timer, Trophy } from "lucide-react";
import { MAX_SCORE } from "@/game/scoring";
import { PLAY_TIME, TOTAL } from "@/game/story";

const ITEMS = [
  {
    icon: FileText,
    title: "Đọc hồ sơ nhiệm vụ",
    text: "Mỗi nhiệm vụ là một chặng có thật của cách mạng từ năm 1930 đến 1935. Bạn là người giao liên phải xử lý tình huống.",
  },
  {
    icon: Timer,
    title: "Làm trước khi hết giờ",
    text: "Chọn đúng phương án: 500 đến 1000 điểm, càng nhanh càng nhiều. Trò chơi nhỏ: tối đa 1000 điểm. Sai hoặc hết giờ: 0 điểm.",
  },
  {
    icon: Link2,
    title: "Giữ chuỗi",
    text: "Hoàn thành nhiều nhiệm vụ liên tiếp được thưởng thêm 100 điểm mỗi bậc, tối đa 500 điểm mỗi nhiệm vụ.",
  },
  {
    icon: Trophy,
    title: "Giành hạng nhất",
    text: "Hết mỗi chương xem mình đứng thứ mấy trong phòng. Sau nhiệm vụ cuối, ai nhiều điểm nhất là người thắng.",
  },
];

/** Thẻ luật chơi: 4 ý, đọc trong 20 giây. */
export function Rules() {
  return (
    <div>
      <div className="label text-stamp">Hướng dẫn</div>
      <h2 className="mt-0.5 font-head text-[26px] font-bold uppercase leading-tight tracking-wide text-ink">Cách chơi</h2>
      <p className="mt-1 font-type text-[12.5px] text-ink-2">
        {TOTAL} nhiệm vụ · {PLAY_TIME} · tối đa {MAX_SCORE.toLocaleString("vi-VN")} điểm
      </p>
      <ol className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => (
          <li key={it.title} className="flex gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-ink/70 text-ink">
              <it.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="font-head text-[15px] font-semibold uppercase tracking-wide text-ink">
                {i + 1}. {it.title}
              </div>
              <p className="text-[13.5px] leading-snug text-ink-2">{it.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 border-t border-dashed border-ink/30 pt-2 font-text text-[12.5px] italic leading-snug text-ink-2">
        Nhân vật chính (bạn) và tình huống của nhân vật là hư cấu; sự kiện, nhân vật lịch sử, ngày tháng theo giáo trình Lịch sử Đảng và tư liệu văn kiện Đảng.
      </p>
    </div>
  );
}
