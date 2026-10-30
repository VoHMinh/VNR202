// Tải ảnh tư liệu (phạm vi công cộng) từ Wikimedia Commons, cắt khung, chuyển sang webp vào public/art
// và ghi kích thước + ảnh mờ tải trước vào src/game/data/art-meta.json.
// Chạy tay khi cần làm lại ảnh: node scripts/fetch-art.mjs   (cần mạng; ảnh gốc được lưu tạm ở .art-cache/)
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const UA = "MachNgamEduGame/1.0 (non-commercial student history project)";
const API = "https://commons.wikimedia.org/w/api.php";
const CACHE = new URL("../.art-cache/", import.meta.url);
const OUT = new URL("../public/art/", import.meta.url);
const META = new URL("../src/game/data/art-meta.json", import.meta.url);

/** crop: [x, y, w, h] theo tỉ lệ 0..1 của ảnh gốc. gray: chuyển đơn sắc. */
const ITEMS = [
  { id: "cao-bang-1930", file: "Vue sur la plaine des rizières - btv1b10103061w.jpg", fetch: 1920, crop: [0.01, 0.01, 0.98, 0.98], width: 1920, gray: true },
  { id: "con-dao-1895", file: "Cochinchine. Poulo Condore, entrée du bagne - (photogr.) A. S(alles) - btv1b53172400v (1 of 3).jpg", fetch: 1920, crop: [0.015, 0.02, 0.965, 0.955], width: 1920, gray: true },
  { id: "macau-1933", file: "USS Isabel (PY-10) in Macao harbor, China, 1933 (NH 80117).jpg", fetch: 1920, crop: [0, 0.03, 1, 0.94], width: 1920, gray: true },
  { id: "son-tay", file: "Labourage des terrains de rizières (Province de Sontay, Tonkin) (Début XXème siècle) - btv1b101205850 (1 of 2).jpg", fetch: 3840, crop: [0.173, 0.27, 0.652, 0.5], width: 1920, gray: true },
  { id: "cay-ruong", file: "Labour de rizière (Tonkin) (Début XXème siècle) - btv1b10120348x (1 of 2).jpg", fetch: 3840, crop: [0.268, 0.36, 0.46, 0.38], width: 1600, gray: true },
  { id: "saigon-1930", file: "Saigon -- Marché central.jpg", fetch: 3840, crop: [0.09, 0.1, 0.82, 0.775], width: 1920, gray: true },
  { id: "vinh-1925", file: "Plan de la ville de Vinh-Ben Thuy (1925).jpg", fetch: 3840, crop: [0.02, 0.1, 0.8, 0.66], width: 1800, gray: false, q: 64 },
  { id: "macau-map", file: "Planta geral da cidade de Macau LOC 96681282.jpg", fetch: 3840, crop: [0.02, 0.02, 0.96, 0.96], width: 1800, gray: false },
  { id: "tran-phu", file: "Tran Phu.gif", fetch: 1280, crop: [0.03, 0.02, 0.94, 0.96], width: 900, gray: true },
  { id: "le-hong-phong", file: "Le Hong Phong.gif", fetch: 0, crop: [0, 0, 1, 1], width: 326, gray: true },
  { id: "ha-huy-tap", file: "Ha Huy Tap.jpg", fetch: 1280, crop: [0.03, 0.02, 0.94, 0.96], width: 640, gray: true },
  { id: "hoa-lo", file: "Truong Chinh mugshot.jpg", fetch: 0, crop: [0, 0, 1, 1], width: 1000, gray: false },
  { id: "hanoi-map-1929", file: "Plan de la ville de Hanoï en 1936.jpg", fetch: 0, crop: [0.422, 0.2194, 0.3845, 0.4075], width: 1920, gray: false, q: 64 },
  { id: "hanoi-play-1929", file: "Plan de la ville de Hanoï en 1936.jpg", fetch: 0, crop: [0.5261, 0.3453, 0.2723, 0.233], width: 1600, gray: false, q: 62 },
  { id: "hanoi-garde-1930", file: "Tonkin, Hanoi - porte d'entrée de la Garde indigène.jpg", fetch: 1920, crop: [0.055, 0.07, 0.89, 0.83], width: 1600, gray: true },
  { id: "rice-1926", file: "La rizière un peu avant la moisson - btv1b101030736.jpg", fetch: 1920, crop: [0.04, 0.04, 0.92, 0.92], width: 1920, gray: true },
  { id: "mine-dong-trieu", file: "Industrie minière en Indochine, années 1920. Mines d'anthracite du Dong Trieu (Tonkin), de la Société des Charbonnages du Dong-Trieu. Transport du charbon par wagonnets, mus manuellement - Agence économique de... - btv1b101114166.jpg", fetch: 1920, crop: [0.035, 0.05, 0.915, 0.89], width: 1920, gray: true },
  { id: "mine-hongay", file: "Industrie minière en Indochine, années 1920. Mines d'anthracite de Hongay, province de Quang-Yen (Tonkin), appartenant à la Société Française des Charbonnages du Tonkin. Coolies au travail sur un chantier... - btv1b10111410h.jpg", fetch: 1920, crop: [0.035, 0.06, 0.915, 0.88], width: 1920, gray: true },
  { id: "nguyen-ai-quoc-1921", file: "Nguyen Aïn Nuä'C (Ho-Chi-Minh), délégué indochinois, Congrès communiste de Marseille, 1921, Meurisse, BNF Gallica.jpg", fetch: 1280, crop: [0, 0, 1, 0.78], width: 900, gray: true },
  { id: "haiphong-map-1929", file: "Plan de la Ville de Haïphong (1929) Service géographique de l'Indochine (Hanoï).jpg", fetch: 0, crop: [0.068, 0.08, 0.864, 0.66], width: 1100, gray: false, q: 72 },
  { id: "hoalo-2012", file: "Hoa Lo Prison, Built by the French, 1896 (9754071781).jpg", fetch: 1920, crop: [0.04, 0.05, 0.92, 0.9], width: 1600, gray: true },
  { id: "haiphong-ship-1906", file: "Stereofotografie Vrachtschip vlakbij Haiphong, SFA219000177.jpg", fetch: 3840, crop: [0.03, 0.08, 0.44, 0.84], width: 1400, gray: true },
  { id: "indochina-1936", file: "Indochine - btv1b53066856x.jpg", fetch: 3840, crop: [0.103, 0.104, 0.81, 0.78], width: 1700, gray: false, q: 62 },
  { id: "bo-cao-1930", file: "Bố cáo của khâm sứ Pháp và đại diện triều đình Đại Nam (Anhxua.vn).jpg", fetch: 0, crop: [0.005, 0.005, 0.99, 0.99], width: 1500, gray: false },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, json) {
  for (let i = 0; i < 6; i++) {
    await sleep(1200);
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (r.status === 429) {
      await sleep(6000 * (i + 1));
      continue;
    }
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return json ? r.json() : Buffer.from(await r.arrayBuffer());
  }
  throw new Error(`Bị giới hạn tốc độ: ${url}`);
}

mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT, { recursive: true });
const meta = {};

for (const it of ITEMS) {
  const raw = fileURLToPath(new URL(`${it.id}.src`, CACHE));
  if (!existsSync(raw)) {
    const q = { action: "query", format: "json", titles: `File:${it.file}`, prop: "imageinfo", iiprop: "url|size" };
    if (it.fetch) q.iiurlwidth = String(it.fetch);
    const j = await get(`${API}?${new URLSearchParams(q)}`, true);
    const ii = Object.values(j.query.pages)[0].imageinfo?.[0];
    if (!ii) throw new Error(`Không thấy tệp: ${it.file}`);
    const url = it.fetch && ii.thumburl && (ii.width > it.fetch || /\.gif$/i.test(it.file)) ? ii.thumburl : ii.url;
    writeFileSync(raw, await get(url, false));
  }

  const img = sharp(raw, { animated: false });
  const { width: W, height: H } = await img.metadata();
  const [cx, cy, cw, ch] = it.crop;
  const region = { left: Math.round(cx * W), top: Math.round(cy * H), width: Math.round(cw * W), height: Math.round(ch * H) };
  let pipe = sharp(raw, { animated: false }).extract(region).resize({ width: Math.min(it.width, region.width), withoutEnlargement: true });
  if (it.gray) pipe = pipe.grayscale().normalise({ lower: 1, upper: 99 });
  const buf = await pipe.webp({ quality: it.q ?? (it.gray ? 70 : 76), effort: 6 }).toBuffer();
  writeFileSync(new URL(`${it.id}.webp`, OUT), buf);

  const out = await sharp(buf).metadata();
  const tiny = await sharp(buf).resize(24).blur(1.2).webp({ quality: 40 }).toBuffer();
  meta[it.id] = { w: out.width, h: out.height, lqip: `data:image/webp;base64,${tiny.toString("base64")}` };
  console.log(`${it.id}.webp  ${out.width}x${out.height}  ${(buf.length / 1024).toFixed(0)} KB`);
}

writeFileSync(META, JSON.stringify(meta, null, 2) + "\n");
console.log("Đã ghi", META.pathname);
