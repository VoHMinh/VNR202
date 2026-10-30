import { MISSIONS } from "@/game/story";
import { BOT_ERROR, looksLikeBot, normalizeCode, store } from "@/server/rooms";

/**
 * Ghi mốc bắt đầu một nhiệm vụ theo giờ của server (máy người chơi gọi khi bấm Bắt đầu / Nhận nhiệm vụ).
 * Lúc nộp kết quả, server đo thời gian thật từ mốc này: không thể khai thời gian trả lời nhanh hơn thực tế,
 * và trò chơi nhỏ làm xong nhanh tới mức vô lý thì bị giảm điểm. Nhận mốc cho nhiệm vụ đang làm hoặc nhiệm vụ ngay sau
 * (khi kết quả nhiệm vụ trước còn đang gửi). Mỗi nhiệm vụ chỉ ghi mốc một lần.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/begin">) {
  if (looksLikeBot(request.headers.get("user-agent"))) return Response.json({ error: BOT_ERROR }, { status: 403 });
  const code = normalizeCode((await ctx.params).code);
  const room = await store.getRoom(code);
  if (!room) return Response.json({ error: "Không tìm thấy phòng" }, { status: 404 });
  if (room.status !== "playing") return Response.json({ ok: false });

  const body = (await request.json().catch(() => null)) as { playerId?: unknown; missionId?: unknown } | null;
  const id = typeof body?.playerId === "string" ? body.playerId.slice(0, 64) : "";
  const player = id ? await store.getPlayer(code, id) : null;
  if (!player) return Response.json({ error: "Bạn chưa vào phòng này" }, { status: 403 });

  const k = MISSIONS.findIndex((m) => m.id === body?.missionId);
  const ahead = k - player.answers.length;
  if (k < 0 || ahead < 0 || ahead > 1) return Response.json({ ok: false });
  const missionId = MISSIONS[k].id;
  if (!player.began?.[missionId]) await store.savePlayer(code, { ...player, began: { ...player.began, [missionId]: Date.now() }, lastSeen: Date.now() });
  return Response.json({ ok: true });
}
