"use client";

import { AnimatePresence, motion, useAnimate } from "motion/react";
import { Check, EyeOff, X } from "lucide-react";
import { memo, useCallback, useEffect, useId, useRef, useState } from "react";
import { Btn } from "@/components/kit/Btn";
import { Stamp } from "@/components/kit/Stamp";
import { Typed } from "@/components/kit/Typed";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/sfx";
import { GRAIN, isTypingTarget, useBox, useFinishOnce } from "./shared";
import { makeInterrogation, type CoverLine, type Question } from "./interrogate-plan";
import type { MiniProps } from "./types";
import { PASS_MINI } from "@/game/scoring";

/*
 * "Hỏi cung" (cuối năm 1931, Sở Mật thám Hà Nội): người chơi bị bắt, phải khai đúng lý lịch giả đã học thuộc
 * và không nhận bất cứ điều gì. Tám giây đầu xem giấy căn cước giả, sau đó bảy câu hỏi, mỗi câu 5 giây.
 * Mỗi câu đúng: (1000 / 7) × (1 − 0,4 × thời gian trả lời / 5 giây) điểm. Sai hoặc để hết giờ: 0 điểm.
 * Từ 5 câu đúng trở lên: "Không khai". Dưới 5 câu: "Sơ hở".
 */

const MEMO_S = 8;
const Q_S = 5;
const OK_MS = 450;
const BAD_MS = 700;
const END_MS = 1100;
/** Dấu "Không khai" khớp với mức hoàn thành nhiệm vụ (từ 500 điểm, xem PASS_MINI). */
const PASS = PASS_MINI;

type Phase = "memo" | "ask" | "feedback" | "done";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function Interrogate({ seconds, startedAt, onFinish }: MiniProps) {
  // Giữ mốc giờ và đề lúc mở trò chơi: khung cha vẽ lại cũng không đổi.
  const [t0] = useState(startedAt);
  const [secs] = useState(seconds);
  const [plan] = useState(() => makeInterrogation(startedAt));
  const finish = useFinishOnce(onFinish);
  const [boxRef, box] = useBox<HTMLDivElement>();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const total = plan.questions.length;

  const [phase, setPhase] = useState<Phase>("memo");
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [marks, setMarks] = useState<(boolean | null)[]>(() => plan.questions.map(() => null));
  const [score, setScore] = useState(0);
  const [alarm, setAlarm] = useState(0);
  const [timeUp, setTimeUp] = useState(false);

  const phaseRef = useRef<Phase>("memo");
  const qiRef = useRef(0);
  const qStart = useRef(0);
  const scoreRef = useRef(0);
  const memoBar = useRef<HTMLSpanElement>(null);
  const qBar = useRef<HTMLSpanElement>(null);

  const begin = useCallback(
    (i: number) => {
      if (phaseRef.current === "done") return;
      if (Date.now() >= t0 + secs * 1000) return;
      qiRef.current = i;
      qStart.current = Date.now();
      phaseRef.current = "ask";
      setQi(i);
      setPicked(null);
      setPhase("ask");
    },
    [secs, t0],
  );

  /** Trả lời câu đang hỏi; `opt` = −1 nghĩa là để hết giờ của câu. */
  const answer = useCallback(
    (opt: number) => {
      if (phaseRef.current !== "ask") return;
      const now = Date.now();
      if (now >= t0 + secs * 1000) return;
      const i = qiRef.current;
      const q = plan.questions[i];
      if (opt >= q.options.length) return;
      const t = clamp((now - qStart.current) / 1000, 0, Q_S);
      const ok = opt === q.answer;
      const pts = ok ? Math.round((1000 / total) * (1 - (0.4 * t) / Q_S)) : 0;
      scoreRef.current = Math.min(1000, scoreRef.current + pts);
      phaseRef.current = "feedback";
      setPicked(opt);
      setPhase("feedback");
      setScore(scoreRef.current);
      setMarks((m) => m.map((v, j) => (j === i ? ok : v)));
      if (ok) {
        sfx.tick();
      } else {
        sfx.wrong();
        setAlarm((a) => a + 1);
        if (scope.current) animate(scope.current, { x: [0, -7, 6, -4, 3, -1, 0] }, { duration: 0.42, ease: "easeOut" });
      }
    },
    [animate, plan, scope, secs, t0, total],
  );

  // Hết giờ xem giấy: tự sang câu hỏi đầu.
  useEffect(() => {
    if (phase !== "memo") return;
    const id = window.setTimeout(() => begin(0), Math.max(0, t0 + MEMO_S * 1000 - Date.now()));
    return () => window.clearTimeout(id);
  }, [begin, phase, t0]);

  // Mỗi câu Q_S giây; ngập ngừng quá lâu với chính lý lịch của mình cũng là sơ hở.
  useEffect(() => {
    if (phase !== "ask") return;
    const id = window.setTimeout(() => answer(-1), Math.max(0, qStart.current + Q_S * 1000 - Date.now()));
    return () => window.clearTimeout(id);
  }, [answer, phase, qi]);

  // Sau một nhịp phản hồi: sang câu tiếp, hoặc khép biên bản.
  useEffect(() => {
    if (phase !== "feedback") return;
    const id = window.setTimeout(
      () => {
        if (phaseRef.current !== "feedback") return;
        if (qiRef.current + 1 < total) begin(qiRef.current + 1);
        else {
          phaseRef.current = "done";
          setPhase("done");
        }
      },
      picked !== null && picked === plan.questions[qi].answer ? OK_MS : BAD_MS,
    );
    return () => window.clearTimeout(id);
  }, [begin, phase, picked, plan, qi, total]);

  // Khép biên bản: đóng dấu rồi chốt điểm (không quá 1,2 giây, không quá giờ).
  useEffect(() => {
    if (phase !== "done") return;
    const id = window.setTimeout(() => finish(scoreRef.current), Math.min(END_MS, Math.max(0, t0 + secs * 1000 - Date.now())));
    return () => window.clearTimeout(id);
  }, [finish, phase, secs, t0]);

  useEffect(() => {
    if (phase !== "done") return;
    const id = window.setTimeout(() => sfx.stamp(), 120);
    return () => window.clearTimeout(id);
  }, [phase]);

  // Hết giờ toàn trò: câu chưa trả lời tính 0 điểm, chốt điểm ngay.
  useEffect(() => {
    const id = window.setTimeout(
      () => {
        if (phaseRef.current !== "done") {
          phaseRef.current = "done";
          setPhase("done");
          setTimeUp(true);
        }
        finish(scoreRef.current);
      },
      Math.max(0, t0 + secs * 1000 - Date.now()),
    );
    return () => window.clearTimeout(id);
  }, [finish, secs, t0]);

  // Vạch thời gian: xem giấy (7 giây) và từng câu hỏi (4 giây). Vẽ thẳng vào DOM, không vẽ lại cả trò chơi mỗi khung hình.
  useEffect(() => {
    if (phase !== "memo" && phase !== "ask") return;
    let raf = 0;
    const loop = () => {
      const now = Date.now();
      if (phase === "memo") {
        const k = clamp(1 - (now - t0) / (MEMO_S * 1000), 0, 1);
        if (memoBar.current) memoBar.current.style.transform = `scaleX(${k})`;
      } else {
        const k = clamp(1 - (now - qStart.current) / (Q_S * 1000), 0, 1);
        const el = qBar.current;
        if (el) {
          el.style.transform = `scaleX(${k})`;
          el.style.backgroundColor = k < 0.3 ? "#b3261e" : "#2c241b";
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, qi, t0]);

  // Phím 1, 2, 3 để trả lời; Enter hoặc phím cách để thôi xem giấy.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      if (phaseRef.current === "ask" && /^[1-3]$/.test(e.key)) {
        e.preventDefault();
        answer(Number(e.key) - 1);
        return;
      }
      if (phaseRef.current === "memo" && (e.key === "Enter" || e.key === " ")) {
        const el = e.target as HTMLElement | null;
        if (el && /^(BUTTON|A)$/.test(el.tagName)) return;
        e.preventDefault();
        begin(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, begin]);

  const W = box.w || 700;
  const H = box.h || 450;
  const wide = W >= 520;
  const k = wide ? clamp(Math.min(W / 700, H / 450), 0.88, 1.12) : clamp(Math.min(H / 340, W / 345), 0.86, 1.15);
  const pad = wide ? 12 : 7;
  // Điện thoại: biên bản cần khoảng 7,1 lần cỡ chữ cộng ba nút cao 40px; phần còn lại phía trên là cảnh phòng hỏi cung.
  const panelNeed = 7.1 * 16 * k + 3 * 40 + 18;
  const stageH = wide ? H : clamp(H - pad - panelNeed, H < 320 ? 64 : 78, H * 0.45);
  const q: Question | undefined = phase === "memo" ? undefined : plan.questions[qi];
  const correct = marks.filter((m) => m === true).length;
  const bad = phase === "feedback" && picked !== null && q !== undefined && picked !== q.answer;

  return (
    <div
      ref={boxRef}
      data-game="interrogate"
      data-phase={phase}
      data-q={phase === "memo" ? 0 : qi + 1}
      data-total={total}
      data-answer={q && phase !== "done" ? q.answer : ""}
      data-correct={correct}
      data-score={score}
      data-done={phase === "done" ? 1 : 0}
      className="relative h-full w-full select-none overflow-hidden bg-[#0e0a07]"
      style={{ fontSize: 16 * k }}
    >
      <div ref={scope} className="absolute inset-0">
        <Wall />
        {box.w > 0 && (
          <>
            <div className="absolute left-0 top-0" style={{ width: wide ? "44%" : "100%", height: stageH }}>
              <Room alarm={alarm} />
            </div>
            {phase !== "memo" && q && (
              <div
                className={cn("absolute flex flex-col", wide ? "justify-center" : "justify-start")}
                style={wide ? { left: "44%", right: pad, top: pad, bottom: pad } : { left: pad, right: pad, top: stageH - 4, bottom: pad }}
              >
                <Transcript
                  q={q}
                  qi={qi}
                  total={total}
                  marks={marks}
                  phase={phase}
                  picked={picked}
                  bad={bad}
                  barRef={qBar}
                  onAnswer={answer}
                  passed={score >= PASS}
                  correct={correct}
                  timeUp={timeUp}
                  wide={wide}
                />
              </div>
            )}
          </>
        )}
        {/* Ánh đèn đỏ lóe lên khi khai lệch. */}
        <AnimatePresence>
          {alarm > 0 && bad && (
            <motion.div
              key={alarm}
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(ellipse 80% 90% at 22% 18%, rgba(220,40,24,0.55), rgba(120,10,6,0.35) 55%, rgba(60,0,0,0.25))", mixBlendMode: "multiply" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.25, 0.9, 0.35, 0.7] }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ duration: 0.6, times: [0, 0.12, 0.3, 0.45, 0.7, 1] }}
            />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {phase === "memo" && box.w > 0 && (
          <motion.div
            key="memo"
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/55"
            style={{ padding: pad, gap: wide ? 10 : 7 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
          >
            <IdCard cover={plan.cover} wide={wide} />
            <div className="flex w-[min(100%,24em)] items-center gap-[0.6em]">
              <span className="relative block h-[0.5em] flex-1 overflow-hidden rounded-full bg-black/55 shadow-[inset_0_0_0_1px_rgba(241,231,208,0.2)]">
                <span ref={memoBar} className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-[#c9952a] to-gold" />
              </span>
              <Btn tone="red" size="sm" data-action="ready" onClick={() => begin(0)} className="h-10 px-3.5">
                <EyeOff className="h-4 w-4" aria-hidden />
                Đã nhớ
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────────── Vách phòng hỏi cung ───────────────────────────── */

const Wall = memo(function Wall() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #221a14 0%, #17110c 55%, #0d0906 100%)" }} />
      <div className="absolute inset-0 opacity-40 mix-blend-multiply" style={{ backgroundImage: GRAIN }} />
      {/* vữa tường bong tróc: vài mảng loang sáng tối */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 40% 30% at 78% 22%, rgba(120,100,80,0.10), transparent 70%), radial-gradient(ellipse 30% 40% at 12% 70%, rgba(0,0,0,0.35), transparent 70%)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 120% 110% at 30% 35%, transparent 40%, rgba(0,0,0,0.7) 100%)" }} />
    </div>
  );
});

/* ───────────────────────────── Bàn hỏi cung dưới ngọn đèn treo ───────────────────────────── */

/** Ngọn đèn treo, viên mật thám (chỉ là bóng đen, không vẽ mặt), mặt bàn có tập hồ sơ. Khung 200 × 150, tràn ra ngoài để phủ kín chỗ trống. */
const Room = memo(function Room({ alarm }: { alarm: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg aria-hidden viewBox="0 0 200 150" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full overflow-visible">
      <style>{`@keyframes mn-swing{0%,100%{transform:rotate(-1.3deg)}50%{transform:rotate(1.3deg)}}@keyframes mn-smoke{0%{transform:translate(0,0);opacity:0}25%{opacity:.55}100%{transform:translate(-5px,-26px);opacity:0}}`}</style>
      <defs>
        <radialGradient id={`gl${uid}`} gradientUnits="userSpaceOnUse" cx="100" cy="40" r="150">
          <stop offset="0" stopColor="#ffd98f" stopOpacity="0.34" />
          <stop offset="0.35" stopColor="#d9a35a" stopOpacity="0.12" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`cone${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff1c8" stopOpacity="0.32" />
          <stop offset="1" stopColor="#fff1c8" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id={`tb${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a3020" />
          <stop offset="0.25" stopColor="#2e1d12" />
          <stop offset="1" stopColor="#120b06" />
        </linearGradient>
        <radialGradient id={`pool${uid}`} gradientUnits="userSpaceOnUse" cx="100" cy="122" r="80" gradientTransform="translate(100 122) scale(1 0.32) translate(-100 -122)">
          <stop offset="0" stopColor="#ffd590" stopOpacity="0.5" />
          <stop offset="0.6" stopColor="#c98a45" stopOpacity="0.14" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`sh${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor="#141c16" />
          <stop offset="0.38" stopColor="#3d5444" />
          <stop offset="0.62" stopColor="#24332a" />
          <stop offset="1" stopColor="#0d130f" />
        </linearGradient>
        <linearGradient id={`man${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b0806" />
          <stop offset="1" stopColor="#050403" />
        </linearGradient>
        <filter id={`bl${uid}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      {/* quầng sáng trên tường */}
      <rect x="-400" y="-400" width="1000" height="560" fill={`url(#gl${uid})`} />
      {/* cửa sổ con có song sắt, ánh trăng lạnh */}
      <g opacity="0.55">
        <rect x="22" y="22" width="26" height="20" fill="#1c2430" />
        <rect x="22" y="22" width="26" height="20" fill="none" stroke="#0a0806" strokeWidth="2.2" />
        {[28.5, 35, 41.5].map((x) => (
          <rect key={x} x={x - 0.8} y="22" width="1.6" height="20" fill="#0a0806" />
        ))}
      </g>

      {/* viên mật thám ngồi sau bàn: chỉ là bóng đen, viền sáng do đèn hắt */}
      <g>
        <path
          d="M62 112 C 62 98, 70 90, 84 86 L 92 83 C 94 80, 95 78, 95 75 L 105 75 C 105 78, 106 80, 108 83 L 116 86 C 130 90, 138 98, 138 112 Z"
          fill={`url(#man${uid})`}
        />
        <ellipse cx="100" cy="64" rx="10.5" ry="12.6" fill={`url(#man${uid})`} />
        {/* tóc chải lật một bên */}
        <path d="M89.6 62 C 89 53, 94 50.5, 100.5 50.6 C 107 50.6, 111.4 54, 110.6 61 C 107 56.5, 99 55.5, 89.6 62 Z" fill="#070504" />
        <path d="M89.8 60 C 91 53.4, 96 51, 101 51.1 C 106 51.2, 109.8 53.8, 110.5 58.5" fill="none" stroke="#f3c983" strokeOpacity="0.38" strokeWidth="0.9" />
        <path d="M70 92 C 76 88, 82 86.6, 89 85" fill="none" stroke="#f3c983" strokeOpacity="0.25" strokeWidth="0.9" />
        <path d="M130 92 C 124 88, 118 86.6, 111 85" fill="none" stroke="#f3c983" strokeOpacity="0.25" strokeWidth="0.9" />
        {/* ve áo vest */}
        <path d="M95 76 L 100 92 L 105 76" fill="none" stroke="#1d1712" strokeWidth="1.1" />
        {/* gọng kính tròn bắt ánh đèn, không vẽ nét mặt */}
        <g fill="none" stroke="#8a7458" strokeOpacity="0.55" strokeWidth="0.55">
          <circle cx="95.7" cy="65" r="2.6" />
          <circle cx="104.3" cy="65" r="2.6" />
          <path d="M98.3 64.6 Q 100 63.8, 101.7 64.6" />
        </g>
        <path d="M94.3 63.7 Q 95.4 62.9, 96.7 63.3" fill="none" stroke="#f2e6cc" strokeOpacity="0.45" strokeWidth="0.5" strokeLinecap="round" />
        <path d="M102.9 63.7 Q 104 62.9, 105.3 63.3" fill="none" stroke="#f2e6cc" strokeOpacity="0.45" strokeWidth="0.5" strokeLinecap="round" />
      </g>

      {/* mặt bàn */}
      <rect x="-400" y="111" width="1000" height="300" fill={`url(#tb${uid})`} />
      <rect x="-400" y="111" width="1000" height="1.2" fill="#6b4a30" opacity="0.8" />
      <rect x="-400" y="111" width="1000" height="300" fill={`url(#pool${uid})`} />
      {/* hai bàn tay đặt trên bàn, tập hồ sơ, bút */}
      <path d="M80 112 C 80 117, 86 120, 92 119 L 93 113 Z" fill="#070504" />
      <path d="M120 112 C 120 117, 114 120, 108 119 L 107 113 Z" fill="#070504" />
      <path d="M84 121 L 118 121 L 122 133 L 80 133 Z" fill="#c69f5e" />
      <path d="M84 121 L 118 121 L 122 133 L 80 133 Z" fill="#000" opacity="0.12" />
      <path d="M87 123 L 115 123 M 88 126 L 113 126 M 89 129 L 108 129" stroke="#4b3f31" strokeWidth="0.6" opacity="0.7" />
      <path d="M125 120 L 138 127" stroke="#111" strokeWidth="1.6" strokeLinecap="round" />
      {/* cái mũ thuộc địa đặt trên bàn */}
      <ellipse cx="156" cy="116.5" rx="13" ry="3" fill="#2d2418" />
      <path d="M146 116 C 146 106, 166 106, 166 116 Z" fill="#cdbb92" />
      <path d="M146 116 C 146 106, 166 106, 166 116 Z" fill="#000" opacity="0.35" />
      <path d="M148 113.5 C 152 112.4, 160 112.4, 164 113.5" stroke="#5a4a32" strokeWidth="0.9" fill="none" />
      {/* gạt tàn, khói thuốc */}
      <ellipse cx="50" cy="119" rx="6" ry="1.8" fill="#1a1612" />
      <path d="M44 118.5 C 44 120.8, 56 120.8, 56 118.5" fill="#2a241e" />
      <g style={{ animation: "mn-smoke 3.2s linear infinite" }}>
        <path d="M51 117 C 48 112, 54 109, 51 104 C 48 100, 53 97, 51 93" fill="none" stroke="#cfc5b4" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
      </g>

      {/* ngọn đèn treo: chao sắt tráng men, dây điện từ trần xuống; đung đưa rất nhẹ */}
      <g style={{ transformBox: "view-box", transformOrigin: "100px -60px", animation: "mn-swing 5.2s ease-in-out infinite" }}>
        <polygon points="91,35 109,35 168,112 32,112" fill={`url(#cone${uid})`} />
        <line x1="100" y1="-400" x2="100" y2="19" stroke="#0d0a08" strokeWidth="0.9" />
        <path d="M86.5 35 L 113.5 35 L 106 23.5 Q 100 19, 94 23.5 Z" fill={`url(#sh${uid})`} />
        <path d="M94.5 23.4 Q 100 19.6, 105.5 23.4" fill="none" stroke="#7d9a84" strokeOpacity="0.5" strokeWidth="0.6" />
        <ellipse cx="100" cy="35" rx="13.5" ry="2.4" fill="#e8dfc8" />
        <circle cx="100" cy="36.6" r="3.4" fill="#fff4cf" filter={`url(#bl${uid})`} opacity="0.95" />
        <circle cx="100" cy="36.4" r="2.2" fill="#fffbea" />
        {alarm > 0 && (
          <motion.g key={alarm} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.2, 1, 0.3, 0.9, 0] }} transition={{ duration: 0.7 }}>
            <polygon points="91,35 109,35 168,112 32,112" fill="#e0301d" opacity="0.38" />
            <circle cx="100" cy="36.6" r="5" fill="#ff3a22" filter={`url(#bl${uid})`} />
            <circle cx="100" cy="36.4" r="2.4" fill="#ff8a70" />
          </motion.g>
        )}
      </g>
    </svg>
  );
});

/* ───────────────────────────── Giấy căn cước giả ───────────────────────────── */

function IdCard({ cover, wide }: { cover: CoverLine[]; wide: boolean }) {
  return (
    <motion.div
      className="sheet relative w-[min(100%,24em)] shrink-0 rounded-[3px] shadow-[0_18px_30px_-12px_rgba(0,0,0,0.9),0_3px_6px_rgba(0,0,0,0.5)]"
      style={{ padding: wide ? "0.7em 0.85em 0.75em" : "0.55em 0.7em 0.6em", rotate: "-1.2deg" }}
      initial={{ y: 26, rotate: -6, opacity: 0 }}
      animate={{ y: 0, rotate: -1.2, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-[0.3em] rounded-[2px] border-[1.5px] border-double border-ink/45" style={{ borderWidth: 3 }} />
      <div className="relative flex items-baseline justify-between gap-2 border-b border-ink/40 pb-[0.25em]">
        <div className="min-w-0">
          <div className="font-head font-bold uppercase leading-none tracking-[0.22em] text-ink" style={{ fontSize: "1.02em" }}>
            Giấy căn cước
          </div>
          <div className="mt-[0.15em] font-text italic leading-none text-ink-2" style={{ fontSize: "0.62em" }}>
            Carte d’identité
          </div>
        </div>
        <span className="shrink-0 font-head font-semibold uppercase leading-none tracking-[0.12em] text-stamp" style={{ fontSize: "0.6em" }}>
          Giấy giả · nhớ cho kỹ
        </span>
      </div>
      <div className="relative mt-[0.45em] flex gap-[0.7em]">
        <Portrait />
        <dl className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-[0.6em] gap-y-[0.18em]">
          {cover.map((c) => (
            <div key={c.key} className="contents">
              <dt className="whitespace-nowrap font-head font-semibold uppercase tracking-[0.08em] text-ink-3" style={{ fontSize: "0.6em" }}>
                {c.label}
              </dt>
              <dd data-field={c.key} className="truncate border-b border-dotted border-ink/35 font-text font-semibold leading-[1.3] text-ink" style={{ fontSize: "0.98em" }}>
                {c.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      {/* dấu lăn tay và dấu triện tròn (không chữ) */}
      <svg aria-hidden viewBox="0 0 40 40" className="pointer-events-none absolute bottom-[0.45em] right-[0.6em] h-[2.2em] w-[2.2em] opacity-45">
        {[4, 7, 10, 13, 16].map((r) => (
          <ellipse key={r} cx="20" cy="21" rx={r * 0.78} ry={r} fill="none" stroke="#3b2f45" strokeWidth="1.3" strokeDasharray={r > 10 ? "5 2" : undefined} />
        ))}
      </svg>
    </motion.div>
  );
}

/** Ô ảnh: bóng người mờ, không có khuôn mặt. */
function Portrait() {
  return (
    <div className="relative shrink-0 overflow-hidden rounded-[1px] bg-[#cfc4ad] shadow-[inset_0_0_0_1px_rgba(31,26,20,0.45)]" style={{ width: "3.9em", height: "5em" }}>
      <svg aria-hidden viewBox="0 0 40 52" className="absolute inset-0 h-full w-full">
        <rect width="40" height="52" fill="#b9ad94" />
        <ellipse cx="20" cy="20" rx="8" ry="9.6" fill="#5a5044" />
        <path d="M4 52 C 4 38, 12 33, 20 33 C 28 33, 36 38, 36 52 Z" fill="#5a5044" />
      </svg>
      <span
        aria-hidden
        className="absolute -right-[0.7em] -top-[0.5em] h-[2.6em] w-[2.6em] rounded-full border-[2px] border-[#5b3f73]/50"
        style={{ boxShadow: "inset 0 0 0 3px rgba(91,63,115,0.18)" }}
      />
    </div>
  );
}

/* ───────────────────────────── Biên bản hỏi cung ───────────────────────────── */

function Transcript({
  q,
  qi,
  total,
  marks,
  phase,
  picked,
  bad,
  barRef,
  onAnswer,
  passed,
  correct,
  timeUp,
  wide,
}: {
  q: Question;
  qi: number;
  total: number;
  marks: (boolean | null)[];
  phase: Phase;
  picked: number | null;
  bad: boolean;
  barRef: React.RefObject<HTMLSpanElement | null>;
  onAnswer: (i: number) => void;
  passed: boolean;
  correct: number;
  timeUp: boolean;
  wide: boolean;
}) {
  const done = phase === "done";
  return (
    <motion.div
      className="sheet relative flex max-h-full min-h-0 flex-col rounded-[2px] shadow-[0_18px_30px_-12px_rgba(0,0,0,0.9),0_3px_6px_rgba(0,0,0,0.5)]"
      style={{ padding: wide ? "0.75em 0.85em 0.85em" : "0.55em 0.7em 0.6em", rotate: "0.5deg" }}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative flex shrink-0 items-center gap-[0.5em] border-b-[1.5px] border-ink/70 pb-[0.25em]">
        <span className="label text-ink-2" style={{ fontSize: "0.6em" }}>
          Biên bản hỏi cung
        </span>
        <span className="font-head font-semibold leading-none text-ink" style={{ fontSize: "0.82em" }}>
          Câu {Math.min(qi + 1, total)}/{total}
        </span>
        <span className="ml-auto flex items-center gap-[0.2em]" aria-label={`Đã trả lời đúng ${correct} câu`}>
          {marks.map((m, i) => (
            <span
              key={i}
              className={cn(
                "grid h-[0.95em] w-[0.95em] place-items-center rounded-[2px] border",
                m === null ? (i === qi && !done ? "border-ink/70" : "border-ink/30") : m ? "border-olive bg-olive text-cream" : "border-stamp bg-stamp text-cream",
              )}
            >
              {m === true && <Check className="h-[0.75em] w-[0.75em]" strokeWidth={3.4} />}
              {m === false && <X className="h-[0.75em] w-[0.75em]" strokeWidth={3.4} />}
            </span>
          ))}
        </span>
      </div>
      <span className="relative mt-[0.3em] block h-[0.32em] shrink-0 overflow-hidden rounded-full bg-ink/15">
        <span ref={barRef} className="absolute inset-0 origin-left rounded-full bg-[#2c241b]" style={{ transform: phase === "ask" ? undefined : "scaleX(0)" }} />
      </span>

      <div className="relative mt-[0.45em] flex shrink-0 gap-[0.45em]" aria-live="polite">
        <span className="pt-[0.08em] font-head font-bold uppercase leading-none tracking-[0.06em] text-stamp" style={{ fontSize: "0.78em" }}>
          Hỏi:
        </span>
        <span style={{ fontSize: wide ? "1.08em" : "1em" }}>
          <Typed key={qi} text={q.text} cps={80} cursor={phase === "ask"} className="font-text font-semibold leading-[1.3] text-ink" />
        </span>
      </div>

      <div className={cn("relative flex min-h-0 flex-col", wide ? "mt-[0.8em] gap-[0.5em]" : "mt-[0.5em] gap-[0.38em]")}>
        {q.options.map((o, i) => {
          const isPick = picked === i;
          const isRight = i === q.answer;
          const show = phase === "feedback" || done;
          return (
            <motion.button
              key={`${qi}-${i}`}
              type="button"
              data-option={i}
              onClick={() => onAnswer(i)}
              disabled={phase !== "ask"}
              className={cn(
                "group relative flex min-h-[40px] w-full shrink-0 touch-manipulation items-center gap-[0.55em] rounded-[3px] border-2 px-[0.55em] py-[0.25em] text-left shadow-[0_2px_0_rgba(31,26,20,0.5)] transition-[transform,background-color,border-color,box-shadow,opacity] duration-150 disabled:cursor-default",
                phase === "ask" && "border-ink/60 bg-[#f6eedb] hover:-translate-y-[1px] hover:border-stamp hover:bg-[#fbf4e2] active:translate-y-[1px] active:shadow-none",
                show && isPick && isRight && "border-olive bg-[#e3ead0]",
                show && isPick && !isRight && "border-stamp bg-[#f3d9cf]",
                show && !isPick && isRight && "border-dashed border-olive bg-[#eef0dc]",
                show && !isPick && !isRight && "border-ink/25 bg-[#f1e8d3] opacity-60",
              )}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.18 }}
            >
              <span
                className={cn(
                  "grid h-[1.55em] w-[1.55em] shrink-0 place-items-center rounded-full border-2 font-head font-bold leading-none",
                  show && isRight ? "border-olive text-olive" : show && isPick ? "border-stamp text-stamp" : "border-ink text-ink group-hover:border-stamp group-hover:text-stamp",
                )}
                style={{ fontSize: "0.78em" }}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 font-text leading-[1.25] text-ink" style={{ fontSize: wide ? "0.95em" : "0.9em" }}>
                {o}
              </span>
              {show && isPick && isRight && <Check className="h-[1.1em] w-[1.1em] shrink-0 text-olive" strokeWidth={3.2} aria-label="Đúng" />}
              {show && isPick && !isRight && <X className="h-[1.1em] w-[1.1em] shrink-0 text-stamp" strokeWidth={3.2} aria-label="Sai" />}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {bad && (
          <motion.div key={`bad-${qi}`} className="pointer-events-none absolute right-[1.1em] top-[1.9em] z-10" exit={{ opacity: 0, transition: { duration: 0.15 } }}>
            <Stamp ink="red" rotate={-8} className="border-[3px] bg-[#f6eedb]/80 text-[1.1em]">
              {picked === -1 ? "Ngập ngừng · sơ hở!" : "Sơ hở!"}
            </Stamp>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {done && (
          <motion.div key="end" className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-[#efe3c6]/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex flex-col items-center gap-[0.4em]">
              <Stamp ink={passed ? "green" : "red"} rotate={-8} delay={0.05} className="border-[4px] text-[2em]">
                {passed ? "Không khai" : "Sơ hở"}
              </Stamp>
              <span className="rounded-[2px] bg-[#f6eedb] px-[0.6em] py-[0.2em] font-head font-semibold uppercase tracking-[0.12em] text-ink shadow-[0_2px_6px_rgba(0,0,0,0.25)]" style={{ fontSize: "0.8em" }}>
                {timeUp ? "Hết giờ · " : ""}Trả lời đúng {correct}/{total} câu
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
