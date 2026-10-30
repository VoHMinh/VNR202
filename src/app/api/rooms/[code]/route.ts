import { connection } from "next/server";
import { normalizeCode, publicRoom, store } from "@/server/rooms";

/** Trạng thái phòng và bảng xếp hạng trực tiếp (phòng chờ, màn chiếu và máy người chơi cùng hỏi định kỳ). */
export async function GET(_req: Request, ctx: RouteContext<"/api/rooms/[code]">) {
  await connection();
  const code = normalizeCode((await ctx.params).code);
  const room = await store.getRoom(code);
  if (!room) return Response.json({ error: "Không tìm thấy phòng" }, { status: 404 });
  return Response.json(publicRoom(room, await store.getPlayers(code)), { headers: { "cache-control": "no-store" } });
}
