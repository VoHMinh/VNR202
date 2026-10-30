export interface MiniProps {
  /** Thời gian cho phép, tính bằng giây. */
  seconds: number;
  /** Mốc bắt đầu, Date.now() lúc trò chơi mở. */
  startedAt: number;
  /** Gọi đúng MỘT lần khi xong hoặc hết giờ, điểm từ 0 đến 1000. */
  onFinish: (score: number) => void;
}
