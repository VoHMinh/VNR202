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

/* ───────────── Nhiệm vụ 7 · Kẻ chỉ điểm (lời khai mâu thuẫn với vật chứng) — các vụ đều hư cấu ───────────── */

export type SpyEvidenceKind = "ticket" | "witness" | "paper" | "letter";

/**
 * Một vụ: biên bản, manh mối về lúc kẻ chỉ điểm liên lạc với mật thám, lời khai của 4 người bị nghi (bí danh hư cấu)
 * và 4 vật chứng. Đúng một lời khai che giấu chuyện tối hôm đó bị một vật chứng bác bỏ: người đó là kẻ chỉ điểm.
 * Vụ khó có thêm một lời nói dối chuyện vặt (`decoy`): có mâu thuẫn nhưng không che giấu gì về lúc liên lạc với mật thám.
 * `about`: vật chứng nói về người bị nghi nào (-1: không riêng ai).
 */
export interface SpyCaseFile {
  title: string;
  report: string;
  lead: string;
  suspects: { alias: string; says: string }[];
  evidence: { kind: SpyEvidenceKind; text: string; about: number }[];
  answer: [number, number];
  decoy?: [number, number, string];
  reveal: string;
}

/** Vụ thứ nhất (dễ): một lời nói dối, bác bỏ bằng một vật chứng. */
export const SPY_EASY: SpyCaseFile[] = [
  {
    title: "Hiệu may phố Hàng Bông",
    report: "Tối 12/2/1931, mật thám ập vào hiệu may phố Hàng Bông, đi thẳng ra cửa sau, nơi giấu truyền đơn.",
    lead: "Gần 9 giờ tối hôm đó, một cơ sở thấy có người đứng nói chuyện với mật thám ở Bờ Hồ, trời tối không rõ mặt.",
    suspects: [
      { alias: "Anh Cả", says: "Tối 12, tôi ở nhà trọ Hàng Bạc, đi ngủ từ 8 giờ." },
      { alias: "Chị Hai", says: "Tối đó tôi ngồi quán nước đầu phố Hàng Đào tới gần 10 giờ." },
      { alias: "Chú Ba", says: "Tôi chỉ giao hàng ở cửa trước, không biết lối ra cửa sau." },
      { alias: "Cô Tư", says: "Tôi về quê Hà Đông từ hôm 10, hôm 13 mới lên." },
    ],
    evidence: [
      { kind: "ticket", text: "Vé xe điện lên ở Bờ Hồ, bấm lỗ 8 giờ 40 tối 12/2, tìm thấy trong túi áo Anh Cả.", about: 0 },
      { kind: "witness", text: "Bà chủ quán nước Hàng Đào: Chị Hai ngồi quán tôi tới gần 10 giờ, uống hết ba ấm chè.", about: 1 },
      { kind: "ticket", text: "Vé xe điện Hà Đông – Hà Nội ngày 13/2, trong ví Cô Tư.", about: 3 },
      { kind: "witness", text: "Chủ hiệu may: Chú Ba chỉ đứng giao hàng ở cửa trước, chưa vào trong nhà bao giờ.", about: 2 },
    ],
    answer: [0, 0],
    reveal: "Anh Cả khai đi ngủ từ 8 giờ, nhưng vé xe điện lên ở Bờ Hồ lúc 8 giờ 40 lại nằm trong túi áo anh ta, đúng lúc có người gặp mật thám ở Bờ Hồ.",
  },
  {
    title: "Nhà in ở Ô Chợ Dừa",
    report: "Đêm 20/2/1931, mật thám vây nhà in truyền đơn ở Ô Chợ Dừa đúng giờ đổi ca in, chuyện chỉ người trong tổ biết.",
    lead: "Khoảng 3 giờ chiều 20/2, người gác chợ thấy một người mặc áo the đen đi vào Sở Mật thám.",
    suspects: [
      { alias: "Bác Năm", says: "Chiều 20, tôi ngồi chờ cắt tóc ở phố Hàng Bè tới chạng vạng." },
      { alias: "Cậu Sáu", says: "Chiều hôm ấy tôi ra phố Hàng Gai cầm đồ lấy tiền mua giấy." },
      { alias: "Ông Đồ", says: "Cả buổi chiều tôi ngồi viết câu đối thuê ở chợ Đồng Xuân." },
      { alias: "Cô Tư", says: "Cả chiều tôi ở nhà trông em, không đi đâu." },
    ],
    evidence: [
      { kind: "paper", text: "Biên nhận hiệu cầm đồ Hàng Gai: Cậu Sáu cầm chiếc đồng hồ quả quýt lúc 3 giờ chiều 20/2.", about: 1 },
      { kind: "witness", text: "Người bán mực ở chợ Đồng Xuân: chiều 20, ông Đồ bày hàng rồi bỏ đi từ 2 giờ, tối mới quay lại.", about: 2 },
      { kind: "witness", text: "Bà hàng xóm: chiều 20, Cô Tư bế em ra đầu ngõ chơi suốt.", about: 3 },
      { kind: "witness", text: "Thợ cắt tóc Hàng Bè: Bác Năm ngồi đánh cờ chờ tới lượt, chạng vạng mới về.", about: 0 },
    ],
    answer: [2, 1],
    reveal: "Ông Đồ khai ngồi viết câu đối cả chiều, nhưng người bán mực thấy ông bỏ hàng đi từ 2 giờ, đúng lúc có người mặc áo the đen vào Sở Mật thám.",
  },
  {
    title: "Hộp thư ở bến Phà Đen",
    report: "Sáng 2/3/1931, mật thám rình ở hộp thư bí mật dưới gốc gạo bến Phà Đen. Chỉ người chuyển thư tuần này biết chỗ đó.",
    lead: "Khoảng 7 giờ tối 1/3, ông lái đò thấy một người đứng nói chuyện với mật thám ở bến.",
    suspects: [
      { alias: "Chị Hai", says: "Tối 1/3, tôi đi xem hát chèo từ 6 giờ tới 9 giờ." },
      { alias: "Anh Cả", says: "Chập tối hôm ấy tôi ra chợ Mơ mua gạo rồi về nhà." },
      { alias: "Chú Ba", says: "Tối đó tôi trực ca ở xưởng mộc, cả xưởng đều thấy." },
      { alias: "Cậu Sáu", says: "Tuần này tôi không được giao chuyển thư." },
    ],
    evidence: [
      { kind: "witness", text: "Người soát vé rạp hát: Chị Hai ngồi hàng ghế đầu cả buổi, vỗ tay to nhất rạp.", about: 0 },
      { kind: "paper", text: "Sổ chấm công xưởng mộc: tối 1/3, Chú Ba nghỉ ca, ghi là ốm.", about: 2 },
      { kind: "paper", text: "Phiếu giao việc tuần này: Chị Hai, Anh Cả, Chú Ba chuyển thư.", about: -1 },
      { kind: "witness", text: "Bà bán gạo chợ Mơ: Anh Cả mua 5 cân gạo, ngồi mặc cả tới gần 8 giờ mới đi.", about: 1 },
    ],
    answer: [2, 1],
    reveal: "Chú Ba khai trực ca ở xưởng mộc, nhưng sổ chấm công ghi tối đó anh ta nghỉ ốm. Anh ta nói dối về đúng lúc có người gặp mật thám ở bến Phà Đen.",
  },
];

/** Vụ thứ hai (khó): phải xét cả ai biết bí mật, và có một lời nói dối chuyện vặt để đánh lạc hướng. */
export const SPY_HARD: SpyCaseFile[] = [
  {
    title: "Cuộc họp ở hiệu thuốc bắc",
    report: "Tối 25/2/1931, mật thám ập vào hiệu thuốc bắc phố Hàng Buồm đúng giờ chi bộ họp. Giờ họp vừa đổi sang 7 giờ tối, chỉ báo miệng cho Cậu Sáu, Chị Hai và Bác Năm.",
    lead: "Khoảng 5 giờ chiều 25/2, có người thấy kẻ chỉ điểm vào bưu điện Bờ Hồ gọi dây nói.",
    suspects: [
      { alias: "Cậu Sáu", says: "Chiều 25, tôi khuân hàng ở ga Hàng Cỏ từ trưa tới tối mịt." },
      { alias: "Chị Hai", says: "Cả chiều tôi ngồi khâu áo ở nhà, không ra phố." },
      { alias: "Bác Năm", says: "Chiều đó tôi ra Bờ Hồ uống nước chè. Tôi bỏ thuốc lào từ Tết rồi." },
      { alias: "Cô Tư", says: "Chiều 25, tôi vào bưu điện Bờ Hồ gửi thư về quê." },
    ],
    evidence: [
      { kind: "letter", text: "Thư Cô Tư gửi về quê, đóng dấu bưu điện Bờ Hồ lúc 4 giờ 50 chiều 25/2.", about: 3 },
      { kind: "witness", text: "Cai phu ga Hàng Cỏ: hôm 25, Cậu Sáu bỏ việc từ 3 giờ chiều, không lĩnh công.", about: 0 },
      { kind: "witness", text: "Bà hàng xóm: chiều 25, Chị Hai ngồi khâu áo ở hiên nhà chị ấy tới tối.", about: 1 },
      { kind: "witness", text: "Ông bán chè Bờ Hồ: Bác Năm ngồi hàng tôi từ 4 giờ tới gần 6 giờ, không rời ghế, hút liền ba điếu thuốc lào.", about: 2 },
    ],
    answer: [0, 1],
    decoy: [2, 3, "Bác Năm nói dối chuyện bỏ thuốc lào, nhưng ông bán chè xác nhận bác ngồi suốt ở hàng chè, không vào bưu điện."],
    reveal: "Cậu Sáu biết giờ họp mới, khai khuân hàng tới tối nhưng thực ra bỏ việc từ 3 giờ chiều, đủ thì giờ ra bưu điện gọi dây nói. Cô Tư có vào bưu điện thật, nhưng không được báo giờ họp mới.",
  },
  {
    title: "Kho truyền đơn ở xưởng mộc",
    report: "Sáng 5/3/1931, mật thám khám xưởng mộc phố Hàng Gai, cạy đúng tấm ván sàn giấu truyền đơn. Chỉ người từng xuống cất truyền đơn mới biết tấm ván nào.",
    lead: "Khoảng 8 giờ tối 4/3, có người thấy một người đạp xe đạp tới cổng Sở Mật thám.",
    suspects: [
      { alias: "Bác Năm", says: "Tối 4/3, tôi sang làng Bưởi thăm em gái, ngủ lại bên đó." },
      { alias: "Cậu Sáu", says: "Tôi không có xe đạp. Tối đó tôi ở nhà trọ." },
      { alias: "Ông Đồ", says: "Tối 4/3, tôi ngồi viết thư thuê ở chợ Đồng Xuân tới 9 giờ." },
      { alias: "Chị Hai", says: "Tôi chưa xuống chỗ cất truyền đơn ở xưởng mộc bao giờ." },
    ],
    evidence: [
      { kind: "witness", text: "Em gái Bác Năm ở làng Bưởi: tối 4/3 bác có sang, ăn vội bát cơm rồi đạp xe đi ngay, bảo có việc gấp trên phố.", about: 0 },
      { kind: "paper", text: "Sổ khách nhà trọ: Cậu Sáu về phòng 7 giờ tối 4/3, sáng mới ra. Chủ trọ kể cậu ta có xe đạp, dựng ở gầm cầu thang.", about: 1 },
      { kind: "witness", text: "Bác bán nước chợ Đồng Xuân: tối 4/3, ông Đồ viết thư cho một bà cụ, bà khóc mãi, 9 giờ mới xong.", about: 2 },
      { kind: "paper", text: "Sổ phân công cất truyền đơn: Bác Năm, Cậu Sáu, Ông Đồ.", about: -1 },
    ],
    answer: [0, 0],
    decoy: [1, 1, "Cậu Sáu nói dối chuyện không có xe đạp, nhưng sổ nhà trọ ghi tối đó cậu ta ở trong phòng từ 7 giờ."],
    reveal: "Bác Năm biết chỗ giấu truyền đơn, khai ngủ lại làng Bưởi, nhưng em gái kể bác ăn vội rồi đạp xe đi ngay, đúng lúc có người đạp xe tới Sở Mật thám.",
  },
  {
    title: "Lá thư không ký tên",
    report: "Ngày 10/3/1931, Sở Mật thám nhận một lá thư không ký tên, chỉ chỗ họp tổ ở ga Hàng Cỏ. Thư viết mực tím, chữ nghiêng hẳn sang trái.",
    lead: "Một cơ sở làm thông ngôn ở Sở Mật thám cho biết: thư được bỏ vào thùng thư phố Hàng Đào sáng 9/3.",
    suspects: [
      { alias: "Anh Cả", says: "Tôi viết chữ đứng. Nhà tôi chỉ có mực đen." },
      { alias: "Chị Hai", says: "Sáng 9/3, tôi ra chợ Hàng Đào mua vải rồi về ngay." },
      { alias: "Bác Năm", says: "Tôi không biết chữ, thư từ đều nhờ người viết hộ." },
      { alias: "Cô Tư", says: "Tôi viết tay trái, nhưng sáng 9/3 tôi ở nhà dạy em học." },
    ],
    evidence: [
      { kind: "paper", text: "Sổ ghi chép của Anh Cả: chữ đứng thẳng, viết bằng mực tím.", about: 0 },
      { kind: "witness", text: "Bà bán vải Hàng Đào: sáng 9/3, Chị Hai mua hai thước vải, trả tiền xu rồi về ngay.", about: 1 },
      { kind: "witness", text: "Ông đồ viết thuê: Bác Năm hay nhờ tôi viết thư, bác chỉ biết ký tên.", about: 2 },
      { kind: "witness", text: "Người đưa thư: sáng 9/3, tôi thấy Cô Tư bỏ một lá thư vào thùng thư phố Hàng Đào.", about: 3 },
    ],
    answer: [3, 3],
    decoy: [0, 0, "Anh Cả nói dối chuyện mực tím, nhưng chữ anh ta đứng thẳng, không nghiêng trái như chữ trong thư."],
    reveal: "Cô Tư viết tay trái, khớp với nét chữ nghiêng trái trong thư. Chị khai ở nhà dạy em học, nhưng người đưa thư thấy chị bỏ thư vào thùng thư Hàng Đào sáng 9/3.",
  },
];

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

/* ───────────── Nhiệm vụ 20 · Gác cửa hội trường (Ma Cao, 3/1935) — tờ báo tín vật là hư cấu ───────────── */

/** Số đại biểu dự Đại hội I (theo giáo trình). */
export const DELEGATES = 13;
/** Màn chơi là ca gác cuối: số đại biểu đã vào trước khi ca của người chơi bắt đầu (hư cấu, chỉ để dựng cảnh). */
export const DELEGATES_BEFORE = 10;

/**
 * Tờ báo tín vật (hư cấu hoàn toàn: tên báo, tin, rao vặt). Mỗi đại biểu mang một tờ giống hệt tờ người gác giữ;
 * tờ báo của người lạ hay tờ làm giả có chỗ khác. Mỗi ô chữ (hoặc hình vẽ) có vài bản khác để làm tờ giả,
 * `lv`: 1 khác rõ (thường là đổi chữ cho vui), 2 khác số, tên riêng, 3 khác rất nhỏ.
 * 25/3/1935 đúng là thứ Hai (Đại hội khai mạc thứ Tư 27/3/1935).
 */
export interface PaperUnit {
  id: string;
  text: string;
  alts: { text: string; lv: 1 | 2 | 3 }[];
}
export type PaperDrawing = "teapot" | "rooster";
export interface PaperArt {
  id: PaperDrawing;
  alts: { variant: string; lv: 1 | 2 | 3; desc: string }[];
}

const u = (id: string, text: string, ...alts: [string, 1 | 2 | 3][]): PaperUnit => ({ id, text, alts: alts.map(([t, lv]) => ({ text: t, lv })) });

export const PAPER = {
  dateline: [u("no", "Số 312", ["Số 321", 2]), u("day", "Thứ Hai", ["Thứ Ba", 2]), u("date", "25-3-1935", ["26-3-1935", 2], ["25-3-1953", 3]), u("price", "Giá 3 xu", ["Giá 5 xu", 2])],
  masthead: u("mast", "TIN VẶT BỐN PHƯƠNG", ["TIN VẶT TÁM PHƯƠNG", 1]),
  sub: u("sub", "Ra sáng thứ hai hằng tuần", ["Ra chiều thứ hai hằng tuần", 3]),
  headline: [u("h1", "MÈO NHÀ ÔNG TRẦN", ["CHÓ NHÀ ÔNG TRẦN", 1], ["MÈO NHÀ BÀ TRẦN", 2]), u("h2", "ĐI LẠC BA NGÀY", ["ĐI CHƠI BA NGÀY", 1], ["ĐI LẠC BỐN NGÀY", 2]), u("h3", "ĐÃ VỀ!", ["CHƯA VỀ!", 1], ["ĐÃ VỀ?", 3])],
  news: [u("n1", "Bà Ba bán xôi", ["Bà Ba bán phở", 1], ["Bà Tư bán xôi", 2]), u("n2", "đầu ngõ", ["cuối ngõ", 3]), u("n3", "hứa từ mai", ["hứa từ mốt", 3]), u("n4", "thêm lạc vào xôi.", ["thêm muối vào xôi.", 1], ["thêm đỗ vào xôi.", 2]), u("n5", "Khách quen mừng lắm.", ["Khách quen lo lắm.", 1])],
  weather: [u("w1", "Sáng sương mù,", ["Sáng mưa phùn,", 2]), u("w2", "chiều nắng nhẹ.", ["chiều gió nhẹ.", 3])],
  riddle: [u("q1", "Đầu dê mình ốc", ["Đầu gà mình ốc", 2], ["Đầu dơi mình ốc", 3]), u("q2", "là con gì?", ["là cái gì?", 3]), u("q3", "(Đáp ở số sau)", ["(Đáp ở trang sau)", 3])],
  ad: [u("a1", "CHÈ TÂN HƯƠNG", ["CHÈ TÂN HƯNG", 2]), u("a2", "thơm ngon, giá hạ", ["thơm ngon, giá cao", 1])],
  sale: [u("r1", "Cần bán gà trống", ["Cần bán gà mái", 1], ["Cần mua gà trống", 2]), u("r2", "biết gáy đúng giờ,", ["biết gáy sai giờ,", 1], ["biết hát đúng giờ,", 1]), u("r3", "giá 3 hào.", ["giá 5 hào.", 2])],
  lost: [u("r4", "Ai nhặt được ô đen", ["Ai nhặt được ô xanh", 2]), u("r5", "cán gỗ", ["cán tre", 3]), u("r6", "xin trả hiệu may họ Lý,", ["xin trả hiệu may họ Lê,", 3]), u("r7", "có hậu tạ.", ["có quà tạ.", 3])],
  page: u("pg", "Trang 1", ["Trang 7", 2]),
  art: [
    {
      id: "teapot",
      alts: [
        { variant: "spout", lv: 2, desc: "vòi ấm trà quay sang bên kia" },
        { variant: "steam", lv: 3, desc: "ấm trà chỉ có hai làn hơi" },
        { variant: "lid", lv: 3, desc: "nắp ấm trà mất núm" },
      ],
    },
    {
      id: "rooster",
      alts: [
        { variant: "facing", lv: 2, desc: "con gà quay đầu sang bên kia" },
        { variant: "comb", lv: 2, desc: "con gà không có mào" },
        { variant: "tail", lv: 3, desc: "đuôi gà chỉ có ba chiếc lông" },
      ],
    },
  ] as PaperArt[],
};

/** Câu khách nói khi đưa báo qua khe cửa (chọn ngẫu nhiên, không lộ ai là đại biểu). */
export const DOOR_LINES = [
  "Báo của tôi đây, mời ông xem.",
  "Tờ báo hôm nay đây ạ.",
  "Tôi mang báo tới như đã hẹn.",
  "Ông xem giúp, báo còn thơm mùi mực.",
  "Báo đây, tôi giữ kỹ lắm.",
  "Tờ báo của tôi, ông xem có đúng không.",
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
    goal: "Vạch mặt kẻ chỉ điểm qua lời khai mâu thuẫn.",
    steps: [
      "Đọc **biên bản**, **manh mối**: kẻ chỉ điểm gặp mật thám **lúc nào, ở đâu**.",
      "Chọn **một lời khai** và **một vật chứng** bác bỏ nó, bấm **Đối chất**.",
      "Chỉ lời nói dối về **đúng lúc ấy** mới tính; nói dối **chuyện vặt** thì không.",
    ],
    win: "Vụ 1 tới 450 điểm, vụ 2 tới 550; đối chất sai bị trừ 70.",
    tip: "Các vụ, bí danh đều hư cấu. Ai không biết bí mật thì không phải kẻ chỉ điểm.",
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
    goal: "Chỉ mời vào ai mang tờ báo giống hệt tờ của bạn.",
    steps: [
      "So **tờ báo tín vật** của khách với **tờ gốc**: từng **chữ**, **con số**, **hình vẽ**.",
      "Thấy **chỗ khác** thì **chạm vào chỗ đó** để mời ra. Chạm nhầm bị **trừ 20**.",
      "Giống hệt thì bấm **Mời vào**. Điện thoại: bấm **Xem tờ của bạn** để lật.",
    ],
    win: "Đúng và nhanh được trọn điểm; để lọt tờ giả bị trừ nặng. Từ 500 điểm là hoàn thành.",
    tip: "Tờ báo là hư cấu. Đừng bỏ qua ngày tháng, giá tiền và hai hình vẽ.",
  },
};
