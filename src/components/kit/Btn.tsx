"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

/* Nút kiểu nhãn giấy, chữ in hoa như áp phích. Bấm xuống thì lún nhẹ như ấn con dấu. */
const btn = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-head font-semibold uppercase tracking-[0.08em] transition-[transform,box-shadow,background-color,color] duration-150 active:translate-y-[2px] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
  {
    variants: {
      tone: {
        red: "bg-party text-cream shadow-[0_3px_0_#7d140e,0_10px_22px_-10px_rgba(0,0,0,0.8)] hover:bg-[#e0321f] active:shadow-[0_1px_0_#7d140e]",
        paper: "sheet text-ink shadow-[0_3px_0_#9c8660,0_10px_22px_-10px_rgba(0,0,0,0.8)] hover:brightness-[1.04] active:shadow-[0_1px_0_#9c8660]",
        dark: "bg-[#1b140e] text-cream ring-1 ring-cream/20 shadow-[0_3px_0_#000,0_10px_22px_-10px_rgba(0,0,0,0.9)] hover:bg-[#261c13] active:shadow-[0_1px_0_#000]",
        ghost: "text-cream/80 underline-offset-4 hover:text-cream hover:underline",
        ink: "bg-ink text-paper shadow-[0_3px_0_#000] hover:bg-[#2c241b] active:shadow-[0_1px_0_#000]",
      },
      size: {
        sm: "h-9 rounded-[3px] px-3.5 text-[13px]",
        md: "h-11 rounded-[4px] px-5 text-[15px]",
        lg: "h-14 rounded-[5px] px-7 text-[18px]",
      },
    },
    defaultVariants: { tone: "red", size: "md" },
  },
);

export interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof btn> {}

export const Btn = forwardRef<HTMLButtonElement, BtnProps>(function Btn({ className, tone, size, ...props }, ref) {
  return <button ref={ref} className={cn(btn({ tone, size }), className)} {...props} />;
});
