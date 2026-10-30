import { normalizeCode, publicRoom, store } from "@/server/rooms";

/** Chủ phòng kết thúc trận: điểm được chốt, không nhận thêm câu trả lời. */
export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/end">) {
  const code = normalizeCode((await ctx.params).code);
  const room = await store.getRoom(code);
  if (!room) return Response.json({ error: "Không tìm thấy phòng" }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { hostKey?: unknown } | null;
  if (body?.hostKey !== room.hostKey) return Response.json({ error: "Chỉ chủ phòng mới kết thúc được trận" }, { status: 403 });
  if (room.status !== "ended") await store.saveRoom({ ...room, status: "ended", endedAt: Date.now(), startedAt: room.startedAt ?? Date.now() });
  const fresh = (await store.getRoom(code))!;
  return Response.json(publicRoom(fresh, await store.getPlayers(code)));
}
