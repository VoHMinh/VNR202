# Mạch Ngầm · Hồ sơ mật 1930–1935

Trò chơi lịch sử cho chủ đề **VNR-T03: Phong trào 1930–1931 và năng lực phục hồi tổ chức** (môn VNR202).

> Câu hỏi nghiên cứu: Đảng đã duy trì và phục hồi phong trào cách mạng sau cao trào 1930–1931 bằng những cơ chế nào?

## Cốt truyện

Người chơi vào vai một đảng viên trẻ làm **giao liên**, bí danh chính là tên mình nhập vào. Qua 4 chương và 20 nhiệm vụ, bạn giữ cho đường dây liên lạc bí mật của Đảng không bị đứt, từ cao trào tháng 5/1930, qua những năm khủng bố trắng, những ngày bị giam ở Hỏa Lò, tới ngày Đảng họp Đại hội đại biểu lần thứ nhất ở Ma Cao (3/1935).

| Chương | Thời gian | Nhiệm vụ |
|---|---|---|
| I. Ngọn lửa tháng Năm | 1930 | In truyền đơn ngày 1/5 · Ai nắm việc làng? · Sắc lệnh của Xô viết · Bản Luận cương từ Hương Cảng · Mắt xích thứ hai |
| II. Khủng bố trắng | 1931 | Đêm vây ráp · Kẻ chỉ điểm · Lời nhắn của Tổng Bí thư · Vượt vòng vây · Hỏi cung |
| III. Trường học trong ngục tối | 1932–1933 | Báo trong tù · Bài cho báo Đuốc đưa đường · Chương trình hành động · Nối lại đường dây · Vỏ bọc hợp pháp |
| IV. Hội tụ ở Ma Cao | 1934–1935 | Ban Chỉ huy ở ngoài · Thư viết bằng nước chanh · Ba nhiệm vụ · Mật thư cuối cùng · Gác cửa hội trường (màn cuối: kiểm tra ám hiệu, giấy tờ, chỉ mời đúng đại biểu vào nơi họp Đại hội) |

Nhân vật chính và các tình huống của nhân vật là hư cấu; mọi sự kiện, nhân vật lịch sử, ngày tháng và con số trong lời dẫn truyện, ghi chú đều theo tài liệu đã đối chiếu. Toàn bộ kịch bản nằm trong [src/game/story.ts](src/game/story.ts).

## Cách chơi (khoảng 18 phút)

- **Mỗi nhiệm vụ:** đọc hồ sơ (ảnh tư liệu + lời dẫn) → làm nhiệm vụ trước khi hết giờ → xem kết quả, hậu quả trong truyện và tư liệu lịch sử kèm nguồn.
- **Trước mỗi trò chơi nhỏ** có thẻ *Cách chơi* (mục tiêu, 3 bước, cách tính điểm, mẹo); đồng hồ chỉ chạy khi người chơi bấm **Bắt đầu**. Trong lúc chơi, dải gợi ý màu vàng luôn hiện phía trên.
- **Hai loại nhiệm vụ:**
  - *Quyết định* (9 nhiệm vụ): câu hỏi đánh đố, các phương án nhiễu đều là chi tiết có thật của thời kỳ khác (khẩu hiệu 1936–1939, mục tiêu Việt Minh 1941, câu nói của Lý Tự Trọng…); đáp án được xáo riêng cho từng người.
  - *Trò chơi nhỏ* (11 nhiệm vụ): in truyền đơn tránh lính tuần; xếp yết thị của Xô viết vào đúng bảng; báo cho cơ sở rút vào bí mật trước khi đèn pha quét tới; suy luận tìm kẻ chỉ điểm theo nguyên tắc đơn tuyến; lẻn qua phố Hà Nội 1929 tránh đèn pha; giữ vững lý lịch giả khi bị hỏi cung; xếp tin cho báo Đuốc đưa đường theo đúng thời gian; nối đường dây đơn tuyến đi qua mọi xóm; hơ đèn đọc thư viết bằng nước chanh; giải điện mật mã không có chìa khóa; và màn cuối *Gác cửa hội trường*: gác cửa nơi họp Đại hội ở phố Quan Công, so câu đáp ám hiệu, xem dấu trên giấy giới thiệu, ghép nửa mảnh giấy xé đôi để chỉ mời đúng đại biểu vào (quy định chặt dần qua ba đợt khách). Ám hiệu, giấy tờ trong màn này là hư cấu; mời nhầm hay hết giờ thì đồng chí phụ trách xác minh và mời vào, nên đủ 13 đại biểu luôn dự Đại hội, người chơi chỉ được hoặc mất điểm.
- **Tính điểm** (giống Kahoot, có chuỗi):
  - Quyết định đúng: 1000 × (1 − thời gian trả lời / thời gian cho phép / 2), tức 500 đến 1000 điểm. Sai hoặc hết giờ: 0.
  - Trò chơi nhỏ: 0 đến 1000 điểm theo kết quả; từ 500 trở lên là hoàn thành.
  - Chuỗi: hoàn thành nhiều nhiệm vụ liên tiếp được thưởng thêm 100 điểm mỗi bậc, tối đa 500.
- **Thắng:** ai nhiều điểm nhất sau 20 nhiệm vụ (tối đa 28.500 điểm). Hết mỗi chương có bảng xếp hạng; điểm và hạng luôn hiện ở góc trên.

## Chơi cùng cả lớp

```bash
npm run class
```

Lệnh này build game, bật server rồi mở đường hầm Cloudflare miễn phí (cần cài `cloudflared`), in ra một đường dẫn dạng `https://xxxx.trycloudflare.com`.

1. Mở đường dẫn đó trên máy chiếu, bấm **Tạo phòng cho lớp**.
2. **Phòng chờ:** cả lớp quét mã QR, nhập bí danh; tên từng người hiện lên màn chiếu.
3. Bấm **Bắt đầu trận**: mọi người cùng vào chơi một lúc.
4. Màn chiếu hiện **đường dây liên lạc** (mỗi người một làn, thẻ tên chạy theo số nhiệm vụ đã làm, chia theo bốn chương) và **bảng xếp hạng trực tiếp**.
5. Bấm **Kết thúc trận, chốt điểm** để hiện bục vinh danh.

Server tự chấm lại từng nhiệm vụ theo phương án đã chọn và thời gian (chống sửa điểm). Dữ liệu phòng nằm trong RAM của server kèm bản sao ở `.data/rooms.json`, tự xóa sau 24 giờ. Muốn đưa lên Vercel: thêm `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN` (Redis miễn phí ở Upstash).

Thử phòng với người chơi ảo: `npm run demo -- 12 --play` (thêm `--end` để chốt trận và xem bục vinh danh).

## Chạy thử trên máy

```bash
npm install
npm run dev
```

## Hình ảnh

- **Ảnh tư liệu** (đều là ảnh và tài liệu thật, không dùng AI vẽ):
  - Chân dung Nguyễn Ái Quốc (Marseille, 1921), các đồng chí Trần Phú, Lê Hồng Phong; ảnh hồ sơ mật thám chụp đồng chí Đặng Xuân Khu (Trường Chinh) ở Hỏa Lò.
  - Bố cáo ba thứ chữ của Khâm sứ Trung Kỳ ký ở Vinh ngày 3/9/1930, đối phó với phong trào Xô viết Nghệ – Tĩnh.
  - Bản đồ Vinh – Bến Thủy (1925), bản đồ Hải Phòng (12/1929), bản đồ Hà Nội (11/1929; hai trò chơi ở Hà Nội diễn ra trên chính bản đồ này, các mốc nhà tù Hỏa Lò, Sở Mật thám, ga Hà Nội đặt đúng vị trí theo chú giải gốc), bản đồ và cảng Ma Cao.
  - Phu mỏ than Đông Triều, Hòn Gai (thập niên 1920), cổng trại Lính khố xanh ở Hà Nội (khoảng 1930), ruộng lúa Bắc Kỳ, nhà tù Côn Đảo.
  - Tất cả lấy từ Wikimedia Commons, thuộc phạm vi công cộng (riêng ảnh cổng trại Lính khố xanh là CC0). Chú thích, nơi lưu giữ và trang giấy phép của từng ảnh nằm trong [src/game/data/art.ts](src/game/data/art.ts). Tải và xử lý lại: `npm run art`.
- **Vân giấy, bìa hồ sơ, mặt bàn gỗ:** ảnh vân bề mặt CC0 của ambientCG (Paper006, Paper003, Cardboard002, Wood051).
- **Cờ:** chỉ dùng cờ đỏ búa liềm (`public/flags/party.svg`, ghép từ hình búa liềm phạm vi công cộng trên Wikimedia Commons), là cờ quần chúng mang trong cao trào 1930–1931. Không dùng cờ đỏ sao vàng vì cờ này ra đời năm 1940.

## Nội dung cần giảng viên duyệt

Kịch bản, tư liệu và nguồn của từng nhiệm vụ nằm trong [src/game/story.ts](src/game/story.ts). Nguồn chính: *Giáo trình Lịch sử Đảng Cộng sản Việt Nam* (Bộ Giáo dục và Đào tạo, Nxb. Chính trị quốc gia Sự thật, 2021), Chương 1; *Lịch sử biên niên Đảng Cộng sản Việt Nam, tập 2* và Niên biểu Ban Chấp hành Trung ương khóa I (trang Tư liệu văn kiện Đảng); báo Nhân Dân. Số trang trích dẫn trong Giáo trình: chờ giảng viên xác nhận (điền vào `SRC_GT`).

## Cấu trúc

```
src/game/story.ts            Kịch bản: mở đầu, 4 chương, 20 nhiệm vụ, kết thúc, danh hiệu
src/game/scoring.ts          Cách tính điểm (dùng chung cho máy người chơi và server)
src/game/session.ts          Trạng thái một lượt chơi (zustand)
src/game/data/art.ts         Ảnh tư liệu và nguồn
src/game/data/minis.ts       Nội dung các trò chơi nhỏ và thẻ Cách chơi
src/components/play/         Các màn chơi: mở đầu, chương, hồ sơ nhiệm vụ, kết quả, bảng xếp hạng, tổng kết
src/components/minigames/    Trò chơi nhỏ: in truyền đơn, xếp yết thị, kẻ chỉ điểm, hỏi cung, xếp tin, nối đường dây, thư nước chanh, mật mã, gác cửa hội trường
src/components/mapgames/     Trò chơi trên bản đồ phố: đêm vây ráp, vượt vòng vây
src/components/host/         Màn chủ phòng: phòng chờ, đường dây trực tiếp, vinh danh
src/components/kit/          Thành phần giao diện: nút, dấu mộc, chữ đánh máy, đồng hồ, cờ bay
src/server/rooms.ts          Lưu phòng: RAM + file, hoặc Upstash Redis
src/app/                     Trang chủ, /play, /host, /host/[code], /board/[code], API
```
