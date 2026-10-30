"use client";

import { memo } from "react";
import { PAPER, type PaperUnit } from "@/game/data/minis";
import { cn } from "@/lib/cn";
import { textOf, variantOf } from "./door-plan";

/*
 * Tờ báo tín vật "Tin vặt bốn phương" (hư cấu): khổ thiết kế 330×400, co giãn theo khung.
 * Tờ của khách có thể bị đổi vài ô (chữ hoặc hình vẽ); ở chế độ chạm, mỗi ô là một chỗ có thể chạm để chỉ ra chỗ khác.
 */

export const PAPER_W = 330;
export const PAPER_H = 400;

export type Mark = "hit" | "miss" | "reveal";

interface Props {
  diffs: Record<string, number>;
  /** Tờ của khách: các ô chạm được. */
  interactive?: boolean;
  enabled?: boolean;
  marks?: Record<string, Mark>;
  onTap?: (id: string) => void;
  /** Kích thước khung chứa (điểm ảnh); tờ báo được thu phóng để vừa khung. */
  w: number;
  h: number;
}

export const Newspaper = memo(function Newspaper({ diffs, interactive = false, enabled = false, marks = {}, onTap, w, h }: Props) {
  const k = Math.max(0.3, Math.min(w / PAPER_W, h / PAPER_H));
  // Hàm dựng từng ô (gọi trực tiếp, không phải component, để không bị dựng lại mỗi lần vẽ).
  const u = (unit: PaperUnit) => <Unit key={unit.id} id={unit.id} text={textOf(unit, diffs)} mark={marks[unit.id]} interactive={interactive} enabled={enabled} onTap={onTap} />;
  const art = (id: "teapot" | "rooster", className: string) => (
    <Unit id={id} mark={marks[id]} interactive={interactive} enabled={enabled} onTap={onTap} className={cn("inline-block", className)}>
      {id === "teapot" ? <Teapot variant={variantOf(id, diffs)} /> : <Rooster variant={variantOf(id, diffs)} />}
    </Unit>
  );
  return (
    <div style={{ width: PAPER_W * k, height: PAPER_H * k }} className="relative shrink-0">
      <div
        className="absolute left-0 top-0 origin-top-left overflow-hidden rounded-[2px] text-[#231b12] shadow-[0_14px_28px_-12px_rgba(0,0,0,0.85),0_2px_4px_rgba(0,0,0,0.4)]"
        style={{
          width: PAPER_W,
          height: PAPER_H,
          transform: `scale(${k})`,
          background: "radial-gradient(130% 110% at 50% 40%, #ede1c3 55%, #d9c8a0 100%)",
        }}
      >
        <div className="flex h-full flex-col px-3 pb-2 pt-1.5 font-text">
          <div className="flex items-baseline justify-between text-[10px] leading-tight">
            {u(PAPER.dateline[0])}
            <span>
              {u(PAPER.dateline[1])} {u(PAPER.dateline[2])}
            </span>
            {u(PAPER.dateline[3])}
          </div>
          <div className="mt-0.5 text-center font-head text-[27px] font-bold leading-none tracking-[0.05em]">
            {u(PAPER.masthead)}
          </div>
          <div className="text-center text-[10px] italic leading-tight">
            {u(PAPER.sub)}
          </div>
          <div className="my-1 border-y-[3px] border-double border-[#231b12]/80" />
          <div className="flex h-[37px] shrink-0 items-center justify-center text-center font-head text-[16px] font-bold uppercase leading-[1.15] tracking-wide">
            {u(PAPER.headline[0])} {u(PAPER.headline[1])} {u(PAPER.headline[2])}
          </div>
          <div className="my-1 border-t border-[#231b12]/70" />
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-x-2.5 text-[11.5px] leading-[1.35]">
            <div className="border-r border-[#231b12]/40 pr-2">
              <Label>Tin phố</Label>
              <p>
                {u(PAPER.news[0])} {u(PAPER.news[1])} {u(PAPER.news[2])} {u(PAPER.news[3])} {u(PAPER.news[4])}
              </p>
              <Label>Thời tiết</Label>
              <p>
                {u(PAPER.weather[0])} {u(PAPER.weather[1])}
              </p>
              <Label>Đố vui</Label>
              <p>
                {u(PAPER.riddle[0])} {u(PAPER.riddle[1])}
              </p>
              <p className="text-[10.5px] italic">
                {u(PAPER.riddle[2])}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1 border border-[#231b12]/70 px-1 py-0.5">
                {art("teapot", "h-[34px] w-[46px] shrink-0")}
                <div className="min-w-0 leading-tight">
                  <div className="font-head text-[12.5px] font-bold tracking-wide">
                    {u(PAPER.ad[0])}
                  </div>
                  <div className="text-[10.5px] italic">
                    {u(PAPER.ad[1])}
                  </div>
                </div>
              </div>
              <Label>Rao vặt</Label>
              <div className="flex items-start gap-1">
                <p className="min-w-0 flex-1">
                  {u(PAPER.sale[0])} {u(PAPER.sale[1])} {u(PAPER.sale[2])}
                </p>
                {art("rooster", "h-[38px] w-[40px] shrink-0")}
              </div>
              <p className="mt-0.5">
                {u(PAPER.lost[0])} {u(PAPER.lost[1])} {u(PAPER.lost[2])} {u(PAPER.lost[3])}
              </p>
            </div>
          </div>
          <div className="mt-0.5 border-t border-[#231b12]/50 pt-0.5 text-center text-[10px] leading-tight">
            {u(PAPER.page)}
          </div>
        </div>
        {/* vân giấy báo cũ */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0.4 0 0 0 0 0.3 0 0 0 0 0.15 0 0 0 0.35 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
        />
      </div>
    </div>
  );
});

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mt-1 font-head text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#7a1e14] first:mt-0">{children}</div>;
}

function Unit({
  id,
  text,
  children,
  mark,
  interactive,
  enabled,
  onTap,
  className,
}: {
  id: string;
  text?: string;
  children?: React.ReactNode;
  mark?: Mark;
  interactive: boolean;
  enabled: boolean;
  onTap?: (id: string) => void;
  className?: string;
}) {
  const content = children ?? text;
  if (!interactive) {
    return (
      <span data-unit-ref={id} className={cn("rounded-[3px]", mark === "reveal" && "bg-[#f4c430]/60 shadow-[0_0_0_2px_#a35d0c]", className)}>
        {content}
      </span>
    );
  }
  return (
    <span
      role="button"
      tabIndex={-1}
      data-unit={id}
      onPointerDown={(e) => {
        if (!enabled) return;
        e.preventDefault();
        onTap?.(id);
      }}
      className={cn(
        "rounded-[3px] transition-colors",
        enabled && "cursor-pointer hover:bg-[#231b12]/10",
        mark === "hit" && "bg-[#c0281c]/10 shadow-[0_0_0_2px_#c0281c]",
        mark === "reveal" && "bg-[#f4c430]/60 shadow-[0_0_0_2px_#a35d0c]",
        mark === "miss" && "underline decoration-[#4b3f31]/50 decoration-dotted decoration-2 underline-offset-2",
        className,
      )}
    >
      {content}
    </span>
  );
}

/* ───────────── Hình vẽ minh họa trên báo (nét mực) ───────────── */

function Teapot({ variant }: { variant: string }) {
  const steam = variant === "steam" ? [28, 36] : [25, 32, 39];
  return (
    <svg viewBox="0 0 64 46" className="h-full w-full" aria-hidden>
      <g transform={variant === "spout" ? "translate(64 0) scale(-1 1)" : undefined} fill="none" stroke="#231b12" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {steam.map((x) => (
          <path key={x} d={`M${x} 10 q-2.5 -2.5 0 -5 q2.5 -2.5 0 -5`} strokeWidth="1.5" />
        ))}
        <ellipse cx="32" cy="31" rx="16" ry="11" fill="#e3d4b0" />
        <path d="M22 21 Q32 17 42 21" />
        <ellipse cx="32" cy="19.5" rx="9" ry="2.6" fill="#e3d4b0" />
        {variant !== "lid" && <circle cx="32" cy="15.6" r="2.2" fill="#231b12" />}
        <path d="M47 29 Q55 27 60 18" strokeWidth="3" />
        <path d="M16.5 26 Q6 28 16.5 37" />
        <path d="M22 41 L42 41" />
      </g>
    </svg>
  );
}

function Rooster({ variant }: { variant: string }) {
  const tails = variant === "tail" ? ["M19 28 Q8 18 6 8", "M19 30 Q5 23 2 15", "M19 32 Q7 31 3 25"] : ["M19 28 Q8 18 6 8", "M19 29 Q6 22 3 14", "M19 31 Q6 28 2 22", "M19 33 Q8 34 4 30"];
  return (
    <svg viewBox="0 0 56 50" className="h-full w-full" aria-hidden>
      <g transform={variant === "facing" ? "translate(56 0) scale(-1 1)" : undefined} fill="none" stroke="#231b12" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {tails.map((d) => (
          <path key={d} d={d} />
        ))}
        <path d="M18 30 Q20 18 31 20 Q35 12 38 10 Q44 10 43 17 Q42 22 40 26 Q41 38 28 41 Q18 41 18 30 Z" fill="#e3d4b0" />
        <path d="M43 13 L48 15 L43 16.5" fill="#231b12" />
        <circle cx="40.2" cy="13" r="0.9" fill="#231b12" />
        {variant !== "comb" && <path d="M36 9.5 q0.5 -4 2.6 -1.4 q1 -3.6 2.8 -0.6 q2 -2.6 2.6 1.6" fill="#a8291d" stroke="#7a1e14" strokeWidth="1.2" />}
        <path d="M42.5 18 q1.5 3 -0.5 4" stroke="#7a1e14" />
        <path d="M27 41 L26 48 M33 40 L34 48 M23.5 48 L28 48 M32 48 L36.5 48" />
        <path d="M24 30 Q29 34 35 30" strokeWidth="1.3" />
      </g>
    </svg>
  );
}
