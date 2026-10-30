"use client";

import { forwardRef } from "react";
import { CHAPTERS, MISSIONS, SRC_BN, SRC_GT, titleFor } from "@/game/story";
import type { Tally } from "@/game/scoring";

export const POSTER_W = 1080;
export const POSTER_H = 1527;

/**
 * Sơ đồ tiến trình (process map) của lượt chơi, xuất ra ảnh PNG cho bài tập dạng Poster / Process map.
 * Chỉ dùng màu nền và gradient (không dùng ảnh nền) để ảnh xuất ra không bị đen.
 */
export const Poster = forwardRef<HTMLDivElement, { name: string; t: Tally }>(function Poster({ name, t }, ref) {
  const title = titleFor(t.total);
  const date = new Date().toLocaleDateString("vi-VN");
  return (
    <div
      ref={ref}
      className="relative overflow-hidden"
      style={{ width: POSTER_W, height: POSTER_H, backgroundColor: "#e9ddc1", color: "#1f1a14", fontFamily: "var(--font-text), serif" }}
    >
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(110,72,30,0.25) 100%)" }} />
      <div className="absolute inset-5 border-[3px] border-[#1f1a14]" />
      <div className="absolute inset-7 border border-[#1f1a14]/40" />
      <div className="relative flex h-full flex-col px-16 pb-14 pt-16">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="font-head text-[15px] font-semibold uppercase tracking-[0.2em]" style={{ color: "#b3261e" }}>
              VNR202 · Sơ đồ tiến trình (Process map) · 1930–1935
            </div>
            <h1 className="mt-3 max-w-[780px] font-head text-[40px] font-bold uppercase leading-[1.12]">
              Đảng đã duy trì và phục hồi phong trào cách mạng sau cao trào 1930–1931 bằng những cơ chế nào?
            </h1>
          </div>
          <div className="mt-1 rotate-6 border-[3px] px-3 py-1 font-head text-[16px] font-bold uppercase tracking-[0.15em]" style={{ borderColor: "#b3261e", color: "#b3261e" }}>
            Mạch Ngầm
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-1 border-y-2 border-[#1f1a14] py-2.5 font-type text-[15px]">
          <span>
            Bí danh: <b>{name || "Ẩn danh"}</b>
          </span>
          <span>Ngày: {date}</span>
          <span>
            Danh hiệu: <b style={{ color: "#b3261e" }}>{title.name}</b>
          </span>
          <span className="ml-auto">
            Điểm: <b>{t.total.toLocaleString("vi-VN")}</b> · hoàn thành {t.correct}/{MISSIONS.length}
          </span>
        </div>

        <div className="mt-6 grid flex-1 grid-cols-2 gap-x-8 gap-y-6">
          {CHAPTERS.map((c) => (
            <section key={c.no} className="flex flex-col border-2 border-[#1f1a14] bg-[#f3e9d2]/60 p-4">
              <div className="flex items-baseline justify-between border-b-2 border-[#1f1a14] pb-1.5">
                <h2 className="font-head text-[24px] font-bold uppercase tracking-wide">
                  {c.roman}. {c.title}
                </h2>
                <span className="font-type text-[15px] font-bold" style={{ color: "#b3261e" }}>
                  {c.years}
                </span>
              </div>
              <ol className="mt-2 flex-1 space-y-1.5">
                {MISSIONS.map((m, i) => ({ m, i }))
                  .filter(({ m }) => m.chapter === c.no)
                  .map(({ m, i }) => {
                    const r = t.results[i];
                    return (
                      <li key={m.id} className="flex gap-3">
                        <span
                          className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center font-head text-[13px] font-bold"
                          style={{ backgroundColor: r?.ok ? "#35562d" : r ? "#b3261e" : "#c8b285", color: "#f1e7d0" }}
                        >
                          {r?.ok ? "✓" : r ? "✕" : i + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-head text-[15.5px] font-semibold uppercase leading-tight tracking-wide">
                            {m.title} <span className="font-type text-[13px] font-normal normal-case tracking-normal text-[#4b3f31]">· {m.date}</span>
                          </div>
                          <div className="font-text text-[13.5px] leading-snug">{m.mechanism}</div>
                        </div>
                      </li>
                    );
                  })}
              </ol>
              <p className="mt-2 border-t border-dashed border-[#1f1a14]/40 pt-2 font-text text-[13.5px] italic leading-snug text-[#4b3f31]">{lessonOf(c.no)}</p>
            </section>
          ))}
        </div>

        <div className="mt-6 border-2 border-[#b3261e] bg-[#b3261e]/[0.06] p-4">
          <div className="font-head text-[16px] font-bold uppercase tracking-[0.12em]" style={{ color: "#b3261e" }}>
            Kết luận
          </div>
          <p className="mt-1 font-text text-[16px] leading-snug">
            Đảng duy trì và phục hồi phong trào nhờ: giữ vững nguyên tắc bí mật, đường dây giao liên đơn tuyến và cảnh giác trước kẻ phản bội; giữ vững khí tiết khi bị bắt, biến nhà tù thành trường học cách mạng; đề ra Chương trình hành động (6/1932) với những yêu sách thiết thực, kết hợp hoạt động bí mật với các hình thức công khai, hợp pháp; những đảng viên còn lại chắp nối liên lạc, gây dựng lại cơ sở; Ban Chỉ huy ở ngoài (3/1934) nối lại sợi dây lãnh đạo. Đại hội I (3/1935) đánh dấu hệ thống tổ chức của Đảng được khôi phục từ Trung ương đến địa phương, từ trong nước ra ngoài nước.
          </p>
        </div>
        <div className="mt-4 font-type text-[11.5px] leading-snug text-[#4b3f31]">
          Nguồn: {SRC_GT.label}; {SRC_BN.label}; Niên biểu Ban Chấp hành Trung ương khóa I; báo Nhân Dân. Ảnh tư liệu: Wikimedia Commons (phạm vi công cộng hoặc CC0). Số trang trích dẫn: chờ giảng viên xác nhận.
        </div>
      </div>
    </div>
  );
});

const LESSONS: Record<number, string> = {
  1: "Cao trào 1930–1931 khẳng định sức mạnh của khối liên minh công nông dưới sự lãnh đạo của Đảng.",
  2: "Trong khủng bố trắng, giữ được cơ sở bí mật và khí tiết là điều kiện để phục hồi phong trào.",
  3: "Từ nhà tù và từ quần chúng, đội ngũ cán bộ và cơ sở Đảng từng bước được gây dựng lại.",
  4: "Ban Chỉ huy ở ngoài nối lại liên lạc, tạo điều kiện triệu tập Đại hội I (3/1935).",
};
const lessonOf = (no: number) => LESSONS[no];
