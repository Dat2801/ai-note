import type { AiAnalysis, AskNote, AskResult } from "./schema";

// Dữ liệu giả lập khi chưa có OPENAI_API_KEY — giúp chạy thử app mà không tốn phí

export const mockTranscript =
  "Tuần sau đội phát triển phải hoàn thành chức năng đăng nhập. Anh Minh phụ trách backend, chị Lan kiểm thử. Thứ Sáu sẽ họp đánh giá tiến độ.";

export function mockAnalysis(transcript: string): AiAnalysis {
  if (transcript !== mockTranscript) {
    return {
      title: `[MOCK] ${transcript.split(/\s+/).slice(0, 6).join(" ")}`,
      summary: transcript.slice(0, 200),
      keyPoints: transcript.split(/[.!?]\s+/).filter(Boolean).slice(0, 4),
      tasks: [],
      tags: ["mock"],
    };
  }
  return {
    title: "[MOCK] Tiến độ chức năng đăng nhập",
    summary:
      "Đội phát triển cần hoàn thành chức năng đăng nhập trong tuần tới. Minh phụ trách backend, Lan phụ trách kiểm thử. Nhóm sẽ họp đánh giá tiến độ vào thứ Sáu.",
    keyPoints: [
      "Hoàn thiện chức năng đăng nhập trong tuần sau",
      "Minh phụ trách backend",
      "Lan phụ trách kiểm thử",
      "Họp đánh giá vào thứ Sáu",
    ],
    tasks: [
      { title: "Hoàn thiện backend đăng nhập", assignee: "Minh", dueDate: "Tuần sau" },
      { title: "Kiểm thử chức năng đăng nhập", assignee: "Lan", dueDate: "Tuần sau" },
      { title: "Họp đánh giá tiến độ", assignee: null, dueDate: "Thứ Sáu" },
    ],
    tags: ["họp", "phát triển"],
  };
}

export function mockAsk(question: string, notes: AskNote[]): AskResult {
  const words = question.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const hits = notes.filter((n) => {
    const text = `${n.title} ${n.summary} ${n.transcript}`.toLowerCase();
    return words.some((w) => text.includes(w));
  });
  return {
    answer: hits.length
      ? `[MOCK] Tìm thấy ${hits.length} ghi chú liên quan tới "${question}".`
      : `[MOCK] Không tìm thấy ghi chú nào liên quan tới "${question}".`,
    noteIds: hits.map((n) => n.id),
  };
}
