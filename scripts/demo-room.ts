// Tạo phòng thử với người chơi ảo để xem trước phòng chờ, đường đua và bảng xếp hạng.
// Dùng: npm run demo -- [số người=12] [--start] [--play] [--end] [--url=http://localhost:3000]
//   --start  bắt đầu trận ngay sau khi người chơi vào
//   --play   người chơi ảo lần lượt làm nhiệm vụ trong khoảng 90 giây (để xem đường đua chạy)
//   --end    kết thúc trận khi chơi xong (để xem bục vinh danh)
import { MISSIONS } from "../src/game/story";

const args = process.argv.slice(2);
const count = Number(args.find((a) => /^\d+$/.test(a)) ?? 12);
const base = (args.find((a) => a.startsWith("--url="))?.slice(6) ?? "http://localhost:3000").replace(/\/$/, "");
const NAMES = ["Minh Anh", "Gia Huy", "Bảo Trâm", "Đức Thịnh", "Phương Nhi", "Khánh Linh", "Nhật Nam", "Ngọc Hân", "Thảo Vy", "Quốc Bảo", "Hoàng Long", "Tuấn Kiệt", "Mai Chi", "Trọng Nhân", "Thu Hà", "Văn Sơn"];

const post = async (path: string, body: unknown) => {
  const res = await fetch(base + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return res.json();
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const room = await post("/api/rooms", { title: "Phòng thử VNR202" });
  console.log(`Phòng ${room.code} · khóa chủ phòng ${room.hostKey}`);
  console.log(`Màn chủ phòng: ${base}/host/${room.code}  (đặt localStorage "mach-ngam:host:${room.code}" = khóa trên để điều khiển)`);

  const players = Array.from({ length: count }, (_, i) => ({ id: `demo-${i}-${Date.now()}`, name: NAMES[i % NAMES.length] + (i >= NAMES.length ? ` ${i}` : ""), skill: 0.45 + Math.random() * 0.5 }));
  for (const p of players) await post(`/api/rooms/${room.code}/join`, { playerId: p.id, name: p.name });
  console.log(`${players.length} người chơi ảo đã vào phòng.`);

  if (args.includes("--start") || args.includes("--play")) {
    await post(`/api/rooms/${room.code}/start`, { hostKey: room.hostKey });
    console.log("Đã bắt đầu trận.");
  }

  if (args.includes("--play")) {
    for (let step = 0; step < MISSIONS.length; step++) {
      const m = MISSIONS[step];
      await Promise.all(
        players.map(async (p) => {
          await sleep(Math.random() * 6000);
          const ok = Math.random() < p.skill;
          const answer =
            m.kind === "decision"
              ? { missionId: m.id, choice: ok ? m.options.find((o) => o.correct)!.id : m.options.find((o) => !o.correct)!.id, ms: 2000 + Math.random() * (m.time * 1000 - 3000) }
              : { missionId: m.id, mini: ok ? 520 + Math.random() * 480 : Math.random() * 480, ms: m.time * 1000 };
          await post(`/api/rooms/${room.code}/answer`, { playerId: p.id, answer });
        }),
      );
      console.log(`Xong nhiệm vụ ${step + 1}/${MISSIONS.length}`);
    }
  }

  if (args.includes("--end")) {
    await post(`/api/rooms/${room.code}/end`, { hostKey: room.hostKey });
    console.log("Đã kết thúc trận.");
  }
}

void main();
