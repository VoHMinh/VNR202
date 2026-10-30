import { DELEGATES, DELEGATES_BEFORE, DOOR_LINES, PAPER, type PaperArt, type PaperUnit } from "@/game/data/minis";
import { mulberry32 } from "./shared";

/*
 * "Gác cửa hội trường" (nhiệm vụ 20, cuối tháng 3/1935): ca gác cuối trước giờ khai mạc.
 * Mỗi người gõ cửa đưa một tờ báo tín vật; người chơi so với tờ báo gốc mình giữ.
 * 3 đại biểu cuối cùng mang tờ giống hệt; 3 hoặc 4 người lạ mang tờ có chỗ khác, khó dần:
 * tờ giả đầu tiên khác 2 chỗ rõ ràng (để làm quen), tờ sau khác ít chỗ hơn và nhỏ hơn.
 * Lịch lấy hạt giống từ mốc bắt đầu, nên bạn ngồi cạnh gặp tờ giả khác.
 */

export type Hat = "none" | "fedora" | "cap" | "conical";
export type Coat = "long" | "short" | "robe";
export type Prop = "none" | "bag" | "umbrella" | "case" | "pole" | "satchel";

/** Dáng bóng người: mũ, áo, đồ cầm tay, tỉ lệ rộng / cao, quay trái hay phải. */
export interface Look {
  hat: Hat;
  coat: Coat;
  prop: Prop;
  w: number;
  h: number;
  side: 1 | -1;
}

export interface Visitor {
  /** Thứ tự gõ cửa, từ 1. */
  n: number;
  genuine: boolean;
  /** Ô bị đổi trên tờ báo: mã ô → chỉ số bản khác. */
  diffs: Record<string, number>;
  line: string;
  look: Look;
}

/** Số đại biểu đến trong ca của người chơi (các đại biểu khác đã vào từ trước). */
export const GENUINE = DELEGATES - DELEGATES_BEFORE;

/** Mọi ô chữ trên tờ báo, theo thứ tự đọc. */
export const UNITS: PaperUnit[] = [
  ...PAPER.dateline,
  PAPER.masthead,
  PAPER.sub,
  ...PAPER.headline,
  ...PAPER.news,
  ...PAPER.weather,
  ...PAPER.riddle,
  ...PAPER.ad,
  ...PAPER.sale,
  ...PAPER.lost,
  PAPER.page,
];
const UNIT = Object.fromEntries(UNITS.map((x) => [x.id, x]));
const ART = Object.fromEntries(PAPER.art.map((a) => [a.id, a])) as Record<string, PaperArt>;

/** Chữ hiện trên tờ báo của khách (bản gốc nếu ô đó không bị đổi). */
export const textOf = (unit: PaperUnit, diffs: Record<string, number>) => (unit.id in diffs ? unit.alts[diffs[unit.id]].text : unit.text);
/** Kiểu hình vẽ trên tờ báo của khách ("" là bản gốc). */
export const variantOf = (id: string, diffs: Record<string, number>) => (id in diffs ? ART[id].alts[diffs[id]].variant : "");

/** Mô tả một chỗ khác, để giải thích sau khi chạm trúng (hoặc khi để lọt tờ giả). */
export function describe(id: string, diffs: Record<string, number>) {
  if (id in UNIT) return `«${UNIT[id].alts[diffs[id]].text}» (tờ gốc: «${UNIT[id].text}»)`;
  return ART[id].alts[diffs[id]].desc;
}

/** Điểm: mỗi khách xử lý đúng được trọn phần nếu xong trong FAST giây, chậm dần tới SLOW giây còn một nửa. */
const FAST = 12;
const SLOW = 32;
export const speedFactor = (sec: number) => 1 - 0.5 * Math.min(1, Math.max(0, (sec - FAST) / (SLOW - FAST)));
/** Chạm nhầm vào chỗ giống nhau. */
export const MISS = 20;
/** Để lọt tờ báo giả: bị trừ 0,6 phần điểm của một khách. */
export const FINE_RATIO = 0.6;

/** Nhịp chuyển cảnh (mili giây). */
export const MS = { intro: 1700, approach: 650, verdict: 1700, mistake: 2600, seat: 220, end: 3400 } as const;

interface Change {
  id: string;
  alt: number;
  lv: 1 | 2 | 3;
}
const CHANGES: Change[] = [
  ...UNITS.flatMap((x) => x.alts.map((a, alt) => ({ id: x.id, alt, lv: a.lv }))),
  ...PAPER.art.flatMap((a) => a.alts.map((v, alt) => ({ id: a.id, alt, lv: v.lv }))),
];

const pick = <T>(rnd: () => number, a: readonly T[]) => a[Math.floor(rnd() * a.length)];

function makeLook(rnd: () => number): Look {
  const hat = pick(rnd, ["none", "fedora", "fedora", "cap"] as const);
  const coat = pick(rnd, ["long", "short", "robe"] as const);
  const prop = pick(rnd, ["none", "none", "bag", "umbrella", "case"] as const);
  const w = 0.92 + rnd() * 0.16;
  const h = 0.95 + rnd() * 0.08;
  const side = rnd() < 0.5 ? 1 : -1;
  return { hat, coat, prop, w, h, side };
}

export function makePlan(seed: number): Visitor[] {
  const rnd = mulberry32((seed ^ 0x2c1b3c6d) >>> 0);
  const shuffle = <T>(a: T[]) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const used = new Set<string>();
  const fake = (levels: (1 | 2 | 3)[]) => {
    const diffs: Record<string, number> = {};
    for (const lv of levels) {
      const pool = CHANGES.filter((c) => c.lv === lv && !used.has(c.id) && !(c.id in diffs));
      const c = pick(rnd, pool.length ? pool : CHANGES.filter((x) => x.lv === lv && !(x.id in diffs)));
      diffs[c.id] = c.alt;
      used.add(c.id);
    }
    return diffs;
  };
  // Tờ giả: khác 2 chỗ rõ → 1 chỗ vừa + 1 chỗ nhỏ → 1 chỗ vừa → (1 chỗ rất nhỏ).
  const fakes = [fake([1, 1]), fake([2, 3]), fake([2])];
  if (rnd() < 0.5) fakes.push(fake([3]));
  const rest: Record<string, number>[] = shuffle([fakes[1], fakes[2], ...fakes.slice(3), ...Array.from({ length: GENUINE - 1 }, () => ({}))]);
  // Người đầu tiên mang tờ giả dễ để làm quen, người thứ hai là đại biểu thật để thấy thế nào là "giống hệt".
  const order = [fakes[0], {}, ...rest];
  const lines = shuffle([...DOOR_LINES]);
  return order.map((diffs, i) => ({ n: i + 1, genuine: Object.keys(diffs).length === 0, diffs, line: lines[i % lines.length], look: makeLook(rnd) }));
}
