"use client";

import { useEffect } from "react";

/** Trình duyệt do chương trình điều khiển (Selenium, Puppeteer, Playwright…) hoặc chạy không giao diện. */
export function isAutomated() {
  if (typeof navigator === "undefined") return false;
  return navigator.webdriver === true || /HeadlessChrome|PhantomJS/i.test(navigator.userAgent);
}

const EVENTS = ["click", "dblclick", "pointerdown", "pointerup", "mousedown", "mouseup", "touchstart", "touchend", "keydown", "keyup", "input", "change", "submit"];

/**
 * Chỉ nhận thao tác của người thật (bản đưa lên mạng): cú bấm, chạm, phím do mã lệnh tạo ra (gõ lệnh trong console,
 * tiện ích tự bấm) có isTrusted = false và bị chặn ngay từ cửa sổ, trước khi tới trò chơi.
 * Bản chạy thử trên máy vẫn nhận để kiểm thử tự động.
 */
export function HumanOnly() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    const guard = (e: Event) => {
      if (e.isTrusted) return;
      e.stopImmediatePropagation();
      e.preventDefault();
    };
    EVENTS.forEach((t) => window.addEventListener(t, guard, true));
    return () => EVENTS.forEach((t) => window.removeEventListener(t, guard, true));
  }, []);
  return null;
}
