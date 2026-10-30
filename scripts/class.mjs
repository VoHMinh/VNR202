// Chạy game cho cả lớp từ laptop: bật Next.js và mở đường hầm Cloudflare miễn phí (không cần tài khoản).
// Dùng: npm run class   (lệnh này build trước rồi gọi file này)
import { spawn } from "node:child_process";

const PORT = process.env.PORT || "3000";
const children = [];

function run(cmd, args, onLine) {
  const child = spawn(cmd, args, { shell: process.platform === "win32", env: process.env });
  children.push(child);
  const handle = (buf) => {
    for (const line of buf.toString().split(/\r?\n/)) if (line.trim()) onLine(line);
  };
  child.stdout.on("data", handle);
  child.stderr.on("data", handle);
  child.on("exit", (code) => {
    console.log(`[${cmd}] dừng với mã ${code}`);
    shutdown();
  });
  return child;
}

function shutdown() {
  for (const c of children) {
    if (c.exitCode !== null) continue;
    // trên Windows tiến trình con chạy qua cmd: phải hạ cả cây, nếu không cloudflared vẫn chạy ngầm
    if (process.platform === "win32") spawn("taskkill", ["/pid", String(c.pid), "/T", "/F"]);
    else c.kill();
  }
  setTimeout(() => process.exit(0), 300);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

run("npx", ["next", "start", "-p", PORT], (l) => console.log(`[next] ${l}`));

let shown = false;
run("cloudflared", ["tunnel", "--no-autoupdate", "--url", `http://localhost:${PORT}`], (l) => {
  const m = l.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (m && !shown) {
    shown = true;
    const url = m[0];
    console.log("\n" + "═".repeat(64));
    console.log("  MẠCH NGẦM đã mở cho cả lớp");
    console.log(`  Link công khai : ${url}`);
    console.log(`  Tạo phòng      : ${url}/host`);
    console.log("  Mở link /host trên laptop, chiếu mã QR cho cả lớp quét.");
    console.log("═".repeat(64) + "\n");
  } else if (/ERR|error/i.test(l)) {
    console.log(`[tunnel] ${l}`);
  }
});
