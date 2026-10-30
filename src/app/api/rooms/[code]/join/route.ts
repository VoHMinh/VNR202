import { BOT_ERROR, cleanName, looksLikeBot, normalizeCode, publicRoom, store } from "@/server/rooms";

/** Vào phòng (hoặc vào lại sau khi tải lại trang). Được vào cả khi trận đã bắt đầu. */
export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/join">) {
  if (looksLikeBot(request.headers.get("user-agent"))) return Response.json({ error: BOT_ERROR }, { status: 403 });
  const code = normalizeCode((await ctx.params).code);
  const room = await store.getRoom(code);
  if (!room) return Response.json({ error: "Không tìm thấy phòng" }, { status: 404 });
  if (room.status === "ended") return Response.json({ error: "Trận trong phòng này đã kết thúc" }, { status: 409 });

  const body = (await request.json().catch(() => null)) as { playerId?: unknown; name?: unknown } | null;
  const id = typeof body?.playerId === "string" ? body.playerId.slice(0, 64) : "";
  const name = cleanName(body?.name);
  if (!id || name.length < 2) return Response.json({ error: "Tên chưa hợp lệ" }, { status: 400 });

  const now = Date.now();
  const existing = await store.getPlayer(code, id);
  await store.savePlayer(code, existing ? { ...existing, name, lastSeen: now } : { id, name, joinedAt: now, lastSeen: now, answers: [] });
  return Response.json(publicRoom(room, await store.getPlayers(code)));
}
