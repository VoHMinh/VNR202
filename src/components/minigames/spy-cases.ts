import { SPY_ALIASES, SPY_BASES } from "@/game/data/minis";
import { mulberry32 } from "./shared";

/*
 * Sinh hai vụ cho trò "Kẻ chỉ điểm" từ mốc bắt đầu (cùng mốc thì cùng đề, người chơi khác nhau thì đề khác nhau).
 * Nguyên tắc đơn tuyến: mỗi giao liên chỉ nắm 2–3 cơ sở. Các cơ sở bị phá trùng khít với tập cơ sở của đúng một người.
 * Người bị nghi còn lại là mồi nhử: nắm thừa (đủ các cơ sở bị phá cộng thêm một cơ sở còn an toàn),
 * nắm thiếu (chỉ một phần các cơ sở bị phá) hoặc nắm lẫn (vừa cơ sở bị phá vừa cơ sở an toàn).
 */

export interface SpySuspect {
  alias: string;
  /** Chỉ số các cơ sở người này nắm được, theo thứ tự hiển thị của vụ (đã sắp xếp tăng dần). */
  knows: number[];
}

export interface SpyCase {
  /** Tên vỏ bọc các cơ sở, theo thứ tự hiển thị. */
  bases: string[];
  raided: boolean[];
  suspects: SpySuspect[];
  /** Vị trí kẻ chỉ điểm trong `suspects`. */
  traitor: number;
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
const keyOf = (s: readonly number[]) => [...s].sort((a, b) => a - b).join(",");
const pickOne = <T,>(rnd: Rnd, arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)];

/** Đề hợp lệ: đúng một người nắm khít các cơ sở bị phá, không hai người nào nắm giống nhau, mỗi người nắm 2–3 cơ sở. */
export function checkCase(c: SpyCase): boolean {
  const raided = keyOf(c.raided.flatMap((r, i) => (r ? [i] : [])));
  const keys = c.suspects.map((s) => keyOf(s.knows));
  return (
    c.raided.some((r) => r) &&
    c.raided.some((r) => !r) &&
    keys.filter((k) => k === raided).length === 1 &&
    keys[c.traitor] === raided &&
    new Set(keys).size === keys.length &&
    c.suspects.every((s) => s.knows.length >= 2 && s.knows.length <= 3 && new Set(s.knows).size === s.knows.length && s.knows.every((i) => i >= 0 && i < c.bases.length))
  );
}

/** Vụ hai cơ sở bị phá: kẻ chỉ điểm, một người nắm thừa (bẫy "biết hết các nơi bị phá") và hai người nắm lẫn. */
function setsFor2(rnd: Rnd, R: number[], S: number[]): number[][] {
  const [a, b] = shuffle(rnd, R);
  const [x, y] = shuffle(rnd, S);
  const fourth = pickOne(rnd, [
    [b, x, y],
    [x, y],
    [b, x],
  ]);
  return [[a, b], [a, b, x], [a, y], fourth];
}

/** Vụ ba cơ sở bị phá: kẻ chỉ điểm, hai người nắm thiếu (toàn cơ sở bị phá nhưng chưa đủ), hai người nắm lẫn. */
function setsFor3(rnd: Rnd, R: number[], S: number[]): number[][] {
  const [a, b, c] = shuffle(rnd, R);
  const safe = shuffle(rnd, S);
  const lone = pickOne(rnd, [a, b, c]);
  return [[a, b, c], [a, b], [b, c], [a, c, safe[0]], safe.length >= 3 ? [lone, safe[1], safe[2]] : [lone, safe[1]]];
}

function build(rnd: Rnd, nb: number, nr: number, ns: number): SpyCase {
  for (let attempt = 0; attempt < 40; attempt++) {
    const bases = shuffle(rnd, SPY_BASES).slice(0, nb);
    const order = shuffle(rnd, range(nb));
    const R = order.slice(0, nr).sort((p, q) => p - q);
    const S = order.slice(nr).sort((p, q) => p - q);
    const sets = (nr === 2 ? setsFor2(rnd, R, S) : setsFor3(rnd, R, S)).slice(0, ns);
    const aliases = shuffle(rnd, SPY_ALIASES).slice(0, ns);
    const seat = shuffle(rnd, range(sets.length));
    const suspects = seat.map((k, j) => ({ alias: aliases[j], knows: [...sets[k]].sort((p, q) => p - q) }));
    const c: SpyCase = { bases, raided: range(nb).map((i) => R.includes(i)), suspects, traitor: seat.indexOf(0) };
    if (checkCase(c)) return c;
  }
  return nr === 2 ? FALLBACK[0] : FALLBACK[1];
}

/** Đề dự phòng (không bao giờ cần tới nếu bộ sinh chạy đúng, nhưng giữ cho chắc). */
const FALLBACK: SpyCase[] = [
  {
    bases: ["Hiệu may", "Nhà trọ", "Hiệu sách", "Quán nước"],
    raided: [true, false, true, false],
    suspects: [
      { alias: "Chị Hai", knows: [0, 1, 2] },
      { alias: "Chú Ba", knows: [0, 2] },
      { alias: "Anh Cả", knows: [1, 2, 3] },
      { alias: "Cô Tư", knows: [0, 3] },
    ],
    traitor: 1,
  },
  {
    bases: ["Hiệu thuốc bắc", "Hiệu ảnh", "Xưởng mộc", "Hiệu giặt", "Hiệu sách", "Nhà trọ"],
    raided: [true, false, true, false, true, false],
    suspects: [
      { alias: "Bác Năm", knows: [0, 2] },
      { alias: "Cậu Sáu", knows: [0, 2, 4] },
      { alias: "Ông Đồ", knows: [2, 4, 5] },
      { alias: "Anh Cả", knows: [2, 4] },
      { alias: "Cô Tư", knows: [0, 1, 3] },
    ],
    traitor: 1,
  },
];

/** Hai vụ: vụ 1 có 4 cơ sở, 4 người bị nghi, 2 nơi bị phá; vụ 2 có 5–6 cơ sở, 5 người bị nghi, 3 nơi bị phá. */
export function makeSpyCases(seed: number): SpyCase[] {
  const rnd = mulberry32((Math.floor(seed) ^ 0x51ed270b) >>> 0);
  const first = build(rnd, 4, 2, 4);
  const second = build(rnd, rnd() < 0.5 ? 5 : 6, 3, 5);
  return [first, second];
}
