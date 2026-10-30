import type { MiniGame } from "../story";

/*
 * Nội dung của các trò chơi nhỏ. Mọi chi tiết lịch sử nằm ở đây để dễ đối chiếu nguồn
 * (xem `sources` của nhiệm vụ tương ứng trong story.ts). Các trò chơi chỉ lấy nội dung từ tệp này.
 * Phần hư cấu (lý lịch giả, bí danh, tên hiệu buôn, lời dặn trong thư) được ghi rõ là hư cấu.
 */

/* ───────────── Nhiệm vụ 3 · Sắc lệnh của Xô viết (xếp yết thị vào ba bảng) ───────────── */

export const SORT_BOARDS = ["Chính trị", "Kinh tế", "Văn hóa – xã hội"] as const;
export type SortBoard = (typeof SORT_BOARDS)[number];

/** Chính sách của chính quyền Xô viết Nghệ – Tĩnh (1930–1931), theo giáo trình và tài liệu đã dẫn. */
export const SORT_CARDS: { text: string; board: SortBoard }[] = [
  { text: "Nhân dân được tự do hội họp, tham gia nông hội, công hội", board: "Chính trị" },
  { text: "Trấn áp bọn phản cách mạng", board: "Chính trị" },
  { text: "Nông hội đứng ra điều hành mọi việc trong làng", board: "Chính trị" },
  { text: "Chia ruộng đất công cho dân cày nghèo", board: "Kinh tế" },
  { text: "Bãi bỏ thuế thân, thuế chợ, thuế đò, thuế muối", board: "Kinh tế" },
  { text: "Xóa nợ cho người nghèo, buộc địa chủ giảm tô", board: "Kinh tế" },
  { text: "Mở lớp dạy chữ quốc ngữ ở đình làng", board: "Văn hóa – xã hội" },
  { text: "Bài trừ mê tín dị đoan, rượu chè, cờ bạc", board: "Văn hóa – xã hội" },
  { text: "Giữ vững trật tự trị an, chống trộm cắp", board: "Văn hóa – xã hội" },
];

/* ───────────── Nhiệm vụ 7 · Kẻ chỉ điểm (suy luận theo nguyên tắc đơn tuyến) — hư cấu ───────────── */

/** Bí danh của các giao liên bị nghi (hư cấu). */
export const SPY_ALIASES = ["Anh Cả", "Chị Hai", "Chú Ba", "Cô Tư", "Bác Năm", "Cậu Sáu", "Ông Đồ"];
/** Tên vỏ bọc của các cơ sở (hư cấu, dùng chung với trò Đêm vây ráp). */
export const SPY_BASES = ["Hiệu may", "Hiệu thuốc bắc", "Nhà trọ", "Hiệu sách", "Quán nước", "Hiệu ảnh", "Xưởng mộc", "Hiệu giặt"];

/* ───────────── Nhiệm vụ 10 · Hỏi cung (nhớ lý lịch giả) — hư cấu ───────────── */

/** Các ô trong lý lịch giả. Mỗi lượt chơi lấy ngẫu nhiên một giá trị cho mỗi ô. */
export const COVER_FIELDS: { key: string; label: string; question: string; pool: string[] }[] = [
  { key: "name", label: "Họ tên", question: "Mày tên thật là gì?", pool: ["Nguyễn Văn Tâm", "Trần Văn Lộc", "Lê Văn Thịnh", "Phạm Văn Hòa", "Đỗ Văn Lâm", "Vũ Văn Phúc"] },
  { key: "home", label: "Quê quán", question: "Quê ở đâu?", pool: ["Nam Định", "Thái Bình", "Hà Đông", "Bắc Ninh", "Hưng Yên", "Sơn Tây"] },
  { key: "job", label: "Nghề nghiệp", question: "Làm nghề gì để sống?", pool: ["thợ may", "phu kéo xe", "thợ mộc", "bán hàng rong", "thợ cắt tóc", "phu bến tàu"] },
  { key: "year", label: "Lên Hà Nội năm", question: "Lên Hà Nội từ năm nào?", pool: ["1927", "1928", "1929", "1930"] },
  { key: "lodging", label: "Ở trọ", question: "Ở trọ phố nào?", pool: ["phố Hàng Bông", "phố Hàng Bồ", "phố Hàng Đào", "phố Hàng Bạc", "phố Hàng Gai", "phố Hàng Buồm"] },
];

/** Câu hỏi gài bẫy: đáp án đúng luôn là không khai, không nhận, không ký. */
export const TRAP_QUESTIONS: { question: string; right: string; wrong: [string, string] }[] = [
  {
    question: "Thằng đưa thư khai mày là người phát truyền đơn. Mày nhận đi!",
    right: "Tôi không biết truyền đơn nào cả.",
    wrong: ["Tôi chỉ cầm hộ có một lần.", "Nó khai sai, người phát là người khác."],
  },
  {
    question: "Mày có quen người tên Ba ở Vinh không?",
    right: "Tôi không quen ai tên Ba.",
    wrong: ["Có biết qua loa thôi.", "Anh ấy về quê lâu rồi."],
  },
  {
    question: "Ký vào tờ này thì được thả ngay. Ký không?",
    right: "Tôi không có tội gì để ký.",
    wrong: ["Cho tôi đọc trước rồi ký.", "Ký thì được về thật chứ?"],
  },
  {
    question: "Đồng bọn mày khai hết rồi. Còn chối nữa à?",
    right: "Tôi không có đồng bọn nào.",
    wrong: ["Họ khai gì thì tôi khai thế.", "Tôi chỉ biết một người thôi."],
  },
];

/* ───────────── Nhiệm vụ 12 · Bài cho báo Đuốc đưa đường (xếp sự kiện theo thời gian) ───────────── */

/** Các sự kiện 1930–1931, `order` là thứ tự thời gian thật. `core`: luôn có mặt (các cặp dễ nhầm). */
export const TIMELINE_EVENTS: { id: string; text: string; date: string; order: number; core: boolean }[] = [
  { id: "lap-dang", text: "Hội nghị hợp nhất các tổ chức cộng sản, thành lập Đảng Cộng sản Việt Nam", date: "Đầu năm 1930", order: 1, core: false },
  { id: "1-5", text: "Công nhân, nông dân khắp ba kỳ mít tinh, biểu tình ngày Quốc tế Lao động", date: "1/5/1930", order: 2, core: false },
  { id: "hung-nguyen", text: "Máy bay Pháp ném bom đoàn biểu tình của nông dân Hưng Nguyên", date: "12/9/1930", order: 3, core: true },
  { id: "luan-cuong", text: "Hội nghị Trung ương lần thứ nhất ở Hương Cảng thông qua Luận cương chính trị", date: "10/1930", order: 4, core: true },
  { id: "tran-phu-bat", text: "Tổng Bí thư Trần Phú bị địch bắt ở Sài Gòn", date: "4/1931", order: 5, core: true },
  { id: "naq-bat", text: "Nguyễn Ái Quốc bị nhà cầm quyền Anh bắt ở Hương Cảng", date: "6/1931", order: 6, core: true },
  { id: "tran-phu-mat", text: "Tổng Bí thư Trần Phú hy sinh ở Sài Gòn", date: "6/9/1931", order: 7, core: false },
];
/** Số mẩu tin mỗi lượt: các sự kiện `core` cộng thêm vài sự kiện khác chọn ngẫu nhiên. */
export const TIMELINE_COUNT = 6;

/* ───────────── Nhiệm vụ 17 · Thư viết bằng nước chanh — lời dặn là hư cấu ───────────── */

/** Lá thư che mắt (hiện sẵn). */
export const INK_COVER = [
  "Kính gửi thầy mẹ,",
  "Con ở Hải Phòng vẫn được khỏe. Năm nay giá gạo lại lên, thầy mẹ đừng gửi thêm tiền ra cho con.",
  "Ngoài này trời đã ấm, con vẫn đi làm đều. Con mong thầy mẹ giữ gìn sức khỏe.",
  "Con kính thư.",
];

/** Lời dặn viết bằng nước chanh (chỉ hiện khi hơ nóng). Mỗi lượt chơi chọn một giá trị cho mỗi chỗ trống. */
export const INK_SLOTS = {
  date: ["rằm tháng Hai", "mồng mười tháng Hai", "ngày hai mươi tháng Hai"],
  person: ["người bán thuốc bắc", "bà hàng nước", "ông thợ chữa đồng hồ"],
  phrase: ["hỏi mua hai lạng cao hổ cốt", "hỏi mua ba lạng chè Thái Nguyên", "hỏi mua nửa cân thuốc lào Tiên Lãng"],
} as const;

export const INK_HIDDEN = (v: { date: string; person: string; phrase: string }) => [
  "Mỗi xứ cử đại biểu, giữ kín ngày đi.",
  `Có mặt ở Hải Phòng trước ${v.date}.`,
  `Tìm ${v.person} ở đầu bến tàu.`,
  `Ám hiệu: ${v.phrase}.`,
];

/** Câu hỏi sau khi đọc thư (chọn một trong ba), đáp án lấy từ chỗ trống tương ứng. */
export const INK_QUESTIONS: { slot: keyof typeof INK_SLOTS; question: string }[] = [
  { slot: "person", question: "Theo lời dặn, đại biểu phải tìm gặp ai?" },
  { slot: "date", question: "Đại biểu phải có mặt ở Hải Phòng trước ngày nào?" },
  { slot: "phrase", question: "Ám hiệu để người liên lạc nhận ra là gì?" },
];

/* ───────────── Nhiệm vụ 20 · Gác cửa hội trường (Ma Cao, 3/1935) — ám hiệu, giấy tờ là hư cấu ───────────── */

/** Số đại biểu dự Đại hội I (theo giáo trình). */
export const DELEGATES = 13;

/**
 * Ám hiệu hỏi – đáp của ngày họp (hư cấu; các nguồn chỉ ghi Đại hội họp bí mật tại một địa điểm ở phố Quan Công).
 * Mỗi lượt chơi lấy một cặp. `wrong`: câu đáp gần đúng, mỗi câu chỉ khác câu đúng một chữ.
 */
export const DOOR_PASSWORDS: { ask: string; answer: string; wrong: string[] }[] = [
  { ask: "Ông tìm ai?", answer: "Tôi tìm chú Ba bán chè.", wrong: ["Tôi tìm chú Tư bán chè.", "Tôi tìm chú Ba bán vải.", "Tôi tìm thím Ba bán chè."] },
  {
    ask: "Ông đến có việc gì?",
    answer: "Tôi mang thư của chị Hai ở Hương Cảng.",
    wrong: ["Tôi mang thư của chị Ba ở Hương Cảng.", "Tôi mang thư của chị Hai ở Quảng Châu.", "Tôi mang quà của chị Hai ở Hương Cảng."],
  },
  { ask: "Hàng đã về chưa?", answer: "Hàng về từ mồng bốn, còn hai kiện.", wrong: ["Hàng về từ mồng năm, còn hai kiện.", "Hàng về từ mồng bốn, còn ba kiện.", "Hàng về từ mồng bốn, còn hai thùng."] },
  { ask: "Ông cần mua gì?", answer: "Hai cân chè Thái, gói giấy đỏ.", wrong: ["Ba cân chè Thái, gói giấy đỏ.", "Hai cân chè Thái, gói giấy vàng.", "Hai cân chè mạn, gói giấy đỏ."] },
];

/** Người lạ gõ nhầm cửa (hư cấu): không biết ám hiệu, không mang giấy tờ. */
export interface DoorStranger {
  kind: "peddler" | "lost" | "lodger" | "mail";
  line: string;
  who: string;
}
export const DOOR_STRANGERS: DoorStranger[] = [
  { kind: "peddler", line: "Bánh bao nóng đây! Ông mua giúp vài cái?", who: "Người bán hàng rong gõ nhầm cửa" },
  { kind: "lost", line: "Xin lỗi, nhà ông thợ may họ Lý có phải ở đây không?", who: "Người hỏi nhầm nhà" },
  { kind: "lodger", line: "Ở đây có cho thuê phòng trọ không ông?", who: "Người tìm phòng trọ gõ nhầm cửa" },
  { kind: "mail", line: "Có thư gửi ông Trần, có phải nhà này không?", who: "Người đưa thư nhầm địa chỉ" },
];

/* ───────────── Thẻ "Cách chơi" hiện trước mỗi trò chơi nhỏ (đồng hồ chỉ chạy khi bấm Bắt đầu) ───────────── */

/** Hướng dẫn từng trò chơi nhỏ. Chữ trong **...** được tô nổi bật. */
export interface MiniGuide {
  goal: string;
  steps: [string, string, string];
  /** Cách tính điểm / điều kiện hoàn thành, một câu. */
  win: string;
  /** Mẹo nhỏ (không bắt buộc). */
  tip?: string;
}

export const MINI_GUIDES: Record<MiniGame, MiniGuide> = {
  print: {
    goal: "In thật nhiều truyền đơn trước khi hết giờ.",
    steps: [
      "**Bấm liên tục** vào bàn in (hoặc phím cách): mỗi lần bấm in được một tờ.",
      "Khi **đèn bão chuyển đỏ** và hiện chữ **Lính tuần!** thì **dừng tay ngay**.",
      "Bấm lúc đèn đỏ là **bị lộ**: mất 6 tờ và bị trừ điểm.",
    ],
    win: "Mỗi tờ 22 điểm, in đủ 46 tờ là đạt 1.000 điểm.",
  },
  sort: {
    goal: "Dán 9 tờ yết thị lên đúng bảng ở đình làng.",
    steps: [
      "Đọc tờ yết thị đang hiện ở phía dưới.",
      "Chạm vào **đúng bảng**: **Chính trị**, **Kinh tế** hoặc **Văn hóa – xã hội**.",
      "Dán nhầm thì tờ đó **mất điểm** và phải chọn lại.",
    ],
    win: "Mỗi tờ đúng ngay lần đầu được 100 điểm; xong sớm được thưởng thêm.",
    tip: "Tự hỏi: chính sách này động tới quyền làm chủ, tới miếng cơm manh áo, hay tới nếp sống của bà con?",
  },
  protect: {
    goal: "Báo cho các cơ sở đang bị theo dõi rút vào bí mật.",
    steps: [
      "Cơ sở **nhấp nháy đỏ** là đang bị mật thám để ý.",
      "**Chạm ngay** vào cơ sở đó trước khi đèn pha quét tới (khoảng 3 giây).",
      "**Đừng chạm** cơ sở an toàn: sẽ bị trừ điểm.",
    ],
    win: "Có 8 lần báo động; mỗi cơ sở cứu được 125 điểm.",
  },
  spy: {
    goal: "Tìm ra kẻ chỉ điểm trong 2 vụ liên tiếp.",
    steps: [
      "Xem các cơ sở: **đỏ là bị phá**, **xanh là an toàn**.",
      "Thẻ của mỗi giao liên ghi **những cơ sở người đó biết**.",
      "Kẻ chỉ điểm là người biết **đúng và đủ các cơ sở đỏ**: không thiếu cơ sở đỏ nào, không có cơ sở xanh nào.",
    ],
    win: "Chọn đúng mỗi vụ được 250 đến 500 điểm, càng nhanh càng nhiều.",
    tip: "Loại ngay người biết cơ sở xanh, rồi loại người còn thiếu cơ sở đỏ.",
  },
  sneak: {
    goal: "Đưa chấm đỏ (là bạn) tới Nhà an toàn ở góc trên bên phải.",
    steps: [
      "**Kéo ngón tay hoặc chuột ở bất kỳ đâu** trên bản đồ: chấm đỏ di chuyển theo.",
      "**Tránh vùng sáng** của các đèn pha đang di chuyển.",
      "Bị đèn soi trúng thì phải **quay về chặng an toàn** gần nhất.",
    ],
    win: "Tới nơi được ít nhất 500 điểm, càng nhanh càng cao.",
  },
  interrogate: {
    goal: "Khai đúng lý lịch giả, không để lộ đường dây.",
    steps: [
      "**Học thuộc 5 dòng** trên giấy căn cước giả: tên, quê, nghề, năm lên Hà Nội, chỗ trọ.",
      "Trả lời 7 câu hỏi, mỗi câu vài giây: chọn **đúng như lý lịch**.",
      "Gặp câu **gài bẫy** (bắt nhận tội, khai đồng bọn, ký giấy): luôn chọn câu **không nhận, không khai, không ký**.",
    ],
    win: "Đúng và nhanh được nhiều điểm; từ 500 điểm là giữ được lời khai.",
  },
  timeline: {
    goal: "Xếp 6 mẩu tin theo đúng thứ tự thời gian.",
    steps: [
      "Chạm vào mẩu tin xảy ra **sớm nhất** trước.",
      "Tiếp tục chạm lần lượt tới mẩu tin **muộn nhất**.",
      "Chạm sai bị **trừ điểm**; ngày tháng hiện ra sau khi xếp đúng.",
    ],
    win: "Xếp xong được 400 đến 1.000 điểm.",
    tip: "Coi chừng các cặp dễ nhầm: tháng 9 và tháng 10/1930; tháng 4 và tháng 6/1931.",
  },
  network: {
    goal: "Vẽ một đường dây liền đi qua tất cả các ô trống.",
    steps: [
      "Bắt đầu từ **ô số 1**, kéo qua các ô **kề nhau** (lên, xuống, trái, phải).",
      "Đi qua các ô số **theo thứ tự 1 → 2 → 3…**, kết thúc ở số lớn nhất.",
      "**Không** đi qua đồn lính, **không** đi lại ô cũ. Kéo lùi để xóa bước vừa đi.",
    ],
    win: "Nối xong được 500 đến 1.000 điểm.",
    tip: "Ô ở góc và ô bị kẹp giữa đồn lính nên đi qua sớm.",
  },
  ink: {
    goal: "Hơ đèn đọc lời dặn bí mật rồi trả lời một câu hỏi.",
    steps: [
      "**Kéo đèn dầu** qua lá thư: chữ viết bằng nước chanh hiện dần ra.",
      "**Đừng để đèn đứng yên** một chỗ quá 1 giây: giấy cháy xém, mất chữ.",
      "Đọc kỹ 4 dòng lời dặn, bấm **Đọc xong** rồi chọn đáp án đúng.",
    ],
    win: "Trả lời đúng được 350 đến 1.000 điểm.",
  },
  cipher: {
    goal: "Giải bức điện mật mã để biết ngày và nơi họp Đại hội.",
    steps: [
      "**Xoay vòng ngoài** của đĩa mã: kéo vòng tròn, hoặc bấm nút ◀ ▶.",
      "Nhìn **dòng bút chì** dưới bức điện: xoay tới khi nó đọc ra chữ **DAI HOI**.",
      "Đĩa khóa lại thì bấm **Đọc thư**.",
    ],
    win: "Giải được 400 đến 1.000 điểm, càng nhanh càng cao.",
    tip: "Mỗi người một khóa riêng, không chép được của bạn bên cạnh.",
  },
  door: {
    goal: "Chỉ mời đúng đại biểu vào nơi họp.",
    steps: [
      "So câu khách **đáp ám hiệu** với **thẻ ám hiệu**: khác **một chữ** là sai.",
      "Từ **khách thứ 7**: xem **dấu đỏ hình vuông**. Từ **khách thứ 14**: mảnh giấy phải **khớp mép**.",
      "Đúng hết: **Mời vào**. Sai một điểm: **Mời ra** (phím **← →**).",
    ],
    win: "Đúng và nhanh: tới 48 điểm mỗi khách; để lọt người không hợp lệ: trừ 71. Từ 500 điểm là hoàn thành.",
    tip: "Mời nhầm đại biểu ra chỉ mất điểm. Ám hiệu, giấy tờ là hư cấu.",
  },
};
