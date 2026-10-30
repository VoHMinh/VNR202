import META from "./art-meta.json";

/**
 * Ảnh tư liệu dùng trong game. Tất cả lấy từ Wikimedia Commons, thuộc phạm vi công cộng (public domain)
 * hoặc được hiến tặng vào phạm vi công cộng (CC0, ghi ở trường license).
 * Tệp ảnh do scripts/fetch-art.mjs tải và xử lý (cắt khung, chuyển đơn sắc). Không dùng AI vẽ người thật.
 */
export type ArtId = keyof typeof META;

export interface ArtInfo {
  id: ArtId;
  src: string;
  w: number;
  h: number;
  lqip: string;
  /** Chú thích đầy đủ (hiện ở phần nguồn). */
  caption: string;
  /** Chú thích ngắn in đè lên ảnh; mặc định dùng caption. */
  short?: string;
  /** Tác giả hoặc nơi lưu giữ bản gốc. */
  credit: string;
  /** Trang mô tả tệp trên Wikimedia Commons (có thông tin giấy phép). */
  page: string;
  /** Điểm cần giữ trong khung khi ảnh bị cắt (object-position). */
  focus?: string;
  /** Giấy phép, khi khác "phạm vi công cộng". */
  license?: string;
}

const C = "https://commons.wikimedia.org/wiki/File:";

const INFO: Record<ArtId, Omit<ArtInfo, "id" | "src" | "w" | "h" | "lqip">> = {
  "cao-bang-1930": {
    caption: "Cánh đồng lúa ở Cao Bằng (Bắc Kỳ), năm 1930",
    credit: "Thư viện Quốc gia Pháp (BnF)",
    page: C + "Vue_sur_la_plaine_des_rizières_-_btv1b10103061w.jpg",
    focus: "50% 60%",
  },
  "con-dao-1895": {
    caption: "Cổng nhà tù Côn Đảo, ảnh chụp năm 1895",
    credit: "André Salles, Thư viện Quốc gia Pháp (BnF)",
    page: C + "Cochinchine._Poulo_Condore,_entrée_du_bagne_-_(photogr.)_A._S(alles)_-_btv1b53172400v_(1_of_3).jpg",
    focus: "30% 55%",
  },
  "macau-1933": {
    caption: "Cảng Ma Cao năm 1933",
    credit: "Cục Lịch sử và Di sản Hải quân Hoa Kỳ (NH 80117)",
    page: C + "USS_Isabel_(PY-10)_in_Macao_harbor,_China,_1933_(NH_80117).jpg",
    focus: "50% 45%",
  },
  "son-tay": {
    caption: "Nông dân cày ruộng ở Sơn Tây (Bắc Kỳ), đầu thế kỷ XX",
    credit: "Viện Nông học thuộc địa, Thư viện Quốc gia Pháp (BnF)",
    page: C + "Labourage_des_terrains_de_rizières_(Province_de_Sontay,_Tonkin)_(Début_XXème_siècle)_-_btv1b101205850_(1_of_2).jpg",
    focus: "55% 55%",
  },
  "cay-ruong": {
    caption: "Cày ruộng ở Bắc Kỳ, đầu thế kỷ XX",
    credit: "Viện Nông học thuộc địa, Thư viện Quốc gia Pháp (BnF)",
    page: C + "Labour_de_rizière_(Tonkin)_(Début_XXème_siècle)_-_btv1b10120348x_(1_of_2).jpg",
    focus: "40% 60%",
  },
  "saigon-1930": {
    caption: "Chợ Bến Thành, Sài Gòn, năm 1930",
    short: "Chợ Bến Thành, Sài Gòn, 1930",
    credit: "Hàng không quân sự Pháp ở Đông Dương",
    page: C + "Saigon_--_Marché_central.jpg",
    focus: "50% 45%",
  },
  "vinh-1925": {
    caption: "Bản đồ thành phố Vinh – Bến Thủy (1925), có một phần phủ Hưng Nguyên",
    short: "Bản đồ Vinh – Bến Thủy (1925)",
    credit: "Sở Địa dư Đông Dương, Thư viện Quốc gia Pháp (BnF)",
    page: C + "Plan_de_la_ville_de_Vinh-Ben_Thuy_(1925).jpg",
    focus: "30% 50%",
  },
  "macau-map": {
    caption: "Bản đồ thành phố Ma Cao, thập niên 1930",
    short: "Bản đồ Ma Cao, thập niên 1930",
    credit: "Sở Công chính Ma Cao, Thư viện Quốc hội Hoa Kỳ",
    page: C + "Planta_geral_da_cidade_de_Macau_LOC_96681282.jpg",
    focus: "45% 45%",
  },
  "tran-phu": {
    caption: "Đồng chí Trần Phú (1904–1931), Tổng Bí thư đầu tiên của Đảng",
    credit: "Không rõ tác giả",
    page: C + "Tran_Phu.gif",
    focus: "50% 30%",
  },
  "le-hong-phong": {
    caption: "Đồng chí Lê Hồng Phong (1902–1942)",
    credit: "Không rõ tác giả",
    page: C + "Le_Hong_Phong.gif",
    focus: "50% 30%",
  },
  "ha-huy-tap": {
    caption: "Đồng chí Hà Huy Tập (1906–1941)",
    credit: "Không rõ tác giả",
    page: C + "Ha_Huy_Tap.jpg",
    focus: "50% 30%",
  },
  "hoa-lo": {
    caption: "Ảnh hồ sơ mật thám Pháp chụp đồng chí Đặng Xuân Khu (Trường Chinh), tù chính trị ở nhà tù Hỏa Lò",
    short: "Ảnh hồ sơ mật thám: Đặng Xuân Khu (Trường Chinh) ở Hỏa Lò",
    credit: "Chính quyền thực dân Pháp ở Đông Dương",
    page: C + "Truong_Chinh_mugshot.jpg",
    focus: "50% 40%",
  },
  "hanoi-map-1929": {
    caption: "Bản đồ thành phố Hà Nội do Sở Địa dư Đông Dương in, ấn bản tháng 11 năm 1929 (tỉ lệ 1:10 000), phần trung tâm quanh hồ Hoàn Kiếm",
    short: "Bản đồ Hà Nội, ấn bản 11/1929",
    credit: "Sở Địa dư Đông Dương, Thư viện Quốc gia Pháp (BnF)",
    page: C + "Plan_de_la_ville_de_Hanoï_en_1936.jpg",
    focus: "60% 55%",
  },
  "hanoi-play-1929": {
    caption: "Bản đồ thành phố Hà Nội do Sở Địa dư Đông Dương in, ấn bản tháng 11 năm 1929 (tỉ lệ 1:10 000): khu phố cổ, hồ Hoàn Kiếm, ga Hà Nội và khu phố Tây",
    short: "Bản đồ Hà Nội, ấn bản 11/1929",
    credit: "Sở Địa dư Đông Dương, Thư viện Quốc gia Pháp (BnF)",
    page: C + "Plan_de_la_ville_de_Hanoï_en_1936.jpg",
  },
  "hanoi-garde-1930": {
    caption: "Cổng trại Lính khố xanh (Garde indigène) ở Hà Nội, khoảng năm 1930",
    short: "Cổng trại Lính khố xanh, Hà Nội, khoảng 1930",
    credit: "Sở Nhiếp ảnh – Điện ảnh Đông Dương, Thư viện Tòa Thị chính Paris",
    page: C + "Tonkin,_Hanoi_-_porte_d'entrée_de_la_Garde_indigène.jpg",
    license: "CC0 (hiến tặng vào phạm vi công cộng)",
    focus: "50% 55%",
  },
  "rice-1926": {
    caption: "Ruộng lúa sắp gặt ở Hà Đông (Bắc Kỳ), năm 1926",
    short: "Ruộng lúa ở Hà Đông, 1926",
    credit: "Thư viện Quốc gia Pháp (BnF)",
    page: C + "La_rizière_un_peu_avant_la_moisson_-_btv1b101030736.jpg",
    focus: "50% 55%",
  },
  "mine-dong-trieu": {
    caption: "Công nhân đẩy goòng chở than ở mỏ than Đông Triều (Bắc Kỳ), thập niên 1920",
    short: "Phu mỏ đẩy goòng than, Đông Triều, thập niên 1920",
    credit: "Cơ quan Kinh tế Đông Dương, Thư viện Quốc gia Pháp (BnF)",
    page: C + "Industrie_minière_en_Indochine,_années_1920._Mines_d'anthracite_du_Dong_Trieu_(Tonkin),_de_la_Société_des_Charbonnages_du_Dong-Trieu._Transport_du_charbon_par_wagonnets,_mus_manuellement_-_Agence_économique_de..._-_btv1b101114166.jpg",
    focus: "45% 60%",
  },
  "mine-hongay": {
    caption: "Phu mỏ làm việc trên một công trường của mỏ than Hòn Gai (tỉnh Quảng Yên, Bắc Kỳ), thập niên 1920",
    short: "Phu mỏ ở mỏ than Hòn Gai, thập niên 1920",
    credit: "Cơ quan Kinh tế Đông Dương, Thư viện Quốc gia Pháp (BnF)",
    page: C + "Industrie_minière_en_Indochine,_années_1920._Mines_d'anthracite_de_Hongay,_province_de_Quang-Yen_(Tonkin),_appartenant_à_la_Société_Française_des_Charbonnages_du_Tonkin._Coolies_au_travail_sur_un_chantier..._-_btv1b10111410h.jpg",
    focus: "50% 40%",
  },
  "nguyen-ai-quoc-1921": {
    caption: "Nguyễn Ái Quốc, đại biểu Đông Dương tại Đại hội Đảng Cộng sản Pháp ở Marseille, ngày 26 tháng 12 năm 1921",
    short: "Nguyễn Ái Quốc ở Marseille, 1921",
    credit: "Hãng ảnh Meurisse, Thư viện Quốc gia Pháp (BnF)",
    page: C + "Nguyen_Aïn_Nuä'C_(Ho-Chi-Minh),_délégué_indochinois,_Congrès_communiste_de_Marseille,_1921,_Meurisse,_BNF_Gallica.jpg",
    focus: "50% 35%",
  },
  "haiphong-map-1929": {
    caption: "Bản đồ thành phố Hải Phòng do Sở Địa dư Đông Dương in, ấn bản tháng 12 năm 1929 (tỉ lệ 1:10 000); cảng nằm bên sông Cấm",
    short: "Bản đồ Hải Phòng, ấn bản 12/1929",
    credit: "R. Monot (Sở Địa dư Đông Dương), Thư viện Quốc gia Pháp (BnF)",
    page: C + "Plan_de_la_Ville_de_Haïphong_(1929)_Service_géographique_de_l'Indochine_(Hanoï).jpg",
    focus: "50% 45%",
  },
  "hoalo-2012": {
    caption: "Cổng nhà tù Hỏa Lò (Maison Centrale) ở Hà Nội, do thực dân Pháp xây năm 1896; ảnh chụp năm 2012",
    short: "Cổng nhà tù Hỏa Lò (ảnh chụp năm 2012)",
    credit: "Gary Todd",
    page: C + "Hoa_Lo_Prison,_Built_by_the_French,_1896_(9754071781).jpg",
    focus: "50% 55%",
    license: "CC0 (hiến tặng vào phạm vi công cộng)",
  },
  "haiphong-ship-1906": {
    caption: "Tàu hàng gần cảng Hải Phòng, khoảng năm 1906–1907",
    short: "Tàu hàng gần Hải Phòng, khoảng 1906–1907",
    credit: "J. G. Mulder",
    page: C + "Stereofotografie_Vrachtschip_vlakbij_Haiphong,_SFA219000177.jpg",
    focus: "55% 55%",
  },
  "indochina-1936": {
    caption: "Bản đồ Đông Dương thuộc Pháp do Sở Địa dư Đông Dương in năm 1936 (tỉ lệ 1:3 000 000)",
    short: "Bản đồ Đông Dương, 1936",
    credit: "Sở Địa dư Đông Dương, Thư viện Quốc gia Pháp (BnF)",
    page: C + "Indochine_-_btv1b53066856x.jpg",
    focus: "60% 40%",
  },
  "bo-cao-1930": {
    caption: "Bố cáo ba thứ chữ (Pháp, Hán, quốc ngữ) của Khâm sứ Trung Kỳ và đại diện triều đình Huế ký tại Vinh ngày 3 tháng 9 năm 1930, đối phó với phong trào Xô viết Nghệ – Tĩnh",
    short: "Bố cáo ở Vinh, 3/9/1930",
    credit: "Chính quyền bảo hộ Pháp ở Trung Kỳ (bản số hóa: anhxua.vn)",
    page: C + "Bố_cáo_của_khâm_sứ_Pháp_và_đại_diện_triều_đình_Đại_Nam_(Anhxua.vn).jpg",
    focus: "30% 50%",
  },
};

export const ART = Object.fromEntries(
  (Object.keys(META) as ArtId[]).map((id) => [id, { id, src: `/art/${id}.webp`, ...META[id], ...INFO[id] }]),
) as Record<ArtId, ArtInfo>;

export const ART_LICENSE = "Phạm vi công cộng, qua Wikimedia Commons";
