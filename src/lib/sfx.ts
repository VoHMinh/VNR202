"use client";

import { useSyncExternalStore } from "react";

/*
 * Âm thanh tự tạo bằng Web Audio (không dùng tệp âm thanh): tiếng đóng dấu, chuông khi đúng, tiếng trầm khi sai,
 * tiếng tích tắc của đồng hồ. Có thể tắt; lựa chọn được nhớ trên trình duyệt.
 */

const KEY = "mach-ngam:mute";
let ctx: AudioContext | null = null;
let muted = false;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  try {
    muted = localStorage.getItem(KEY) === "1";
  } catch {}
}

function audio(): AudioContext | null {
  if (muted || typeof window === "undefined") return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, at = 0, slideTo?: number) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur: number, gain: number, filter: BiquadFilterType, freq: number, at = 0) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}

export const sfx = {
  /** Dấu mộc đập xuống bàn gỗ. */
  stamp() {
    tone(110, 0.18, "sine", 0.5, 0, 55);
    noise(0.12, 0.35, "lowpass", 900);
  },
  /** Hoàn thành: hai nốt chuông. */
  correct() {
    tone(659, 0.22, "triangle", 0.18, 0.05);
    tone(880, 0.35, "triangle", 0.16, 0.16);
  },
  /** Thất bại: tiếng trầm ngắn. */
  wrong() {
    tone(196, 0.32, "sawtooth", 0.08, 0.04, 140);
  },
  /** Tích tắc đồng hồ. */
  tick() {
    noise(0.03, 0.25, "highpass", 2500);
  },
  /** Hai tiếng gõ cửa gỗ. */
  knock() {
    for (const at of [0, 0.17]) {
      tone(150, 0.07, "sine", 0.28, at, 90);
      noise(0.05, 0.45, "lowpass", 600, at);
    }
  },
  /** Cánh cửa gỗ khép lại. */
  door() {
    tone(72, 0.28, "sine", 0.45, 0, 42);
    noise(0.18, 0.3, "lowpass", 420);
  },
};

export function setMuted(v: boolean) {
  muted = v;
  try {
    localStorage.setItem(KEY, v ? "1" : "0");
  } catch {}
  listeners.forEach((l) => l());
}

/** Trạng thái tắt tiếng, cập nhật khi người dùng bấm nút. */
export function useMuted() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => muted,
    () => false,
  );
}
