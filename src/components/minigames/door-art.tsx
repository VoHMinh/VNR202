"use client";

import { memo } from "react";
import type { Look } from "./door-plan";

/*
 * Bóng khách đứng ở cửa trong trò "Gác cửa hội trường": chỉ là bóng người ngược sáng, không vẽ mặt (đại biểu là người
 * có thật nên không dựng chân dung). Vẽ bằng SVG, không dùng ảnh.
 */

/* ───────────────────────── Bóng khách ───────────────────────── */

/** Các mảng của bóng người trong khung 100×180, chân ở y = 180. */
function figure(look: Look): string[] {
  const p: string[] = ["M45.5 41 h9 v9 h-9 Z"]; // cổ
  if (look.coat === "short") {
    p.push(
      "M30 54 Q50 47 70 54 L72 112 L28 112 Z",
      "M33 110 L48 110 L47 177 L36 177 Z",
      "M52 110 L67 110 L64 177 L53 177 Z",
      "M30 55 Q24 80 26 116 L32 116 Q31 84 36 62 Z",
      "M70 55 Q76 80 74 116 L68 116 Q69 84 64 62 Z",
    );
  } else if (look.coat === "long") {
    p.push(
      "M30 54 Q50 47 70 54 L77 150 L23 150 Z",
      "M36 148 L47 148 L46 177 L37 177 Z",
      "M53 148 L64 148 L63 177 L54 177 Z",
      "M30 55 Q22 85 25 122 L31 122 Q30 88 36 62 Z",
      "M70 55 Q78 85 75 122 L69 122 Q70 88 64 62 Z",
    );
  } else {
    p.push(
      "M31 54 Q50 47 69 54 L74 168 L26 168 Z",
      "M37 166 L47 166 L47 177 L38 177 Z",
      "M53 166 L63 166 L62 177 L53 177 Z",
      "M31 55 Q20 84 22 118 L34 118 Q32 86 37 62 Z",
      "M69 55 Q80 84 78 118 L66 118 Q68 86 63 62 Z",
    );
  }
  p.push("M34 178 a6 2.6 0 1 0 14 0 Z", "M52 178 a6 2.6 0 1 0 14 0 Z"); // giày
  if (look.hat === "fedora") p.push("M40 27 Q41 15 50 15 Q59 15 60 27 Z", "M33 27 a17 3.6 0 1 0 34 0 a17 3.6 0 1 0 -34 0 Z");
  else if (look.hat === "cap") p.push("M38 28 Q38 18 50 18 Q62 18 63 26 L69 28 Q58 30.5 38 28 Z");
  else if (look.hat === "conical") p.push("M21 31 L50 8 L79 31 Q50 35.5 21 31 Z");
  if (look.prop === "bag") p.push("M68 113 h17 v13 a1.5 1.5 0 0 1 -1.5 1.5 h-14 a1.5 1.5 0 0 1 -1.5 -1.5 Z", "M72 113 v-3 h9 v3 h-1.6 v-1.6 h-5.8 v1.6 Z");
  else if (look.prop === "umbrella") p.push("M75 106 h3 L80.5 177 h-2.6 Z", "M75 106 q-1 -7 4.5 -7.5 q4 0 4 4 h-2.4 q0 -1.8 -1.7 -1.8 q-2.6 0.3 -2 5.3 Z");
  else if (look.prop === "case") p.push("M69 149 h24 v18 a2 2 0 0 1 -2 2 h-20 a2 2 0 0 1 -2 -2 Z", "M76 149 v-3.5 h10 v3.5 h-2 v-1.6 h-6 v1.6 Z");
  else if (look.prop === "pole")
    p.push(
      "M2 50 L98 43 L98 46.4 L2 53.4 Z",
      "M7 52 l1.2 0 l-1 34 h-1.2 Z",
      "M17 51.3 l1.2 0 l1 34.7 h-1.2 Z",
      "M1 86 h22 l-3 15 h-16 Z",
      "M83 45.3 l1.2 0 l-1 35.7 h-1.2 Z",
      "M93 44.6 l1.2 0 l1 36.4 h-1.2 Z",
      "M77 81 h22 l-3 15 h-16 Z",
    );
  else if (look.prop === "satchel") p.push("M34 53 L38 51 L73 108 L69 110 Z", "M61 103 h19 v14 a2 2 0 0 1 -2 2 h-15 a2 2 0 0 1 -2 -2 Z");
  return p;
}

/** Bóng khách đứng ngược sáng đèn đường: viền sáng ấm phía sau, không có mặt. Khung 100×180, chân ở y = 180. */
export const Silhouette = memo(function Silhouette({ look }: { look: Look }) {
  const parts = figure(look);
  const flip = `translate(50 180) scale(${(look.w * look.side).toFixed(3)} ${look.h.toFixed(3)}) translate(-50 -180)`;
  return (
    <g transform={flip}>
      {/* viền sáng: vẽ trước bằng nét dày, phần thân tô sau che mất nửa trong */}
      <g fill="#ffcf7a" stroke="#ffcf7a" strokeWidth="3.2" strokeLinejoin="round" opacity="0.55">
        <circle cx="50" cy="32" r="11" />
        {parts.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g fill="#120c07">
        <circle cx="50" cy="32" r="11" />
        {parts.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </g>
  );
});
