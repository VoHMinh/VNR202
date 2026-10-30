import { MISSIONS, TOTAL } from "@/game/story";
import { tally, type Answer } from "@/game/scoring";
import { normalizeCode, rankPlayers, store } from "@/server/rooms";

/**
 * Nộp kết quả một nhiệm vụ. Không tin điểm do máy người chơi gửi: server tự chấm theo phương án đã chọn,
 * thời gian (bị giới hạn trong thời gian cho phép) và điểm trò chơi nhỏ (giới hạn 0 đến 1000).
 * Nhiệm vụ phải nộp đúng thứ tự; nộp lại một nhiệm vụ đã làm thì giữ kết quả cũ.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/answer">) {
  const code = normalizeCode((await ctx.params).code);
  const room = await store.getRoom(code);
  if (!room) return Response.json({ error: "Không tìm thấy phòng" }, { status: 404 });
  if (room.status === "lobby") return Response.json({ error: "Trận chưa bắt đầu" }, { status: 409 });
  if (room.status === "ended") return Response.json({ error: "Trận đã kết thúc" }, { status: 409 });

  const body = (await request.json().catch(() => null)) as { playerId?: unknown; answer?: Partial<Answer> } | null;
  const id = typeof body?.playerId === "string" ? body.playerId.slice(0, 64) : "";
  const player = id ? await store.getPlayer(code, id) : null;
  if (!player) return Response.json({ error: "Bạn chưa vào phòng này" }, { status: 403 });

  const a = body?.answer ?? {};
  const expected = MISSIONS[player.answers.length];
  if (expected && a.missionId === expected.id) {
    const answer: Answer = {
      missionId: expected.id,
      choice: typeof a.choice === "string" ? a.choice.slice(0, 4) : undefined,
      ms: Number(a.ms) || 0,
      mini: typeof a.mini === "number" ? a.mini : undefined,
    };
    const answers = [...player.answers, answer];
    const now = Date.now();
    await store.savePlayer(code, { ...player, answers, lastSeen: now, finishedAt: answers.length >= TOTAL ? now : player.finishedAt });
  }

  const players = await store.getPlayers(code);
  const me = players.find((p) => p.id === id)!;
  const t = tally(me.answers);
  const ranked = rankPlayers(players);
  const row = ranked.find((r) => r.id === id);
  return Response.json({ total: t.total, done: t.done, last: t.results.at(-1) ?? null, rank: row?.rank ?? null, of: ranked.length });
}
