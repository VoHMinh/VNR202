import { MISSIONS, TOTAL } from "@/game/story";
import { tally, type Answer } from "@/game/scoring";
import { BOT_ERROR, MIN_MS, UNVERIFIED_MINI_CAP, looksLikeBot, normalizeCode, rankPlayers, store } from "@/server/rooms";

/**
 * Nộp kết quả một nhiệm vụ. Không tin điểm do máy người chơi gửi: server tự chấm theo phương án đã chọn,
 * thời gian (bị giới hạn trong thời gian cho phép) và điểm trò chơi nhỏ (giới hạn 0 đến 1000).
 * Nhiệm vụ phải nộp đúng thứ tự; nộp lại một nhiệm vụ đã làm thì giữ kết quả cũ.
 * Máy người chơi gửi kèm toàn bộ kết quả đã làm (`answers`): lần nộp nào bị mất vì mạng chập chờn
 * sẽ được bù ở lần gửi sau, server chỉ ghi thêm các nhiệm vụ mình còn thiếu, theo đúng thứ tự.
 * Chống gian lận: thời gian làm bài đo bằng giờ của server từ mốc bắt đầu (xem /begin), không tin con số máy gửi lên;
 * trò chơi nhỏ xong nhanh vô lý bị giảm điểm theo tỉ lệ; không có mốc bắt đầu thì giới hạn điểm; yêu cầu tự động bị chặn.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/answer">) {
  if (looksLikeBot(request.headers.get("user-agent"))) return Response.json({ error: BOT_ERROR }, { status: 403 });
  const code = normalizeCode((await ctx.params).code);
  const room = await store.getRoom(code);
  if (!room) return Response.json({ error: "Không tìm thấy phòng" }, { status: 404 });
  if (room.status === "lobby") return Response.json({ error: "Trận chưa bắt đầu" }, { status: 409 });
  if (room.status === "ended") return Response.json({ error: "Trận đã kết thúc" }, { status: 409 });

  const body = (await request.json().catch(() => null)) as { playerId?: unknown; answer?: Partial<Answer>; answers?: unknown } | null;
  const id = typeof body?.playerId === "string" ? body.playerId.slice(0, 64) : "";
  const player = id ? await store.getPlayer(code, id) : null;
  if (!player) return Response.json({ error: "Bạn chưa vào phòng này" }, { status: 403 });

  const incoming = (Array.isArray(body?.answers) ? body.answers.slice(0, TOTAL) : body?.answer ? [body.answer] : []) as Partial<Answer>[];
  const answers = [...player.answers];
  for (const a of incoming) {
    const expected = MISSIONS[answers.length];
    if (!expected) break;
    if (!a || a.missionId !== expected.id) continue; // nhiệm vụ đã ghi rồi, hoặc sai thứ tự
    answers.push({
      missionId: expected.id,
      choice: typeof a.choice === "string" ? a.choice.slice(0, 4) : undefined,
      ms: Math.max(0, Number(a.ms) || 0),
      mini: typeof a.mini === "number" ? a.mini : undefined,
      away: Math.min(99, Math.max(0, Math.floor(Number(a.away) || 0))),
    });
  }
  const now = Date.now();
  const fresh = answers.length - player.answers.length;
  for (let k = player.answers.length; k < answers.length; k++) {
    const m = MISSIONS[k];
    const ans = answers[k];
    const limit = m.time * 1000;
    const began = player.began?.[m.id];
    if (!began) {
      // Không có mốc bắt đầu: không đối chiếu được, không cho điểm tốc độ tối đa, giới hạn điểm trò chơi nhỏ.
      ans.flag = "unverified";
      ans.ms = Math.max(ans.ms, limit / 2);
      if (typeof ans.mini === "number") ans.mini = Math.min(ans.mini, UNVERIFIED_MINI_CAP);
      continue;
    }
    // Thời gian thật tối đa: tới lúc nộp (kết quả mới nhất) hoặc tới lúc bắt đầu nhiệm vụ sau (kết quả gửi bù).
    const latest = k === answers.length - 1;
    const end = latest ? now : (player.began?.[MISSIONS[k + 1].id] ?? now);
    const sms = Math.max(0, end - began);
    ans.sms = sms;
    if (latest && fresh === 1) ans.ms = Math.max(ans.ms, Math.min(limit, sms - 2000)); // trừ 2 giây cho độ trễ mạng
    else ans.flag = "resync";
    if (m.kind === "mini" && sms < MIN_MS[m.game]) {
      ans.flag = "fast";
      if (typeof ans.mini === "number") ans.mini = Math.round((ans.mini * sms) / MIN_MS[m.game]);
    }
  }
  if (fresh > 0) {
    await store.savePlayer(code, { ...player, answers, lastSeen: now, finishedAt: answers.length >= TOTAL ? now : player.finishedAt });
  }

  const players = await store.getPlayers(code);
  const me = players.find((p) => p.id === id)!;
  const t = tally(me.answers);
  const ranked = rankPlayers(players);
  const row = ranked.find((r) => r.id === id);
  return Response.json({ total: t.total, done: t.done, last: t.results.at(-1) ?? null, rank: row?.rank ?? null, of: ranked.length });
}
