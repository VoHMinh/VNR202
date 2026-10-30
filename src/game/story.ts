import type { ArtId } from "./data/art";

/*
 * Kịch bản "Mạch Ngầm 1930–1935".
 * Nhân vật chính là người chơi: một đảng viên trẻ làm giao liên, bí danh là tên người chơi nhập vào.
 * Nhân vật chính và các tình huống của nhân vật là hư cấu; mọi sự kiện, nhân vật lịch sử, ngày tháng,
 * con số trong phần dẫn truyện và ghi chú đều theo tài liệu đã đối chiếu (xem `sources`).
 * Nội dung chi tiết của các trò chơi nhỏ nằm ở data/minis.ts.
 */

export interface Source {
  label: string;
  url?: string;
}

export const SRC_GT: Source = {
  label:
    "Bộ Giáo dục và Đào tạo, Giáo trình Lịch sử Đảng Cộng sản Việt Nam (dành cho bậc đại học hệ không chuyên lý luận chính trị), Nxb. Chính trị quốc gia Sự thật, Hà Nội, 2021, Chương 1, mục II.1 “Phong trào cách mạng 1930–1931 và khôi phục phong trào 1932–1935”",
};
export const SRC_BN: Source = {
  label: "Lịch sử biên niên Đảng Cộng sản Việt Nam, tập 2 (Tư liệu văn kiện Đảng)",
  url: "https://tulieuvankien.dangcongsan.vn/van-kien-tu-lieu-ve-dang/book/lich-su-dang/lich-su-bien-nien-dang-cong-san-viet-nam-tap-2-175",
};
export const SRC_NB: Source = {
  label: "Tư liệu văn kiện Đảng: Niên biểu Ban Chấp hành Trung ương khóa I",
  url: "https://tulieuvankien.dangcongsan.vn/ban-chap-hanh-trung-uong-dang/dai-hoi-dang/lan-thu-i/nien-bieu-toan-khoa-27",
};
const SRC_ND_BAOCHI: Source = { label: "Báo Nhân Dân: Một đời sống báo chí lạ thường", url: "https://nhandan.vn/special/mot-doi-song-bao-chi-la-thuong/index.html" };
const SRC_ND_LHP: Source = {
  label: "Báo Nhân Dân: Đồng chí Lê Hồng Phong, 40 tuổi đời, 20 tuổi Đảng",
  url: "https://special.nhandan.vn/dong-chi-le-hong-phong-40-tuoi-doi-20-tuoi-dang/index.html",
};
const SRC_ND_HHT: Source = {
  label: "Báo Nhân Dân: Hà Huy Tập, nhà lãnh đạo tài năng, đóng góp to lớn cho Đảng, cho cách mạng",
  url: "https://special.nhandan.vn/Ha-Huy-Tap-nha-lanh-dao-tai-nang-dong-gop-to-lon-cho-Dang-cho-cach-mang/index.html",
};
const SRC_LTT: Source = {
  label: "Báo Hà Tĩnh: Bản tuyên ngôn về lý tưởng sống của thanh niên Việt Nam (đồng chí Lý Tự Trọng)",
  url: "https://baohatinh.vn/ban-tuyen-ngon-ve-ly-tuong-song-cua-thanh-nien-viet-nam-post275577.html",
};
const SRC_TCCT: Source = {
  label: "Tạp chí Công Thương: “Thiên anh hùng ca bất diệt” 90 năm trước",
  url: "https://tapchicongthuong.vn/thien-anh-hung-ca-bat-diet--90-nam-truoc-68235.htm",
};
const SRC_DDDN_DH1: Source = {
  label: "Tạp chí Diễn đàn Doanh nghiệp (8/1/2026): Đại hội I, dấu mốc tái lập cơ quan lãnh đạo Trung ương (tư liệu của Viện Lịch sử Đảng, Học viện Chính trị quốc gia Hồ Chí Minh)",
  url: "https://diendandoanhnghiep.vn/dau-an-cac-ky-dai-hoi-toan-quoc-cua-dang-cong-san-viet-nam-dai-hoi-i-dau-moc-tai-lap-co-quan-lanh-dao-trung-uong-10168691.html",
};

/* ───────────────────────── Kiểu dữ liệu ───────────────────────── */

export type MiniGame = "print" | "sort" | "protect" | "spy" | "sneak" | "interrogate" | "timeline" | "network" | "ink" | "cipher" | "door";

export interface Option {
  id: string;
  text: string;
  correct?: boolean;
  /** Hậu quả trong truyện khi chọn phương án này. */
  outcome: string;
}

interface MissionBase {
  id: string;
  chapter: number;
  /** Mốc thời gian hiện trên hồ sơ. */
  date: string;
  place: string;
  title: string;
  art: ArtId;
  /** Ảnh thay vào sau khi làm xong, dùng khi ảnh đó sẽ làm lộ đáp án nếu hiện trước (ví dụ chân dung người cần đoán). */
  reveal?: ArtId;
  /** Lời dẫn truyện, mỗi phần tử là một đoạn ngắn. {ten} được thay bằng bí danh người chơi. */
  brief: string[];
  /** Thời gian làm nhiệm vụ (giây). */
  time: number;
  /** Ghi chú lịch sử hiện sau khi làm xong. */
  fact: string;
  /** Cơ chế duy trì, phục hồi phong trào mà nhiệm vụ minh họa (trả lời câu hỏi nghiên cứu). */
  mechanism: string;
  sources: Source[];
}

export interface DecisionMission extends MissionBase {
  kind: "decision";
  prompt: string;
  options: Option[];
}

export interface MiniMission extends MissionBase {
  kind: "mini";
  game: MiniGame;
  /** Câu hướng dẫn thao tác, hiện ngay trên trò chơi. */
  howto: string;
  /** Hậu quả trong truyện khi làm tốt / chưa tốt. */
  win: string;
  lose: string;
  /** Trò chơi cần cả hai trang hồ sơ (bản đồ lớn): lúc chơi thì ẩn ảnh tư liệu. */
  wide?: boolean;
}

export type Mission = DecisionMission | MiniMission;

export interface Chapter {
  no: number;
  roman: string;
  title: string;
  years: string;
  art: ArtId;
  /** Lời dẫn mở chương (2 câu). */
  intro: string[];
  /** Lời kết chương, hiện trước bảng xếp hạng (có thể trống). */
  outro?: string;
}

/* ───────────────────────── Mở đầu và kết thúc ───────────────────────── */

export const PROLOGUE: { art: ArtId; text: string }[] = [
  { art: "mine-dong-trieu", text: "Năm 1930. Đông Dương dưới ách thống trị của thực dân Pháp." },
  { art: "cay-ruong", text: "Đầu năm 1930, Đảng Cộng sản Việt Nam ra đời. Phong trào của công nhân, nông dân dâng lên khắp ba kỳ." },
  { art: "saigon-1930", text: "Bạn là một đảng viên trẻ làm giao liên, người giữ cho những đường dây liên lạc bí mật của Đảng không bị đứt. Bí danh: {ten}." },
  { art: "macau-map", text: "Nhiệm vụ của bạn: giữ vững mạch ngầm qua những năm khủng bố, cho đến ngày Đảng họp Đại hội." },
];

export const FINALE: { art: ArtId; text: string }[] = [
  { art: "macau-1933", text: "Ngày 27/3/1935, Đại hội đại biểu lần thứ nhất của Đảng khai mạc tại Ma Cao." },
  { art: "macau-map", text: "Đại hội thông qua Nghị quyết chính trị, Điều lệ Đảng và bầu ra Ban Chấp hành Trung ương mới." },
  {
    art: "indochina-1936",
    text: "Ngày 31/3/1935, Đại hội bế mạc. Sau những năm khủng bố trắng, hệ thống tổ chức của Đảng đã được khôi phục từ Trung ương đến địa phương, từ trong nước ra ngoài nước. Mạch ngầm đã được giữ vững.",
  },
];

/* ───────────────────────── Bốn chương ───────────────────────── */

export const CHAPTERS: Chapter[] = [
  {
    no: 1,
    roman: "I",
    title: "Ngọn lửa tháng Năm",
    years: "1930",
    art: "mine-hongay",
    intro: [
      "Mùa xuân năm 1930. Đảng vừa ra đời đã lãnh đạo công nhân, nông dân đứng lên.",
      "Ở Nghệ An, công nhân Vinh – Bến Thủy và nông dân các làng quanh đó chuẩn bị cho những ngày đấu tranh lớn.",
    ],
  },
  {
    no: 2,
    roman: "II",
    title: "Khủng bố trắng",
    years: "1931",
    art: "con-dao-1895",
    intro: [
      "Từ cuối năm 1930, thực dân Pháp tập trung đàn áp phong trào.",
      "Năm 1931, khủng bố trắng lan khắp nơi. Hàng nghìn cán bộ, đảng viên và quần chúng yêu nước bị giết, bị bắt, bị tù đày.",
    ],
    outro: "Sau những ngày tra hỏi ở Sở Mật thám, {ten} bị giải vào nhà tù Hỏa Lò.",
  },
  {
    no: 3,
    roman: "III",
    title: "Trường học trong ngục tối",
    years: "1932–1933",
    art: "hoalo-2012",
    intro: [
      "Nhà tù Hỏa Lò, Hà Nội. Tường đá, xiềng xích, đòn roi.",
      "Nhưng ngay trong ngục tối, những người cộng sản bí mật lập chi bộ, biến nhà tù thành trường học cách mạng.",
    ],
  },
  {
    no: 4,
    roman: "IV",
    title: "Hội tụ ở Ma Cao",
    years: "1934–1935",
    art: "macau-1933",
    intro: [
      "Từ những cơ sở nhỏ được gây dựng lại, mạng lưới của Đảng dần nối liền khắp ba kỳ.",
      "Ở nước ngoài, những người cộng sản Việt Nam chuẩn bị nối lại sợi dây lãnh đạo và triệu tập Đại hội.",
    ],
  },
];

/* ───────────────────────── Hai mươi nhiệm vụ ───────────────────────── */

export const MISSIONS: Mission[] = [
  /* ── Chương I · 1930 ── */
  {
    id: "m1",
    kind: "mini",
    game: "print",
    chapter: 1,
    date: "Cuối tháng 4/1930",
    place: "Bến Thủy, Nghệ An",
    title: "Truyền đơn ngày 1/5",
    art: "vinh-1925",
    brief: [
      "Chi bộ giao cho {ten} in truyền đơn kêu gọi công nhân bãi công, biểu tình trong ngày Quốc tế Lao động.",
      "Bàn in giấu trong một căn nhà lá. Đồng chí canh gác bên ngoài sẽ thắp đèn đỏ mỗi khi lính tuần đi ngang.",
    ],
    howto: "Bấm liên tục để in. Đèn đỏ sáng thì dừng tay ngay, kẻo bị lộ.",
    win: "Hàng xấp truyền đơn được chuyển tới các nhà máy trước sáng ngày 1/5.",
    lose: "Tiếng bàn in làm lính tuần chú ý. Truyền đơn in được quá ít.",
    time: 15,
    fact: "Ngày 1/5/1930, lần đầu tiên công nhân, nông dân và quần chúng khắp ba kỳ mít tinh, biểu tình dưới sự lãnh đạo của Đảng. Ở Nghệ An, công nhân Vinh – Bến Thủy cùng nông dân các vùng lân cận đấu tranh mạnh mẽ.",
    mechanism: "Tuyên truyền, vận động quần chúng đấu tranh",
    sources: [SRC_GT, SRC_BN],
  },
  {
    id: "m2",
    kind: "decision",
    chapter: 1,
    date: "9/1930",
    place: "Hưng Nguyên, Nghệ An",
    title: "Ai nắm việc làng?",
    art: "bo-cao-1930",
    brief: [
      "Ngày 12/9/1930, hơn 8.000 nông dân Hưng Nguyên biểu tình. Máy bay Pháp ném bom vào đoàn người, 217 người chết.",
      "Phong trào không lùi bước. Ở nhiều làng, cường hào bỏ trốn, bộ máy cai trị cũ tan rã. Làng của {ten} phải tự lo lấy mọi việc.",
    ],
    prompt: "Theo chủ trương của chi bộ, ai sẽ đứng ra điều hành mọi việc trong làng?",
    options: [
      {
        id: "a",
        text: "Ban chấp hành nông hội do chi bộ Đảng lãnh đạo",
        correct: true,
        outcome: "Nông hội đứng ra chia ruộng công, xóa nợ, giữ trật tự. Làng bạn trở thành một Xô viết.",
      },
      {
        id: "b",
        text: "Hội đồng kỳ mục của làng, có thêm người của nông hội tham gia",
        outcome: "Chưa đúng. Hội đồng kỳ mục là bộ máy của chế độ cũ; ghép thêm người vào thì quyền hành vẫn nằm trong tay hào lý.",
      },
      { id: "c", text: "Ủy ban Việt Minh của xã", outcome: "Chưa đúng. Mặt trận Việt Minh ra đời năm 1941, hơn mười năm sau." },
    ],
    time: 20,
    fact: "Ở nhiều vùng nông thôn Nghệ An, Hà Tĩnh, chính quyền thực dân, phong kiến tan rã; các ban chấp hành nông hội ở thôn, xã do chi bộ Đảng lãnh đạo đứng ra quản lý mọi mặt đời sống ở nông thôn, làm chức năng của chính quyền theo hình thức Xô viết. Xô viết Nghệ – Tĩnh là đỉnh cao của phong trào cách mạng 1930–1931.",
    mechanism: "Dựa vào nông hội do chi bộ lãnh đạo để xây dựng chính quyền kiểu Xô viết",
    sources: [SRC_GT, SRC_BN],
  },
  {
    id: "m3",
    kind: "mini",
    game: "sort",
    chapter: 1,
    date: "10/1930",
    place: "Hưng Nguyên, Nghệ An",
    title: "Sắc lệnh của Xô viết",
    art: "cay-ruong",
    brief: [
      "Chính quyền Xô viết của làng ban hành nhiều chính sách mới cùng một lúc.",
      "{ten} được giao dán yết thị ở đình làng, chia vào ba bảng: Chính trị, Kinh tế, Văn hóa – xã hội. Dán nhầm bảng thì bà con dễ hiểu sai.",
    ],
    howto: "Mỗi lần hiện một tờ yết thị: chạm vào đúng bảng của nó. Vừa nhanh vừa đúng thì được nhiều điểm.",
    win: "Đình làng kín yết thị. Bà con đọc, bàn tán, phấn khởi làm theo.",
    lose: "Yết thị dán lẫn lộn, bà con hiểu sai chủ trương của Xô viết.",
    time: 40,
    fact: "Chính quyền Xô viết thực hiện quyền tự do dân chủ cho nhân dân, lập nông hội, công hội, trấn áp bọn phản cách mạng; chia ruộng đất công cho dân nghèo, bãi bỏ thuế thân, thuế chợ, thuế đò, thuế muối, xóa nợ cho người nghèo; mở lớp dạy chữ quốc ngữ, bài trừ mê tín dị đoan, rượu chè, cờ bạc, giữ vững trật tự trị an.",
    mechanism: "Giải quyết quyền lợi thiết thực của quần chúng trên mọi mặt đời sống",
    sources: [SRC_GT, SRC_TCCT],
  },
  {
    id: "m4",
    kind: "decision",
    chapter: 1,
    date: "Cuối năm 1930",
    place: "Hải Phòng",
    title: "Bản Luận cương từ Hương Cảng",
    art: "haiphong-map-1929",
    brief: [
      "Tháng 10/1930, Hội nghị lần thứ nhất Ban Chấp hành Trung ương họp ở Hương Cảng, đổi tên Đảng thành Đảng Cộng sản Đông Dương, thông qua Luận cương chính trị và cử đồng chí Trần Phú làm Tổng Bí thư.",
      "Một bản Luận cương vừa theo tàu biển về tới Hải Phòng. Trước khi chuyển đi, chi bộ đọc kỹ và so sánh với Cương lĩnh tháng 2/1930.",
    ],
    prompt: "So với Cương lĩnh chính trị đầu tiên, Luận cương chính trị tháng 10/1930 còn hạn chế ở điểm nào?",
    options: [
      {
        id: "a",
        text: "Chưa đặt nhiệm vụ chống đế quốc, giành độc lập dân tộc lên hàng đầu; nặng về đấu tranh giai cấp và cách mạng ruộng đất",
        correct: true,
        outcome: "Đúng. Chi bộ ghi lại điểm này để vận động quần chúng cho sát với thực tế.",
      },
      {
        id: "b",
        text: "Không khẳng định giai cấp công nhân, thông qua Đảng Cộng sản, là lực lượng lãnh đạo cách mạng",
        outcome: "Chưa đúng. Luận cương vẫn khẳng định vai trò lãnh đạo của giai cấp công nhân thông qua Đảng Cộng sản.",
      },
      {
        id: "c",
        text: "Chủ trương dựa vào tư sản dân tộc và địa chủ, coi nhẹ lực lượng công nhân, nông dân",
        outcome: "Chưa đúng. Ngược lại, Luận cương đánh giá thấp tư sản dân tộc, tiểu tư sản và chưa thấy khả năng lôi kéo một bộ phận địa chủ.",
      },
    ],
    time: 25,
    fact: "Luận cương chính trị (10/1930) chưa nêu được mâu thuẫn chủ yếu của xã hội thuộc địa là giữa dân tộc Việt Nam với đế quốc Pháp, nên không đặt nhiệm vụ chống đế quốc lên hàng đầu; nặng về đấu tranh giai cấp và cách mạng ruộng đất; đánh giá chưa đúng vai trò của tiểu tư sản, tư sản dân tộc và khả năng lôi kéo một bộ phận địa chủ.",
    mechanism: "Thống nhất đường lối trong toàn Đảng qua văn kiện của Trung ương",
    sources: [SRC_GT, SRC_BN],
  },
  {
    id: "m5",
    kind: "decision",
    chapter: 1,
    date: "Cuối năm 1930",
    place: "Hải Phòng",
    title: "Mắt xích thứ hai",
    art: "haiphong-ship-1906",
    brief: [
      "Bản Luận cương phải qua tay ba người giao liên mới tới được Hà Nội. {ten} là mắt xích thứ hai.",
      "Đêm qua, người thứ nhất bị bắt ngay tại bến tàu. Tài liệu vẫn đang ở trong tay bạn.",
    ],
    prompt: "Theo nguyên tắc đơn tuyến, việc nào bạn TUYỆT ĐỐI không được làm?",
    options: [
      {
        id: "a",
        text: "Báo cho người thứ ba biết tên, chỗ ở của người vừa bị bắt để cùng đề phòng",
        correct: true,
        outcome: "Đúng. Người thứ ba không được biết người thứ nhất; nếu người thứ ba bị bắt, cả đường dây sẽ lộ.",
      },
      { id: "b", text: "Bỏ điểm hẹn cũ, đổi chỗ ở, chờ liên lạc qua đường dây dự phòng", outcome: "Chưa đúng. Bỏ điểm hẹn cũ, đổi chỗ ở là việc nên làm ngay." },
      {
        id: "c",
        text: "Cất giấu tài liệu ở nơi an toàn, tạm ngừng chuyển cho tới khi chắc chắn không bị theo dõi",
        outcome: "Chưa đúng. Tạm cất giấu tài liệu cho tới khi an toàn là việc nên làm.",
      },
    ],
    time: 20,
    fact: "Đường dây giao liên bí mật hoạt động theo nguyên tắc đơn tuyến: mỗi người chỉ biết người liên lạc trực tiếp với mình. Nhờ vậy, khi một người bị bắt, kẻ địch khó lần ra cả đường dây.",
    mechanism: "Đường dây giao liên bí mật theo nguyên tắc đơn tuyến",
    sources: [SRC_GT, SRC_BN],
  },

  /* ── Chương II · 1931 ── */
  {
    id: "m6",
    kind: "mini",
    game: "protect",
    chapter: 2,
    date: "Đầu năm 1931",
    place: "Hà Nội",
    title: "Đêm vây ráp",
    art: "hanoi-garde-1930",
    brief: [
      "Mật thám chuẩn bị vây ráp hàng loạt cơ sở trong đêm.",
      "Tin báo về kịp lúc. {ten} chỉ có vài giây để báo cho những cơ sở đang bị theo dõi rút vào bí mật.",
    ],
    howto: "Chạm vào các cơ sở đang nhấp nháy đỏ trước khi đèn pha của mật thám quét tới. Đừng chạm cơ sở an toàn.",
    win: "Các cơ sở bị theo dõi kịp cất giấu tài liệu, cán bộ chuyển đi nơi khác an toàn.",
    lose: "Mật thám ập vào nhiều cơ sở. Nhiều đồng chí bị bắt.",
    time: 15,
    fact: "Trong khủng bố trắng, giữ được cơ sở bí mật và giữ vững nguyên tắc hoạt động bí mật là điều kiện để phong trào phục hồi về sau.",
    mechanism: "Giữ vững nguyên tắc bí mật, bảo toàn cơ sở",
    sources: [SRC_GT],
  },
  {
    id: "m7",
    kind: "mini",
    game: "spy",
    chapter: 2,
    date: "Đầu năm 1931",
    place: "Hà Nội",
    title: "Kẻ chỉ điểm",
    art: "hanoi-map-1929",
    brief: [
      "Sau đêm vây ráp, chi bộ nhận ra mật thám đã ập vào đúng những cơ sở mà một người nắm được. Trong hàng ngũ có kẻ chỉ điểm.",
      "Theo nguyên tắc đơn tuyến, mỗi giao liên chỉ biết vài cơ sở. {ten} phải đối chiếu thật nhanh để cắt liên lạc với kẻ phản bội trước khi hắn kịp báo thêm.",
    ],
    howto: "Cơ sở đỏ là bị phá, xanh là an toàn. Kẻ chỉ điểm là người biết đúng và đủ các cơ sở bị phá. Chạm vào người đó. Có hai vụ liên tiếp.",
    win: "Kẻ chỉ điểm bị cô lập. Các cơ sở còn lại kịp đổi địa điểm.",
    lose: "Chậm phát hiện, kẻ chỉ điểm tiếp tục báo cho mật thám.",
    time: 40,
    fact: "Cùng với khủng bố, thực dân Pháp dùng mật thám, mua chuộc kẻ phản bội để phá tổ chức Đảng. Nguyên tắc hoạt động bí mật, đơn tuyến giúp hạn chế thiệt hại và kịp thời cô lập kẻ phản bội.",
    mechanism: "Cảnh giác, cô lập kẻ phản bội để bảo vệ tổ chức",
    sources: [SRC_GT],
  },
  {
    id: "m8",
    kind: "decision",
    chapter: 2,
    date: "9/1931",
    place: "Hà Nội",
    title: "Lời nhắn của Tổng Bí thư",
    art: "tran-phu",
    brief: [
      "Tháng 4/1931, Tổng Bí thư Trần Phú bị địch bắt ở Sài Gòn. Bị tra tấn dã man, đồng chí vẫn giữ trọn khí tiết.",
      "Ngày 6/9/1931, đồng chí hy sinh. Lời nhắn cuối cùng của đồng chí được truyền đi trong các nhà tù và các chi bộ.",
    ],
    prompt: "{ten} chép lời nhắn ấy vào mật thư gửi các cơ sở. Đâu đúng là lời nhắn của Tổng Bí thư Trần Phú?",
    options: [
      { id: "a", text: "“Hãy giữ vững chí khí chiến đấu!”", correct: true, outcome: "Mật thư được chuyền tay. Các đồng chí trong tù và ngoài cơ sở thêm vững lòng." },
      {
        id: "b",
        text: "“Con đường của thanh niên chỉ có thể là con đường cách mạng, không thể có con đường nào khác.”",
        outcome: "Chưa đúng. Đây là lời của đồng chí Lý Tự Trọng trước tòa án thực dân ở Sài Gòn năm 1931. Anh hy sinh ngày 21/11/1931, khi mới 17 tuổi.",
      },
      { id: "c", text: "“Không có gì quý hơn độc lập, tự do.”", outcome: "Chưa đúng. Đây là lời của Chủ tịch Hồ Chí Minh năm 1966." },
    ],
    time: 20,
    fact: "Tổng Bí thư Trần Phú (1904–1931) hy sinh ngày 6/9/1931 tại nhà thương Chợ Quán, Sài Gòn. Lời nhắn “Hãy giữ vững chí khí chiến đấu!” trở thành tinh thần của những người cộng sản trong những năm khôi phục phong trào.",
    mechanism: "Nêu gương khí tiết của người lãnh đạo, giữ vững tinh thần chiến đấu",
    sources: [SRC_GT, SRC_BN, SRC_LTT],
  },
  {
    id: "m9",
    kind: "mini",
    game: "sneak",
    chapter: 2,
    date: "Cuối năm 1931",
    place: "Hà Nội",
    title: "Vượt vòng vây",
    art: "nguyen-ai-quoc-1921",
    brief: [
      "Từ tháng 6/1931, khi Nguyễn Ái Quốc bị nhà cầm quyền Anh bắt ở Hương Cảng, liên lạc với bên ngoài bị cắt đứt. Mật thám siết chặt vòng vây khắp Hà Nội.",
      "{ten} nhận lệnh băng qua thành phố trong đêm, mang tin tới căn nhà an toàn để các đồng chí còn lại kịp đổi chỗ ở.",
    ],
    howto: "Kéo ngón tay hoặc chuột ở bất kỳ đâu trên bản đồ để đưa chấm đỏ tới căn nhà có ngọn đèn. Tránh vùng sáng của đèn pha.",
    win: "Tin được đưa tới kịp lúc. Các đồng chí rời nơi ở cũ ngay trong đêm.",
    lose: "Đèn pha quét trúng. Bạn phải lẩn vào ngõ tối, tin tới chậm.",
    time: 30,
    fact: "Đến giữa năm 1931, tổ chức Đảng từ Trung ương đến địa phương hầu hết bị phá vỡ, hầu hết các ủy viên Ban Chấp hành Trung ương và nhiều xứ ủy viên bị bắt.",
    mechanism: "Duy trì liên lạc khi tổ chức bị phá vỡ",
    sources: [SRC_GT, SRC_BN],
  },
  {
    id: "m10",
    kind: "mini",
    game: "interrogate",
    chapter: 2,
    date: "Cuối năm 1931",
    place: "Sở Mật thám, Hà Nội",
    title: "Hỏi cung",
    art: "hoa-lo",
    brief: [
      "Trong một trận lùng sục cuối năm 1931, {ten} bị bắt. Ở Sở Mật thám, chúng hỏi dồn dập để moi ra đường dây.",
      "Chi bộ đã dặn bạn một lý lịch giả. Chỉ cần khai lệch một chi tiết, chúng sẽ biết bạn nói dối.",
    ],
    howto: "Ghi nhớ thật nhanh lý lịch giả. Sau đó trả lời từng câu hỏi khớp với lý lịch; gặp câu gài bẫy thì không khai gì.",
    win: "Mật thám không moi được gì. Đường dây vẫn an toàn.",
    lose: "Lời khai có chỗ vênh. Mật thám càng tra hỏi gắt gao.",
    time: 50,
    fact: "Trong những năm khủng bố trắng, nhiều chiến sĩ cộng sản bị bắt, bị tra tấn dã man vẫn giữ vững khí tiết, không khai báo, bảo vệ tổ chức.",
    mechanism: "Giữ vững khí tiết, giữ bí mật tổ chức khi bị bắt",
    sources: [SRC_GT],
  },

  /* ── Chương III · 1932–1933 ── */
  {
    id: "m11",
    kind: "decision",
    chapter: 3,
    date: "1932",
    place: "Nhà tù Hỏa Lò",
    title: "Báo trong tù",
    art: "hoalo-2012",
    brief: [
      "Trong nhà tù Hỏa Lò, chi bộ bí mật tổ chức học văn hóa, học lý luận và ra báo viết tay để anh em chuyền tay nhau đọc.",
      "Chi bộ giao {ten} lập danh mục các tờ báo của tù chính trị để cất giấu. Trong danh sách gửi vào có một tờ chép nhầm.",
    ],
    prompt: "Tờ báo nào KHÔNG phải báo bí mật của tù chính trị ở Hỏa Lò đầu những năm 1930?",
    options: [
      {
        id: "a",
        text: "Thanh niên",
        correct: true,
        outcome: "Đúng. Báo Thanh niên do Nguyễn Ái Quốc sáng lập năm 1925 ở Quảng Châu, là cơ quan của Hội Việt Nam Cách mạng Thanh niên.",
      },
      { id: "b", text: "Đuốc đưa đường", outcome: "Chưa đúng. Đuốc đưa đường là một trong những tờ báo bí mật của tù chính trị ở Hỏa Lò." },
      { id: "c", text: "Con đường chính", outcome: "Chưa đúng. Con đường chính là một trong những tờ báo bí mật của tù chính trị ở Hỏa Lò." },
    ],
    time: 20,
    fact: "Đầu những năm 1930, nhà tù Hỏa Lò là nơi ra nhiều tờ báo bí mật của tù chính trị như Đuốc đưa đường, Con đường chính, Lao tù tin tức… Những người cộng sản lập chi bộ, học tập, rèn luyện; nhà tù trở thành trường học cách mạng.",
    mechanism: "Biến nhà tù thành trường học cách mạng",
    sources: [SRC_ND_BAOCHI, SRC_GT],
  },
  {
    id: "m12",
    kind: "mini",
    game: "timeline",
    chapter: 3,
    date: "1932",
    place: "Nhà tù Hỏa Lò",
    title: "Bài cho báo Đuốc đưa đường",
    art: "hoalo-2012",
    brief: [
      "Chi bộ viết bài tổng kết phong trào 1930–1931 cho tờ Đuốc đưa đường. Các mẩu tin chuyền qua song sắt đã bị xáo trộn.",
      "{ten} phải xếp lại các sự kiện cho đúng trình tự thời gian trước giờ cai ngục khám phòng.",
    ],
    howto: "Chạm vào các mẩu tin theo thứ tự thời gian, từ sớm nhất đến muộn nhất. Chạm sai bị trừ điểm.",
    win: "Bài viết hoàn thành, được chép tay chuyền khắp các phòng giam.",
    lose: "Các mẩu tin vẫn lộn xộn khi cai ngục ập vào khám phòng.",
    time: 45,
    fact: "Báo chí bí mật trong tù giúp những người cộng sản tổng kết kinh nghiệm phong trào, học tập lý luận và giữ vững tinh thần chiến đấu.",
    mechanism: "Tổng kết kinh nghiệm phong trào để chuẩn bị cho chặng đường mới",
    sources: [SRC_ND_BAOCHI, SRC_GT],
  },
  {
    id: "m13",
    kind: "decision",
    chapter: 3,
    date: "6/1932",
    place: "Nhà tù Hỏa Lò",
    title: "Chương trình hành động",
    art: "hoa-lo",
    brief: [
      "Tháng 6/1932, Chương trình hành động của Đảng Cộng sản Đông Dương được công bố.",
      "Một bản chép tay được bí mật đưa vào phòng giam, lẫn với hai mẩu giấy ghi khẩu hiệu của những thời kỳ khác. {ten} phải nhận ra đâu là các yêu sách của Chương trình.",
    ],
    prompt: "Đâu là các yêu sách của Chương trình hành động năm 1932?",
    options: [
      {
        id: "a",
        text: "Tự do tổ chức, xuất bản, ngôn luận, hội họp, đi lại; thả tù chính trị; bỏ thuế thân và các thứ thuế vô lý; bỏ độc quyền muối, rượu, thuốc phiện",
        correct: true,
        outcome: "Đúng. Anh em trong tù hiểu rõ đường lối mới: đấu tranh từ những quyền lợi thiết thực.",
      },
      { id: "b", text: "Tự do, dân chủ, cơm áo, hòa bình; chống phát xít, chống chiến tranh đế quốc", outcome: "Chưa đúng. Đó là khẩu hiệu của phong trào dân chủ những năm 1936–1939." },
      { id: "c", text: "Đánh đuổi Pháp – Nhật, làm cho Việt Nam hoàn toàn độc lập", outcome: "Chưa đúng. Đó là mục tiêu của Mặt trận Việt Minh từ năm 1941." },
    ],
    time: 25,
    fact: "Chương trình hành động (6/1932) nêu những yêu cầu sát với đời sống, chủ trương kết hợp đấu tranh công khai, hợp pháp với hoạt động bí mật, giúp Đảng tập hợp lại quần chúng.",
    mechanism: "Đòi quyền lợi thiết thực, kết hợp đấu tranh công khai với bí mật",
    sources: [SRC_GT, SRC_BN, SRC_NB],
  },
  {
    id: "m14",
    kind: "mini",
    game: "network",
    chapter: 3,
    date: "1933",
    place: "Nghệ An",
    title: "Nối lại đường dây",
    art: "vinh-1925",
    brief: [
      "Từ cuối năm 1932, nhiều chiến sĩ mãn hạn tù hoặc vượt ngục trở về hoạt động. {ten} cũng được ra tù và trở về Nghệ An.",
      "Các cơ sở cũ tan tác. Bạn phải nối lại một đường dây đi qua mọi xóm trong vùng, qua các cơ sở theo đúng thứ tự, tránh xa đồn lính.",
    ],
    howto: "Kéo một đường liền từ ô số 1, đi qua các ô số theo thứ tự tăng dần và phủ kín mọi ô trống. Không đi qua đồn lính, không đi lại ô đã qua.",
    win: "Đường dây mới nối liền các xóm. Cơ sở bắt đầu hoạt động trở lại.",
    lose: "Đường dây còn đứt đoạn, nhiều xóm chưa liên lạc được.",
    time: 60,
    fact: "Những đảng viên ra tù, vượt ngục cùng những người còn lại ở cơ sở đã chắp nối liên lạc, gây dựng lại tổ chức. Đến đầu năm 1935, hệ thống tổ chức của Đảng được khôi phục.",
    mechanism: "Chắp nối liên lạc, gây dựng lại cơ sở từ những đảng viên còn lại",
    sources: [SRC_GT, SRC_BN],
  },
  {
    id: "m15",
    kind: "decision",
    chapter: 3,
    date: "1933",
    place: "Nghệ An",
    title: "Vỏ bọc hợp pháp",
    art: "rice-1926",
    brief: [
      "Đường dây đã nối lại, nhưng mật thám vẫn để mắt tới những người tù vừa được thả.",
      "Chi bộ bàn cách tập hợp bà con. Có ba hình thức được đề xuất; chỉ một hình thức có thể hoạt động công khai mà không bị đàn áp ngay.",
    ],
    prompt: "Bạn chọn hình thức nào để tập hợp quần chúng lúc này?",
    options: [
      {
        id: "a",
        text: "Lập hội tương tế, phường cấy, phường gặt; bí mật bồi dưỡng người tích cực",
        correct: true,
        outcome: "Cơ sở mới lặng lẽ hình thành dưới vỏ bọc những hội hợp pháp.",
      },
      {
        id: "b",
        text: "Khôi phục ngay Nông hội đỏ như những năm 1930–1931",
        outcome: "Chưa đúng. Nông hội đỏ là tổ chức cách mạng đã bị địch truy lùng gắt gao; lập lại công khai lúc này dễ bị lộ.",
      },
      {
        id: "c",
        text: "Lập chi hội Phản đế đồng minh, treo cờ, mít tinh giữa làng",
        outcome: "Chưa đúng. Hội Phản đế đồng minh là tổ chức bí mật; công khai như vậy sẽ bị đàn áp ngay.",
      },
    ],
    time: 20,
    fact: "Từ năm 1932, các cơ sở kết hợp hoạt động bí mật với các hình thức công khai, hợp pháp như hội tương tế, phường cấy, phường gặt… để tập hợp quần chúng; nhờ đó tổ chức Đảng từng bước được khôi phục.",
    mechanism: "Khôi phục cơ sở qua các hình thức tổ chức hợp pháp",
    sources: [SRC_GT, SRC_BN],
  },

  /* ── Chương IV · 1934–1935 ── */
  {
    id: "m16",
    kind: "decision",
    chapter: 4,
    date: "1934",
    place: "Nghệ An",
    title: "Ban Chỉ huy ở ngoài",
    art: "son-tay",
    reveal: "le-hong-phong",
    brief: [
      "Tháng 3/1934, Ban Chỉ huy ở ngoài của Đảng được thành lập, hoạt động như một Ban Chấp hành Trung ương lâm thời.",
      "Mật thư đầu tiên của Ban Chỉ huy ở ngoài về tới cơ sở của {ten}. Muốn biết thư thật hay giả, bạn phải trả lời đúng câu hỏi kiểm tra.",
    ],
    prompt: "Ban Chỉ huy ở ngoài đặt ở đâu và do ai đứng đầu?",
    options: [
      { id: "a", text: "Ở Ma Cao, do đồng chí Lê Hồng Phong đứng đầu", correct: true, outcome: "Đúng. Đường dây từ Ma Cao về trong nước được nối lại." },
      {
        id: "b",
        text: "Ở Quảng Châu, do đồng chí Lê Hồng Phong đứng đầu",
        outcome: "Chưa đúng. Người đứng đầu đúng là đồng chí Lê Hồng Phong, nhưng Ban Chỉ huy ở ngoài đặt ở Ma Cao.",
      },
      {
        id: "c",
        text: "Ở Ma Cao, do đồng chí Hà Huy Tập đứng đầu",
        outcome: "Chưa đúng. Đồng chí Hà Huy Tập là ủy viên Ban Chỉ huy ở ngoài; người đứng đầu là đồng chí Lê Hồng Phong.",
      },
    ],
    time: 20,
    fact: "Ban Chỉ huy ở ngoài do đồng chí Lê Hồng Phong đứng đầu, cùng các đồng chí Hà Huy Tập, Nguyễn Văn Dựt, nối lại liên lạc với các tổ chức Đảng trong nước và chuẩn bị Đại hội.",
    mechanism: "Ban Chỉ huy ở ngoài giữ vai trò lãnh đạo, nối lại liên lạc",
    sources: [SRC_GT, SRC_BN, SRC_ND_LHP],
  },
  {
    id: "m17",
    kind: "mini",
    game: "ink",
    chapter: 4,
    date: "Đầu năm 1935",
    place: "Nghệ An",
    title: "Thư viết bằng nước chanh",
    art: "cao-bang-1930",
    brief: [
      "Một lá thư hỏi thăm gia đình được gửi tới cơ sở của {ten}. Giữa các dòng chữ là lời dặn viết bằng nước chanh, chỉ hiện ra khi hơ nóng.",
      "Đây là lời dặn chuẩn bị Đại hội. Hơ đèn quá lâu một chỗ, giấy sẽ cháy xém và mất chữ.",
    ],
    howto: "Kéo ngọn đèn dầu qua lá thư để hiện chữ, đừng giữ yên một chỗ. Đọc kỹ rồi trả lời câu hỏi bên dưới.",
    win: "Bạn đọc được lời dặn và chuẩn bị cho đại biểu của cơ sở lên đường.",
    lose: "Lá thư cháy xém, nhiều chữ không đọc được nữa.",
    time: 45,
    fact: "Từ năm 1934, Ban Chỉ huy ở ngoài nối lại liên lạc với các tổ chức Đảng trong nước, chuẩn bị triệu tập Đại hội. Thư từ, chỉ thị đều phải giữ bí mật tuyệt đối.",
    mechanism: "Giữ bí mật thông tin, nối liền liên lạc giữa trong nước và nước ngoài",
    sources: [SRC_GT, SRC_BN],
  },
  {
    id: "m18",
    kind: "decision",
    chapter: 4,
    date: "Đầu năm 1935",
    place: "Hải Phòng",
    title: "Ba nhiệm vụ",
    art: "ha-huy-tap",
    brief: [
      "Tại hội nghị mở rộng tháng 6/1934, Ban Chỉ huy ở ngoài giao đồng chí Hà Huy Tập chuẩn bị các văn kiện cho Đại hội.",
      "Dự thảo nghị quyết được chép tay, gửi về trong nước. {ten} phải tóm tắt đúng ba nhiệm vụ chủ yếu để phổ biến cho các cơ sở.",
    ],
    prompt: "Ba nhiệm vụ chủ yếu mà Đại hội I sẽ đề ra là gì?",
    options: [
      {
        id: "a",
        text: "Củng cố, phát triển Đảng; thu phục quảng đại quần chúng; chống chiến tranh đế quốc",
        correct: true,
        outcome: "Đúng. Các cơ sở thống nhất nhiệm vụ trước ngày Đại hội.",
      },
      { id: "b", text: "Lập Mặt trận dân chủ; đòi tự do, dân chủ, cơm áo, hòa bình; chống phát xít", outcome: "Chưa đúng. Đó là chủ trương của thời kỳ 1936–1939." },
      {
        id: "c",
        text: "Lập lại các Xô viết; chia ruộng đất cho dân cày; phát động bạo động ngay",
        outcome: "Chưa đúng. Sau những tổn thất 1930–1931, Đảng tập trung khôi phục lực lượng, không chủ trương bạo động ngay.",
      },
    ],
    time: 25,
    fact: "Đại hội I (27–31/3/1935) đề ra ba nhiệm vụ chủ yếu: củng cố và phát triển Đảng; đẩy mạnh cuộc vận động thu phục quần chúng; mở rộng tuyên truyền chống đế quốc, chống chiến tranh, ủng hộ Liên Xô và cách mạng Trung Quốc.",
    mechanism: "Thống nhất nhiệm vụ của toàn Đảng",
    sources: [SRC_GT, SRC_NB, SRC_ND_HHT],
  },
  {
    id: "m19",
    kind: "mini",
    game: "cipher",
    chapter: 4,
    date: "Đầu năm 1935",
    place: "Hải Phòng",
    title: "Mật thư cuối cùng",
    art: "macau-map",
    brief: [
      "Ngày giờ và nơi họp Đại hội chỉ được báo bằng điện tín mật mã.",
      "Lần này không có chìa khóa gửi kèm. {ten} chỉ biết mọi bức điện của Ban Chỉ huy ở ngoài đều mở đầu bằng hai chữ ĐẠI HỘI.",
    ],
    howto: "Xoay vòng ngoài của đĩa mã cho tới khi dòng bút chì đọc ra chữ DAI HOI ở đầu bức điện, rồi bấm Đọc thư.",
    win: "Bạn đọc được mật thư và báo kịp cho đại biểu của cơ sở mình lên đường.",
    lose: "Giải mã quá chậm. Đại biểu phải lên đường gấp, suýt lỡ hẹn.",
    time: 40,
    fact: "Đại hội đại biểu lần thứ nhất của Đảng họp từ ngày 27 đến ngày 31/3/1935 tại Ma Cao (Trung Quốc).",
    mechanism: "Giữ bí mật thông tin của tổ chức",
    sources: [SRC_GT, SRC_NB],
  },
  {
    id: "m20",
    kind: "mini",
    game: "door",
    wide: true,
    chapter: 4,
    date: "3/1935",
    place: "Phố Quan Công, Ma Cao",
    title: "Gác cửa hội trường",
    art: "macau-map",
    brief: [
      "Ma Cao, cuối tháng 3/1935. Tại một địa điểm ở phố Quan Công, Đại hội đại biểu lần thứ nhất của Đảng sắp khai mạc.",
      "{ten} được giao gác cửa nơi họp: kiểm tra ám hiệu và giấy tờ của từng người gõ cửa, chỉ mời đúng đại biểu vào, khéo léo mời người lạ ra để giữ bí mật cuộc họp.",
    ],
    howto: "So câu khách đáp với thẻ ám hiệu. Từ khách thứ 7 xem thêm dấu trên giấy giới thiệu, từ khách thứ 14 so mép nửa mảnh giấy. Đúng hết: Mời vào; sai một điểm: Mời ra.",
    win: "Bạn giữ cửa chặt chẽ. Đủ 13 đại biểu đã vào nơi họp, Đại hội khai mạc an toàn.",
    lose: "Cửa nơi họp còn nhiều sơ hở, đồng chí phụ trách phải kiểm tra lại nhiều lượt. Đủ 13 đại biểu vẫn vào nơi họp, Đại hội khai mạc đúng hẹn.",
    time: 110,
    fact: "Từ ngày 27 đến 31/3/1935, Đại hội đại biểu lần thứ nhất của Đảng họp tại một địa điểm ở phố Quan Công (Ma Cao) với 13 đại biểu thay mặt cho các đảng bộ trong nước và các tổ chức đảng ở nước ngoài. Đồng chí Hà Huy Tập chủ trì Đại hội; đồng chí Lê Hồng Phong vắng mặt vì đang dẫn đoàn đại biểu của Đảng đi dự Đại hội VII Quốc tế Cộng sản.",
    mechanism: "Khôi phục hệ thống tổ chức từ Trung ương đến địa phương, từ trong nước ra ngoài nước",
    sources: [SRC_GT, SRC_NB, SRC_ND_HHT, SRC_DDDN_DH1],
  },
];

/** Thời lượng ước tính của một lượt chơi (hiện ở trang chủ, luật chơi, phòng chờ). */
export const PLAY_TIME = "khoảng 18 phút";

export const MISSION = Object.fromEntries(MISSIONS.map((m) => [m.id, m])) as Record<string, Mission>;
export const TOTAL = MISSIONS.length;

export const chapterOf = (no: number) => CHAPTERS[no - 1];
/** Nhiệm vụ cuối của mỗi chương (sau nhiệm vụ này hiện bảng xếp hạng). */
export const isChapterEnd = (i: number) => i === MISSIONS.length - 1 || MISSIONS[i + 1].chapter !== MISSIONS[i].chapter;

export const withName = (text: string, name: string) => text.replaceAll("{ten}", name || "đồng chí");

/* ───────────────────────── Danh hiệu ───────────────────────── */

export const TITLES = [
  { min: 21000, name: "Giao liên kiên trung", desc: "Gần như không để đứt một mạch nào. Bạn xứng đáng có mặt trong ngày Đại hội." },
  { min: 15500, name: "Người giữ mạch ngầm", desc: "Bạn giữ được đường dây qua những năm khó khăn nhất của phong trào." },
  { min: 10500, name: "Đảng viên vững vàng", desc: "Vài lần vấp ngã, nhưng bạn luôn trở lại với tổ chức." },
  { min: 0, name: "Đảng viên trẻ", desc: "Con đường còn dài. Hãy chơi lại để hiểu sâu hơn từng chặng đường của Đảng." },
];

export const titleFor = (score: number) => TITLES.find((t) => score >= t.min) ?? TITLES[TITLES.length - 1];
