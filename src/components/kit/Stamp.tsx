"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";

const INK = { red: "text-stamp", green: "text-olive", ink: "text-ink", gold: "text-[#a0710c]" };

/** Dấu mộc đóng xuống giấy: rơi từ trên, nảy nhẹ khi chạm. */
export function Stamp({
  children,
  ink = "red",
  rotate = -8,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  ink?: keyof typeof INK;
  rotate?: number;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 2.4, rotate: rotate - 10 }}
      animate={{ opacity: 0.9, scale: 1, rotate }}
      transition={{ delay, type: "spring", stiffness: 520, damping: 22, mass: 0.9 }}
      className={cn("stamp", INK[ink], className)}
    >
      {children}
    </motion.span>
  );
}
