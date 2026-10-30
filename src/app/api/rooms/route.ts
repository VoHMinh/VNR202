import { store } from "@/server/rooms";

/** Tạo phòng mới. Trả về mã phòng và khóa chủ phòng (hostKey) để bắt đầu, kết thúc trận. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { title?: string };
  const title = (typeof body.title === "string" ? body.title : "").trim().slice(0, 60) || "Lớp VNR202";
  const room = await store.createRoom(title);
  return Response.json({ code: room.code, title: room.title, hostKey: room.hostKey }, { status: 201 });
}
