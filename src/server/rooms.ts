// Phòng chơi cho cả lớp. Không cần database:
// - Mặc định: RAM của tiến trình Node + file .data/rooms.json làm bản sao (chạy trên máy tính của giảng viên).
// - Nếu có UPSTASH_REDIS_REST_URL và UPSTASH_REDIS_REST_TOKEN (hoặc KV_REST_API_URL và KV_REST_API_TOKEN do tích hợp
//   Upstash trên Vercel tạo ra): dùng Upstash Redis (khi đưa lên Vercel). Dữ liệu tự hết hạn.
import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { MISSIONS, TOTAL, type MiniGame } from "@/game/story";
import { tally, type Answer } from "@/game/scoring";

export const ROOM_TTL_SECONDS = 24 * 60 * 60;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export type RoomStatus = "lobby" | "playing" | "ended";

export interface RoomMeta {
  code: string;
  title: string;
  hostKey: string;
  createdAt: number;
  status: RoomStatus;
  startedAt?: number;
  endedAt?: number;
}

export interface PlayerDoc {
  id: string;
  name: string;
  joinedAt: number;
  lastSeen: number;
  answers: Answer[];
  finishedAt?: number;
  /** Mốc server ghi khi người chơi bấm bắt đầu từng nhiệm vụ (mã nhiệm vụ → thời điểm). */
  began?: Record<string, number>;
}

/** Thông tin công khai của một người chơi trên bảng xếp hạng. */
export interface PublicPlayer {
  id: string;
  name: string;
  total: number;
  done: number;
  correct: number;
  streak: number;
  finished: boolean;
  rank: number;
  /** Tổng số lần rời màn hình trò chơi trong lúc làm nhiệm vụ. */
  away: number;
  /** Số nhiệm vụ nộp nhanh bất thường hoặc không đối chiếu được thời gian. */
  flags: number;
}

export interface PublicRoom {
  code: string;
  title: string;
  status: RoomStatus;
  startedAt?: number;
  endedAt?: number;
  total: number;
  players: PublicPlayer[];
}

interface Store {
  createRoom(title: string): Promise<RoomMeta>;
  getRoom(code: string): Promise<RoomMeta | null>;
  saveRoom(room: RoomMeta): Promise<void>;
  getPlayers(code: string): Promise<PlayerDoc[]>;
  getPlayer(code: string, id: string): Promise<PlayerDoc | null>;
  savePlayer(code: string, p: PlayerDoc): Promise<void>;
}

function randomCode(len = 4) {
  let s = "";
  for (const b of crypto.getRandomValues(new Uint8Array(len))) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return s;
}

export function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

/**
 * Thời gian tối thiểu (mili giây) để làm xong từng trò chơi nhỏ một cách thật sự, đặt thấp hơn hẳn người chơi nhanh nhất:
 * nộp sớm hơn mức này là bất thường (gửi điểm bằng lệnh, nhờ bot), điểm bị giảm theo tỉ lệ thời gian.
 */
export const MIN_MS: Record<MiniGame, number> = {
  print: 14000,
  sort: 8000,
  protect: 14000,
  spy: 9000,
  sneak: 4000,
  interrogate: 12000,
  timeline: 6000,
  network: 5000,
  ink: 8000,
  cipher: 3500,
  door: 18000,
};
/** Điểm trò chơi nhỏ tối đa khi không có mốc bắt đầu để đối chiếu thời gian. */
export const UNVERIFIED_MINI_CAP = 700;

/** Yêu cầu không đến từ trình duyệt của người thật: chương trình gọi thẳng (curl, Node, Python…) hoặc trình duyệt không giao diện. */
export function looksLikeBot(userAgent: string | null) {
  if (process.env.NODE_ENV !== "production") return false;
  const ua = userAgent ?? "";
  return !ua || /HeadlessChrome|PhantomJS|curl\/|python-requests|python-urllib|aiohttp|node-fetch|undici|axios|Go-http-client|okhttp|Java\/|wget|httpie|postman/i.test(ua);
}
export const BOT_ERROR = "Phát hiện yêu cầu tự động (bot). Hãy chơi bằng trình duyệt thường trên điện thoại hoặc máy tính.";

export function cleanName(name: unknown) {
  return String(name ?? "")
    .replace(/[\u0000-\u001f<>]/g, "")
    .trim()
    .slice(0, 24);
}

/* ───────────────────────── RAM + file ───────────────────────── */

interface MemData {
  rooms: Record<string, RoomMeta>;
  players: Record<string, Record<string, PlayerDoc>>;
}

const DATA_FILE = path.join(process.cwd(), ".data", "rooms.json");
const g = globalThis as unknown as { __machNgamRooms?: { data: MemData; loaded: boolean; timer: NodeJS.Timeout | null } };

class MemoryStore implements Store {
  private get state() {
    if (!g.__machNgamRooms) g.__machNgamRooms = { data: { rooms: {}, players: {} }, loaded: false, timer: null };
    return g.__machNgamRooms;
  }

  private async load() {
    const st = this.state;
    if (st.loaded) return;
    st.loaded = true;
    try {
      const raw = JSON.parse(await readFile(DATA_FILE, "utf8")) as Partial<MemData>;
      // Bỏ dữ liệu của phiên bản cũ (không có hostKey).
      const rooms = Object.fromEntries(Object.entries(raw.rooms ?? {}).filter(([, r]) => (r as RoomMeta).hostKey));
      st.data = { rooms, players: raw.players ?? {} };
    } catch {
      // chưa có file thì bắt đầu trống
    }
    this.prune();
  }

  private prune() {
    const { data } = this.state;
    const cutoff = Date.now() - ROOM_TTL_SECONDS * 1000;
    for (const [code, room] of Object.entries(data.rooms)) {
      if (room.createdAt < cutoff) {
        delete data.rooms[code];
        delete data.players[code];
      }
    }
  }

  private persist() {
    const st = this.state;
    if (st.timer) return;
    st.timer = setTimeout(async () => {
      st.timer = null;
      try {
        await mkdir(path.dirname(DATA_FILE), { recursive: true });
        await writeFile(DATA_FILE, JSON.stringify(st.data));
      } catch (e) {
        console.warn("[mach-ngam] không ghi được .data/rooms.json:", e);
      }
    }, 500);
  }

  async createRoom(title: string) {
    await this.load();
    this.prune();
    const { data } = this.state;
    let code = randomCode();
    while (data.rooms[code]) code = randomCode();
    const room: RoomMeta = { code, title, hostKey: crypto.randomUUID(), createdAt: Date.now(), status: "lobby" };
    data.rooms[code] = room;
    data.players[code] = {};
    this.persist();
    return room;
  }

  async getRoom(code: string) {
    await this.load();
    this.prune();
    return this.state.data.rooms[code] ?? null;
  }

  async saveRoom(room: RoomMeta) {
    await this.load();
    this.state.data.rooms[room.code] = room;
    this.persist();
  }

  async getPlayers(code: string) {
    await this.load();
    return Object.values(this.state.data.players[code] ?? {});
  }

  async getPlayer(code: string, id: string) {
    await this.load();
    return this.state.data.players[code]?.[id] ?? null;
  }

  async savePlayer(code: string, p: PlayerDoc) {
    await this.load();
    (this.state.data.players[code] ??= {})[p.id] = p;
    this.persist();
  }
}

/* ───────────────────────── Upstash Redis (REST) ───────────────────────── */

class RedisStore implements Store {
  constructor(
    private url: string,
    private token: string,
  ) {}

  private async cmd<T = unknown>(...args: (string | number)[]): Promise<T> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    const json = (await res.json()) as { result?: T; error?: string };
    if (!res.ok || json.error) throw new Error(json.error ?? `Redis ${res.status}`);
    return json.result as T;
  }

  async createRoom(title: string) {
    for (let i = 0; i < 8; i++) {
      const room: RoomMeta = { code: randomCode(), title, hostKey: crypto.randomUUID(), createdAt: Date.now(), status: "lobby" };
      const ok = await this.cmd<string | null>("SET", `mn2:room:${room.code}`, JSON.stringify(room), "NX", "EX", ROOM_TTL_SECONDS);
      if (ok) return room;
    }
    throw new Error("Không tạo được mã phòng");
  }

  async getRoom(code: string) {
    const raw = await this.cmd<string | null>("GET", `mn2:room:${code}`);
    return raw ? (JSON.parse(raw) as RoomMeta) : null;
  }

  async saveRoom(room: RoomMeta) {
    await this.cmd("SET", `mn2:room:${room.code}`, JSON.stringify(room), "KEEPTTL");
  }

  // Mỗi người chơi là một trường riêng trong hash, nên nhiều người trả lời cùng lúc không ghi đè lên nhau.
  async getPlayers(code: string) {
    const raw = await this.cmd<string[]>("HVALS", `mn2:players:${code}`);
    return raw.map((r) => JSON.parse(r) as PlayerDoc);
  }

  async getPlayer(code: string, id: string) {
    const raw = await this.cmd<string | null>("HGET", `mn2:players:${code}`, id);
    return raw ? (JSON.parse(raw) as PlayerDoc) : null;
  }

  async savePlayer(code: string, p: PlayerDoc) {
    const key = `mn2:players:${code}`;
    await this.cmd("HSET", key, p.id, JSON.stringify(p));
    await this.cmd("EXPIRE", key, ROOM_TTL_SECONDS);
  }
}

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

export const store: Store = REDIS_URL && REDIS_TOKEN ? new RedisStore(REDIS_URL, REDIS_TOKEN) : new MemoryStore();

/* ───────────────────────── Bảng xếp hạng ───────────────────────── */

/** Xếp hạng: điểm cao hơn đứng trước; bằng điểm thì ai làm được nhiều nhiệm vụ hơn, rồi ai xong sớm hơn. */
export function rankPlayers(players: PlayerDoc[]): PublicPlayer[] {
  const rows = players.map((p) => {
    const t = tally(p.answers);
    return { p, t };
  });
  rows.sort((a, b) => b.t.total - a.t.total || b.t.done - a.t.done || (a.p.finishedAt ?? Infinity) - (b.p.finishedAt ?? Infinity) || a.p.joinedAt - b.p.joinedAt);
  return rows.map(({ p, t }, i) => ({
    id: p.id,
    name: p.name,
    total: t.total,
    done: t.done,
    correct: t.correct,
    streak: t.streak,
    finished: t.done >= TOTAL,
    rank: i + 1,
    away: p.answers.reduce((s, a) => s + (a.away ?? 0), 0),
    flags: p.answers.filter((a) => a.flag === "fast" || a.flag === "unverified").length,
  }));
}

export function publicRoom(room: RoomMeta, players: PlayerDoc[]): PublicRoom {
  return {
    code: room.code,
    title: room.title,
    status: room.status,
    startedAt: room.startedAt,
    endedAt: room.endedAt,
    total: MISSIONS.length,
    players: rankPlayers(players),
  };
}
