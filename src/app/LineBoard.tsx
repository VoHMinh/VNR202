"use client";

import { motion } from "motion/react";
import { CHAPTERS } from "@/game/story";
import { ART } from "@/game/data/art";
import { FilmImage } from "@/components/fx/Film";
import { PartyFlag } from "@/components/kit/PartyFlag";
import { Stamp } from "@/components/kit/Stamp";
import { useBox } from "@/components/minigames/shared";

/*
 * Bảng ghim cạnh bìa hồ sơ ở trang chủ: bốn chương của trò chơi là bốn tấm ảnh tư liệu ghim trên mặt bàn,
 * nối với nhau bằng một sợi chỉ đỏ (chính là "mạch ngầm" người chơi phải giữ), chạy từ cao trào 1930
 * tới đích là Đại hội I ở Ma Cao (3/1935) với lá cờ Đảng.
 */

const ROT = [-4, 3, 2.5, -3];

export function LineBoard() {
  const [ref, box] = useBox<HTMLDivElement>();
  const W = box.w;
  const H = box.h;
  const ready = W > 0 && H > 0;

  // Bố cục theo khung: ảnh so le trái – phải, chừa dải trên cho nhãn và dải dưới cho lá cờ (cờ không cán cao 0,88 lần bề rộng).
  // Hai ảnh cùng một bên cách nhau hai nấc, nên mỗi ảnh phải thấp hơn hai nấc để không che chú thích của ảnh trên.
  const top = 34;
  const flagW = Math.min(170, W * 0.42, H * 0.2);
  const endH = flagW * 0.88 + 30;
  const chMax = (2 * (H - top - endH + 2)) / 5 - 12;
  const cw = Math.max(110, Math.min(250, W * 0.44, (chMax - 58) / 0.68));
  const ch = cw * 0.68 + 58;
  const step = Math.max(0, (H - top - endH - ch - 10) / 3);
  const cards = CHAPTERS.map((c, i) => {
    const x = i % 2 === 0 ? W * 0.03 : W - cw - W * 0.03;
    const y = top + i * step;
    return { c, x, y, pin: { x: x + cw / 2, y: y + 6 } };
  });
  const end = { x: W * 0.5, y: H - endH };
  const pts = [...cards.map((k) => k.pin), { x: end.x, y: end.y + 14 }];
  // Sợi chỉ võng nhẹ giữa hai đinh ghim.
  const d = pts.map((p, i) => (i === 0 ? `M${p.x} ${p.y}` : `Q${(pts[i - 1].x + p.x) / 2} ${Math.max(pts[i - 1].y, p.y) + 26} ${p.x} ${p.y}`)).join(" ");

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0" aria-hidden>
      {ready && (
        <>
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="absolute left-1/2 top-0 -translate-x-1/2 -rotate-1 whitespace-nowrap bg-[#efe3c4] px-3 py-1 font-head text-[12px] font-semibold uppercase tracking-[0.18em] text-ink shadow-[0_6px_14px_-6px_rgba(0,0,0,0.7)]"
          >
            Sơ đồ đường dây · 1930 → 1935
          </motion.div>

          {cards.map(({ c, x, y }, i) => (
            <motion.figure
              key={c.no}
              initial={{ opacity: 0, y: 24, rotate: ROT[i] * 2 }}
              animate={{ opacity: 1, y: 0, rotate: ROT[i] }}
              transition={{ delay: 0.45 + i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="print absolute flex flex-col"
              style={{ left: x, top: y, width: cw, height: ch }}
              title={`${ART[c.art].caption}. ${ART[c.art].credit}`}
            >
              <div className="relative min-h-0 flex-1 overflow-hidden bg-[#2a2219]">
                <FilmImage id={c.art} tone="print" camera={null} sizes="260px" />
                <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(40,25,10,0.45)]" />
              </div>
              <figcaption className="mt-1.5 leading-none">
                <span className="block font-head text-[10.5px] font-semibold uppercase tracking-[0.16em] text-stamp">
                  Chương {c.roman} · {c.years}
                </span>
                <span className="mt-1 line-clamp-2 font-head text-[14px] font-bold uppercase leading-[1.05] tracking-wide text-ink">{c.title}</span>
              </figcaption>
            </motion.figure>
          ))}

          {/* sợi chỉ đỏ nối các tấm ảnh, vẽ dần từ chương I tới Đại hội */}
          <svg className="absolute inset-0 h-full w-full overflow-visible">
            <motion.path d={d} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="3" transform="translate(1.5 3)" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.1, duration: 1.6, ease: "easeInOut" }} />
            <motion.path d={d} fill="none" stroke="#c0281c" strokeWidth="2.4" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.1, duration: 1.6, ease: "easeInOut" }} />
            {cards.map(({ pin }, i) => (
              <motion.g key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.75 + i * 0.15, type: "spring", stiffness: 400, damping: 18 }} style={{ originX: `${pin.x}px`, originY: `${pin.y}px` }}>
                <circle cx={pin.x} cy={pin.y + 2} r="7" fill="rgba(0,0,0,0.4)" />
                <circle cx={pin.x} cy={pin.y} r="6.5" fill="#b3261e" stroke="#5e120d" strokeWidth="1.5" />
                <circle cx={pin.x - 2} cy={pin.y - 2} r="2" fill="rgba(255,255,255,0.55)" />
              </motion.g>
            ))}
          </svg>

          {/* đích của đường dây */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2.5, duration: 0.5 }}
            className="absolute flex -translate-x-1/2 flex-col items-center"
            style={{ left: end.x, top: end.y }}
          >
            <PartyFlag width={flagW} pole={false} className="drop-shadow-[0_10px_14px_rgba(0,0,0,0.5)]" />
            <Stamp ink="gold" rotate={-4} delay={2.8} className="-mt-2 whitespace-nowrap bg-[#1f1a14]/70 px-2 text-[12px] text-[#f4c430]">
              Đại hội I · Ma Cao · 3/1935
            </Stamp>
          </motion.div>
        </>
      )}
    </div>
  );
}
