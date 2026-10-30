import { MISSIONS, type Mission } from "./story";

/*
 * Cách tính điểm (dùng chung cho máy người chơi và server, server tự tính lại để chống sửa điểm):
 * - Quyết định đúng: theo công thức của Kahoot, 1000 × (1 − thời gian trả lời / thời gian cho phép / 2), tức 500 đến 1000 điểm.
 *   Sai hoặc hết giờ: 0 điểm.
 * - Trò chơi nhỏ: 0 đến 1000 điểm theo kết quả; đạt từ 500 trở lên được tính là hoàn thành.
 * - Chuỗi: từ nhiệm vụ hoàn thành thứ hai liên tiếp, thưởng thêm 100 điểm cho mỗi bậc, tối đa 500.
 */

export const STREAK_STEP = 100;
export const STREAK_MAX = 500;
export const PASS_MINI = 500;

export interface Answer {
  missionId: string;
  /** Phương án đã chọn (nhiệm vụ quyết định). Bỏ trống nếu hết giờ. */
  choice?: string;
  /** Thời gian làm nhiệm vụ, tính bằng mili giây. */
  ms: number;
  /** Điểm trò chơi nhỏ, 0 đến 1000. */
  mini?: number;
}

export interface Scored {
  ok: boolean;
  /** Điểm gốc: 500 khi trả lời đúng, hoặc điểm trò chơi nhỏ. */
  base: number;
  /** Điểm thưởng tốc độ (chỉ có ở nhiệm vụ quyết định). */
  speed: number;
  streakBonus: number;
  points: number;
  /** Chuỗi sau nhiệm vụ này. */
  streak: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : hi));

const streakBonus = (streak: number) => Math.min(STREAK_MAX, Math.max(0, streak - 1) * STREAK_STEP);

export function scoreAnswer(m: Mission, a: Answer, prevStreak: number): Scored {
  const limit = m.time * 1000;
  if (m.kind === "decision") {
    const ok = !!m.options.find((o) => o.id === a.choice)?.correct;
    if (!ok) return { ok: false, base: 0, speed: 0, streakBonus: 0, points: 0, streak: 0 };
    const ms = clamp(a.ms, 0, limit);
    const total = Math.round(1000 * (1 - ms / limit / 2));
    const streak = prevStreak + 1;
    const bonus = streakBonus(streak);
    return { ok, base: 500, speed: total - 500, streakBonus: bonus, points: total + bonus, streak };
  }
  const perf = Math.round(clamp(a.mini ?? 0, 0, 1000));
  const ok = perf >= PASS_MINI;
  const streak = ok ? prevStreak + 1 : 0;
  const bonus = ok ? streakBonus(streak) : 0;
  return { ok, base: perf, speed: 0, streakBonus: bonus, points: perf + bonus, streak };
}

export interface Tally {
  total: number;
  streak: number;
  bestStreak: number;
  correct: number;
  done: number;
  results: Scored[];
}

/** Tính lại toàn bộ điểm từ danh sách câu trả lời theo đúng thứ tự nhiệm vụ. Câu trả lời sai thứ tự bị bỏ qua. */
export function tally(answers: Answer[]): Tally {
  const t: Tally = { total: 0, streak: 0, bestStreak: 0, correct: 0, done: 0, results: [] };
  for (const a of answers) {
    const m = MISSIONS[t.done];
    if (!m || a.missionId !== m.id) break;
    const s = scoreAnswer(m, a, t.streak);
    t.results.push(s);
    t.total += s.points;
    t.streak = s.streak;
    t.bestStreak = Math.max(t.bestStreak, s.streak);
    if (s.ok) t.correct += 1;
    t.done += 1;
  }
  return t;
}

export const MAX_SCORE = MISSIONS.length * 1000 + MISSIONS.reduce((sum, _m, i) => sum + streakBonus(i + 1), 0);
