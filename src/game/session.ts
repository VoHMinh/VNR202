"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { MISSIONS, isChapterEnd, PROLOGUE } from "./story";
import { scoreAnswer, tally, type Answer, type Scored } from "./scoring";

/*
 * Trạng thái một lượt chơi trên máy người chơi.
 * Thứ tự màn: (phòng chờ) → mở đầu → mở chương → hồ sơ nhiệm vụ → làm nhiệm vụ → kết quả → … → bảng xếp hạng cuối chương → … → Đại hội → tổng kết.
 */

export type Phase = "lobby" | "prologue" | "chapter" | "brief" | "ready" | "task" | "result" | "board" | "finale" | "done";

export interface Session {
  name: string;
  room: string | null;
  playerId: string;
}

export interface RankInfo {
  rank: number;
  of: number;
}

interface State {
  session: Session;
  phase: Phase;
  step: number;
  index: number;
  answers: Answer[];
  taskStartedAt: number | null;
  rank: RankInfo | null;
  /** Thông báo từ server (vd. chủ phòng đã kết thúc trận). */
  notice: string | null;

  start: (s: Omit<Session, "playerId"> & { playerId?: string }) => void;
  beginStory: () => void;
  nextPrologue: () => void;
  afterChapter: () => void;
  /** Trò chơi nhỏ: hiện thẻ cách chơi trước, đồng hồ chưa chạy. */
  prepareTask: () => void;
  startTask: () => void;
  submit: (a: Omit<Answer, "missionId">) => Scored | null;
  next: () => void;
  afterBoard: () => void;
  afterFinale: () => void;
  setRank: (r: RankInfo | null) => void;
  endByHost: (msg: string) => void;
  restart: () => void;
}

/** Mã người chơi. crypto.randomUUID chỉ có trên https/localhost; vào bằng địa chỉ mạng LAN (http) thì dùng mã dự phòng. */
export const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `p${Date.now()}${Math.random().toString(36).slice(2)}`);

const fresh = { phase: "prologue" as Phase, step: 0, index: 0, answers: [] as Answer[], taskStartedAt: null, rank: null, notice: null };

/** Gửi kết quả lên server (phòng lớp). Thử lại vài lần nếu mạng chập chờn. */
async function sendAnswer(room: string, playerId: string, answer: Answer, onRank: (r: RankInfo) => void, onEnded: (msg: string) => void) {
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(room)}/answer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerId, answer }),
      });
      const data = await res.json();
      if (res.status === 409) return onEnded(data.error ?? "Trận đã kết thúc");
      if (res.ok) {
        if (data.rank) onRank({ rank: data.rank, of: data.of });
        return;
      }
    } catch {
      // mạng lỗi: thử lại
    }
    await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
}

export const useStory = create<State>()(
  persist(
    (set, get) => ({
      session: { name: "", room: null, playerId: "" },
      ...fresh,

      start: (s) => {
        const prev = get().session;
        const playerId = s.playerId || (prev.playerId && prev.room === s.room ? prev.playerId : newId());
        set({ session: { name: s.name, room: s.room, playerId }, ...fresh, phase: s.room ? "lobby" : "prologue" });
      },

      beginStory: () => set({ phase: "prologue", step: 0 }),

      nextPrologue: () => {
        const { step } = get();
        if (step < PROLOGUE.length) set({ step: step + 1 });
        else set({ phase: "chapter" });
      },

      afterChapter: () => set({ phase: "brief" }),

      prepareTask: () => set({ phase: "ready" }),

      startTask: () => set({ phase: "task", taskStartedAt: Date.now() }),

      submit: (a) => {
        const st = get();
        if (st.phase !== "task") return null;
        const m = MISSIONS[st.index];
        const answer: Answer = { missionId: m.id, ...a };
        const prevStreak = tally(st.answers).streak;
        const scored = scoreAnswer(m, answer, prevStreak);
        set({ answers: [...st.answers, answer], phase: "result", taskStartedAt: null });
        const { room, playerId } = st.session;
        if (room) void sendAnswer(room, playerId, answer, (r) => get().setRank(r), (msg) => get().endByHost(msg));
        return scored;
      },

      next: () => {
        const { index } = get();
        if (isChapterEnd(index)) set({ phase: "board" });
        else set({ index: index + 1, phase: "brief" });
      },

      afterBoard: () => {
        const { index } = get();
        if (index >= MISSIONS.length - 1) set({ phase: "finale", step: 0 });
        else set({ index: index + 1, phase: "chapter" });
      },

      afterFinale: () => set({ phase: "done" }),

      setRank: (rank) => set({ rank }),

      endByHost: (msg) => set({ notice: msg, phase: "done" }),

      restart: () => set({ ...fresh, phase: get().session.room ? "lobby" : "prologue" }),
    }),
    {
      name: "mach-ngam:story-v1",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ session: s.session, phase: s.phase, step: s.step, index: s.index, answers: s.answers, taskStartedAt: s.taskStartedAt, rank: s.rank, notice: s.notice }),
    },
  ),
);

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __story?: typeof useStory }).__story = useStory;
}
