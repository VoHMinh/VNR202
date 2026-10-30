import { normalizeCode, publicRoom, store } from "@/server/rooms";

/** Chủ phòng bắt đầu trận: mọi người trong phòng chờ cùng vào chơi. */
export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/start">) {
  const code = normalizeCode((await ctx.params).code);
  const room = await store.getRoom(code);
  if (!room) return Response.json({ error: "Không tìm thấy phòng" }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { hostKey?: unknown } | null;
  if (body?.hostKey !== room.hostKey) return Response.json({ error: "Chỉ chủ phòng mới bắt đầu được trận" }, { status: 403 });
  if (room.status === "lobby") await store.saveRoom({ ...room, status: "playing", startedAt: Date.now() });
  const fresh = (await store.getRoom(code))!;
  return Response.json(publicRoom(fresh, await store.getPlayers(code)));
}
