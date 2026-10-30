import { DELEGATES, DOOR_PASSWORDS, DOOR_STRANGERS, type DoorStranger } from "@/game/data/minis";
import { mulberry32 } from "./shared";

/*
 * "Gác cửa hội trường" (nhiệm vụ 20, tháng 3/1935): lịch người gõ cửa, giấy tờ của từng người, cách tính điểm.
 * Ba đợt, mỗi đợt thêm một quy định: đợt 1 chỉ so ám hiệu; đợt 2 xem thêm dấu trên giấy giới thiệu;
 * đợt 3 so thêm nửa mảnh giấy xé đôi. Người đầu tiên của mỗi đợt luôn là đại biểu, để người chơi thấy mẫu giấy tờ đúng.
 * Đủ 13 đại biểu (theo giáo trình) và 8 người không hợp lệ: người lạ gõ nhầm cửa, người đáp sai ám hiệu,
 * người mang giấy tờ không khớp. Đại biểu không có tên, không vẽ mặt (chỉ là bóng người).
 * Lịch lấy hạt giống từ mốc bắt đầu nên mỗi lượt chơi một khác.
 */

export type Wave = 1 | 2 | 3;
/** Dấu trên giấy giới thiệu: "ok" là dấu đỏ hình vuông (đúng mẫu). */
export type Seal = "ok" | "round" | "blue" | "none";
export type Flaw = "stranger" | "answer" | "seal" | "slip";
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
  wave: Wave;
  delegate: boolean;
  flaw: Flaw | null;
  /** Câu khách nói ở cửa. */
  line: string;
  /** Giấy giới thiệu (từ đợt 2); null: không có giấy. */
  seal: Seal | null;
  /** Mép xé nửa mảnh giấy của khách (từ đợt 3); null: chưa phải xem. */
  edge: number[] | null;
  /** Nét kẻ trên nửa mảnh giấy của khách lệch bao nhiêu (0 khi khớp). */
  shift: number;
  /** Lý do mời ra (người không hợp lệ). */
  reason: string;
  look: Look;
}

export interface Plan {
  ask: string;
  answer: string;
  /** Mép xé nửa mảnh giấy người gác giữ. */
  edge: number[];
  visitors: Visitor[];
}

/**
 * Ba đợt khách: số đại biểu và những sai sót cần bắt. Đợt 2 và 3 có 5 người sai ở giấy tờ (3 dấu sai mẫu, 2 mảnh giấy
 * không khớp), nên chỉ so ám hiệu mà bỏ qua giấy tờ thì không đủ điểm hoàn thành.
 */
const WAVES: { wave: Wave; delegates: number; flaws: Flaw[] }[] = [
  { wave: 1, delegates: 4, flaws: ["stranger", "answer"] },
  { wave: 2, delegates: 4, flaws: ["seal", "seal", "answer"] },
  { wave: 3, delegates: 5, flaws: ["slip", "slip", "seal"] },
];
export const VISITORS = WAVES.reduce((s, w) => s + w.delegates + w.flaws.length, 0);
/** Khách đầu tiên của mỗi đợt (thứ tự từ 1), cũng là lúc quy định mới bắt đầu áp dụng. */
export const WAVE_START = WAVES.reduce(
  (acc, w, i) => ({ ...acc, [w.wave]: i ? acc[WAVES[i - 1].wave] + WAVES[i - 1].delegates + WAVES[i - 1].flaws.length : 1 }),
  {} as Record<Wave, number>,
);
if (WAVES.reduce((s, w) => s + w.delegates, 0) !== DELEGATES) throw new Error("door-plan: số đại biểu phải đúng 13");

/** Điểm tối đa của một khách: 1000 chia đều cho tất cả khách. */
export const PER = 1000 / VISITORS;
/** Để lọt người không hợp lệ: bị trừ gấp rưỡi điểm một khách (giữ bí mật cuộc họp là trên hết). */
export const FINE = 1.5 * PER;
/** Thời gian xem xét không bị trừ điểm (giây), tăng theo số giấy tờ phải xem. Chậm hơn: mỗi giây bớt 5%, tối đa bớt 20%. */
export const GRACE: Record<Wave, number> = { 1: 2.5, 2: 3.5, 3: 4.5 };

/** Nhịp chuyển cảnh (mili giây). */
export const MS = {
  firstWave: 1300,
  wave: 2100,
  approach: 520,
  leave: 460,
  mistake: 2000,
  seat: 150,
  end: 3400,
} as const;

/** Chấm một quyết định: đúng thì được tới PER điểm (chậm thì bớt), để lọt người không hợp lệ thì bị trừ FINE, mời nhầm đại biểu ra thì 0. */
export function judge(v: Visitor, admit: boolean, sec: number) {
  if (admit === v.delegate) {
    const f = Math.max(0.8, Math.min(1, 1 - 0.05 * Math.max(0, sec - GRACE[v.wave])));
    return { correct: true, points: PER * f };
  }
  return { correct: false, points: admit ? -FINE : 0 };
}

export const SEAL_REASON: Record<Exclude<Seal, "ok">, string> = {
  round: "Dấu hình tròn, sai mẫu",
  blue: "Dấu mực xanh, sai mẫu",
  none: "Giấy không đóng dấu",
};

/** Số điểm gãy trên mép xé (từ trên xuống dưới). */
export const EDGE_N = 7;

function makeEdge(rnd: () => number) {
  const e: number[] = [];
  for (let i = 0; i < EDGE_N; i++) {
    let v = 0;
    for (let k = 0; k < 24; k++) {
      v = Math.round(rnd() * 12 - 6);
      if (i === 0 || Math.abs(v - e[i - 1]) >= 4) break;
    }
    e.push(v);
  }
  return e;
}

/** Hai mép xé khác nhau rõ: ít nhất hai điểm lệch từ 5 đơn vị, tổng độ lệch từ 16. */
function differs(a: number[], b: number[]) {
  let big = 0;
  let sum = 0;
  a.forEach((x, i) => {
    const d = Math.abs(x - b[i]);
    sum += d;
    if (d >= 5) big += 1;
  });
  return big >= 2 && sum >= 16;
}

const pick = <T>(rnd: () => number, a: readonly T[]) => a[Math.floor(rnd() * a.length)];

const STRANGER_LOOK: Record<DoorStranger["kind"], Partial<Look>> = {
  peddler: { hat: "conical", coat: "short", prop: "pole" },
  lost: {},
  lodger: { prop: "case" },
  mail: { hat: "cap", coat: "short", prop: "satchel" },
};

function makeLook(rnd: () => number): Look {
  const hat = pick(rnd, ["none", "fedora", "fedora", "cap"] as const);
  const coat = pick(rnd, ["long", "short", "robe"] as const);
  const prop = pick(rnd, ["none", "none", "bag", "umbrella", "case"] as const);
  const w = 0.92 + rnd() * 0.16;
  const h = 0.95 + rnd() * 0.08;
  const side = rnd() < 0.5 ? 1 : -1;
  return { hat, coat, prop, w, h, side };
}

export function makePlan(seed: number): Plan {
  const rnd = mulberry32((seed ^ 0x5bd1e995) >>> 0);
  const shuffle = <T>(a: T[]) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const pw = pick(rnd, DOOR_PASSWORDS);
  const edge = makeEdge(rnd);
  const wrongs = shuffle([...pw.wrong]);
  const badSeals = shuffle<Exclude<Seal, "ok">>(["round", "blue", "none"]);
  const stranger = pick(rnd, DOOR_STRANGERS);
  let wi = 0;
  let si = 0;
  const visitors: Visitor[] = [];
  for (const w of WAVES) {
    const order: (Flaw | null)[] = [null, ...shuffle<Flaw | null>([...Array<null>(w.delegates - 1).fill(null), ...w.flaws])];
    for (const flaw of order) {
      const v: Visitor = {
        n: visitors.length + 1,
        wave: w.wave,
        delegate: flaw === null,
        flaw,
        line: pw.answer,
        seal: w.wave >= 2 ? "ok" : null,
        edge: w.wave >= 3 ? edge : null,
        shift: 0,
        reason: "",
        look: makeLook(rnd),
      };
      if (flaw === "stranger") {
        v.line = stranger.line;
        v.reason = stranger.who;
        v.seal = null;
        v.edge = null;
        v.look = { ...v.look, ...STRANGER_LOOK[stranger.kind] };
      } else if (flaw === "answer") {
        v.line = wrongs[wi++ % wrongs.length];
        v.reason = "Đáp sai ám hiệu";
      } else if (flaw === "seal") {
        const s = badSeals[si++ % badSeals.length];
        v.seal = s;
        v.reason = SEAL_REASON[s];
      } else if (flaw === "slip") {
        let e = makeEdge(rnd);
        for (let k = 0; k < 40 && !differs(e, edge); k++) e = makeEdge(rnd);
        if (!differs(e, edge)) e = edge.map((x, i) => (i % 2 ? -x : x + (x > 0 ? -7 : 7)));
        v.edge = e;
        v.shift = (rnd() < 0.5 ? -1 : 1) * (6 + Math.floor(rnd() * 4));
        v.reason = "Nửa mảnh giấy không khớp";
      }
      visitors.push(v);
    }
  }
  return { ask: pw.ask, answer: pw.answer, edge, visitors };
}
