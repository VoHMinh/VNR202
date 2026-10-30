import { SPY_EASY, SPY_HARD, type SpyCaseFile } from "@/game/data/minis";
import { mulberry32 } from "./shared";

/*
 * Trò "Kẻ chỉ điểm" (đầu năm 1931): mỗi lượt chơi lấy một vụ dễ rồi một vụ khó (theo mốc bắt đầu, nên bạn ngồi cạnh
 * thường gặp vụ khác), xáo thứ tự lời khai và vật chứng. Người chơi đối chất một lời khai với một vật chứng:
 * đúng cặp mâu thuẫn che giấu lúc kẻ chỉ điểm liên lạc với mật thám thì vạch được hắn.
 */

export interface SpyCase extends SpyCaseFile {
  /** 0: vụ thứ nhất (dễ), 1: vụ thứ hai (khó). */
  level: 0 | 1;
}

type Rnd = () => number;

export function shuffle<T>(rnd: Rnd, arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Xáo thứ tự hiển thị lời khai và vật chứng, đánh lại chỉ số đáp án cho khớp. */
function arrange(rnd: Rnd, c: SpyCaseFile, level: 0 | 1): SpyCase {
  const so = shuffle(rnd, range(c.suspects.length));
  const eo = shuffle(rnd, range(c.evidence.length));
  const s = (old: number) => (old < 0 ? -1 : so.indexOf(old));
  const e = (old: number) => eo.indexOf(old);
  return {
    ...c,
    level,
    suspects: so.map((i) => c.suspects[i]),
    evidence: eo.map((i) => ({ ...c.evidence[i], about: s(c.evidence[i].about) })),
    answer: [s(c.answer[0]), e(c.answer[1])],
    decoy: c.decoy ? [s(c.decoy[0]), e(c.decoy[1]), c.decoy[2]] : undefined,
  };
}

export function makeSpyCases(seed: number): SpyCase[] {
  const rnd = mulberry32((Math.floor(seed) ^ 0x51ed270b) >>> 0);
  const easy = SPY_EASY[Math.floor(rnd() * SPY_EASY.length)];
  const hard = SPY_HARD[Math.floor(rnd() * SPY_HARD.length)];
  return [arrange(rnd, easy, 0), arrange(rnd, hard, 1)];
}

/**
 * Kết quả một lần đối chất: "hit" vạch được kẻ chỉ điểm; "decoy" có mâu thuẫn nhưng chỉ là chuyện vặt;
 * "match" lời khai khớp với vật chứng; "other" vật chứng không nói về người này.
 */
export type Verdict = "hit" | "decoy" | "match" | "other";

export function confront(c: SpyCase, s: number, e: number): Verdict {
  if (c.answer[0] === s && c.answer[1] === e) return "hit";
  if (c.decoy && c.decoy[0] === s && c.decoy[1] === e) return "decoy";
  return c.evidence[e].about === s ? "match" : "other";
}

/** Điểm tối đa từng vụ (vụ khó nhiều hơn), mốc thời gian giải để được trọn điểm, mức trừ mỗi lần đối chất sai. */
export const CASE_MAX = [450, 550] as const;
const FAST = [20, 30];
const SLOW = [60, 75];
export const WRONG = 70;

/** Giải trong mốc FAST thì trọn điểm, chậm dần tới SLOW còn 60%; mỗi lần đối chất sai trừ 70, giải được thì ít nhất còn 1/4. */
export function caseScore(level: 0 | 1, sec: number, wrongs: number) {
  const max = CASE_MAX[level];
  const slow = Math.min(1, Math.max(0, (sec - FAST[level]) / (SLOW[level] - FAST[level])));
  return Math.round(Math.max(max * 0.25, max * (1 - 0.4 * slow) - WRONG * wrongs));
}
