import type { Metadata, Viewport } from "next";
import { Cousine, Literata, Oswald } from "next/font/google";
import "./globals.css";

/* Ba phông chữ đều có bộ dấu tiếng Việt:
   Oswald: chữ đứng kiểu áp phích, báo chí thập niên 1930 (tiêu đề, nhãn, nút).
   Cousine: chữ máy đánh chữ (cùng khuôn với Courier) cho hồ sơ, mật thư.
   Literata: chữ sách cho lời dẫn truyện. */
const head = Oswald({ variable: "--font-head", subsets: ["vietnamese", "latin"] });
const type = Cousine({ variable: "--font-type", subsets: ["vietnamese", "latin"], weight: ["400", "700"] });
const text = Literata({ variable: "--font-text", subsets: ["vietnamese", "latin"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Mạch Ngầm · Hồ sơ mật 1930–1935",
  description:
    "Trò chơi lịch sử: vào vai một giao liên của Đảng, giữ vững đường dây bí mật qua cao trào 1930–1931, những năm khủng bố trắng, tới Đại hội đại biểu lần thứ nhất của Đảng (3/1935).",
};

export const viewport: Viewport = {
  themeColor: "#120d09",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${head.variable} ${type.variable} ${text.variable} h-full antialiased`}>
      <body className="min-h-full">
        {/* Bộ lọc SVG dùng chung cho dấu mộc: mép sần và mực in không đều. */}
        <svg aria-hidden width="0" height="0" className="absolute">
          <filter id="rough-ink" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="d" />
            <feTurbulence type="fractalNoise" baseFrequency="0.32" numOctaves="3" seed="8" result="spots" />
            <feColorMatrix in="spots" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.8 1.6" result="mask" />
            <feComposite in="d" in2="mask" operator="in" />
          </filter>
          {/* Bản in typo: mép chữ hơi sần, thỉnh thoảng thiếu mực, dùng cho tiêu đề lớn. */}
          <filter id="ink-press" x="-2%" y="-2%" width="104%" height="104%">
            <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="2" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="1.8" xChannelSelector="R" yChannelSelector="G" result="d" />
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="11" result="s" />
            <feColorMatrix in="s" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.7 1.85" result="m" />
            <feComposite in="d" in2="m" operator="in" />
          </filter>
        </svg>
        {children}
      </body>
    </html>
  );
}
