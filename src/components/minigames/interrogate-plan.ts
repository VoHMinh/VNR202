import { COVER_FIELDS, TRAP_QUESTIONS } from "@/game/data/minis";
import { mulberry32 } from "./shared";
import { shuffle } from "./spy-cases";

/*
 * Đề cho trò "Hỏi cung", tính tất định từ mốc bắt đầu: mỗi ô của lý lịch giả lấy một giá trị,
 * bảy câu hỏi (năm câu hỏi lý lịch, hai câu gài bẫy chọn ngẫu nhiên) xếp theo một thứ tự riêng.
 * Câu hỏi lý lịch: đáp án đúng là giá trị đã ghi trên giấy, hai phương án nhiễu lấy cùng nhóm.
 * Câu gài bẫy: đáp án đúng luôn là không khai, không nhận, không ký.
 */

export interface CoverLine {
  key: string;
  label: string;
  value: string;
}

export interface Question {
  kind: "field" | "trap";
  text: string;
  options: string[];
  /** Vị trí đáp án đúng trong `options`. */
  answer: number;
}

export interface Interrogation {
  cover: CoverLine[];
  questions: Question[];
}

export function makeInterrogation(seed: number): Interrogation {
  const rnd = mulberry32((Math.floor(seed) ^ 0x2c1b3c6d) >>> 0);
  const cover = COVER_FIELDS.map((f) => ({ key: f.key, label: f.label, value: f.pool[Math.floor(rnd() * f.pool.length)] }));
  const fieldQs: Question[] = COVER_FIELDS.map((f, i) => {
    const right = cover[i].value;
    const options = shuffle(rnd, [right, ...shuffle(rnd, f.pool.filter((v) => v !== right)).slice(0, 2)]);
    return { kind: "field", text: f.question, options, answer: options.indexOf(right) };
  });
  const trapQs: Question[] = shuffle(rnd, TRAP_QUESTIONS)
    .slice(0, 2)
    .map((t) => {
      const options = shuffle(rnd, [t.right, ...t.wrong]);
      return { kind: "trap", text: t.question, options, answer: options.indexOf(t.right) };
    });
  return { cover, questions: shuffle(rnd, [...fieldQs, ...trapQs]) };
}
