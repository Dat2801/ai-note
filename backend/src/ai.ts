import OpenAI, { toFile } from "openai";
import {
  analysisJsonSchema,
  askJsonSchema,
  type AiAnalysis,
  type AskNote,
  type AskResult,
} from "./schema";
import { mockAnalysis, mockAsk, mockTranscript } from "./mock";

const apiKey = process.env.OPENAI_API_KEY?.trim();
export const transcriptionModel = process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-transcribe";
export const textModel = process.env.OPENAI_TEXT_MODEL || "gpt-6-luna";
export const language = process.env.TRANSCRIPTION_LANGUAGE || "vi";

// Không có API key (hoặc MOCK_AI=true) thì chạy chế độ giả lập để phát triển UI miễn phí
export const mockMode = process.env.MOCK_AI === "true" || !apiKey;

const client = mockMode ? null : new OpenAI({ apiKey });

const ANALYZE_INSTRUCTIONS = `Bạn là trợ lý ghi chú của ứng dụng AI Note.
Bạn nhận transcript của một cuộc họp, bài giảng hoặc cuộc trò chuyện (thường là tiếng Việt).
Nhiệm vụ:
- Đặt tiêu đề ngắn gọn.
- Tóm tắt nội dung chính trong 2-5 câu.
- Liệt kê các ý chính.
- Trích xuất công việc cần làm, kèm người phụ trách và thời hạn nếu transcript có nhắc tới; không có thì để null.
- Gắn 1-4 nhãn chủ đề.
Chỉ dùng thông tin có trong transcript, không bịa thêm. Trả lời bằng ngôn ngữ của transcript.`;

const ASK_INSTRUCTIONS = `Bạn là trợ lý tìm kiếm ghi chú của AI Note.
Dựa CHỈ vào các ghi chú được cung cấp, trả lời câu hỏi của người dùng ngắn gọn.
Trả về id của các ghi chú liên quan trong noteIds. Nếu không tìm thấy, nói rõ là không có thông tin.`;

export async function transcribe(audio: Buffer, filename: string, mimeType: string): Promise<string> {
  if (!client) return mockTranscript;
  const file = await toFile(audio, filename, { type: mimeType });
  const result = await client.audio.transcriptions.create({
    file,
    model: transcriptionModel,
    language,
  });
  return result.text.trim();
}

export async function analyze(transcript: string): Promise<AiAnalysis> {
  if (!client) return mockAnalysis(transcript);
  if (!transcript.trim()) {
    return { title: "Bản ghi trống", summary: "Không nhận dạng được nội dung.", keyPoints: [], tasks: [], tags: [] };
  }
  const response = await client.responses.create({
    model: textModel,
    instructions: ANALYZE_INSTRUCTIONS,
    input: transcript,
    text: {
      format: { type: "json_schema", name: "note_analysis", strict: true, schema: analysisJsonSchema },
    },
  });
  return JSON.parse(response.output_text) as AiAnalysis;
}

export async function ask(question: string, notes: AskNote[]): Promise<AskResult> {
  if (!client) return mockAsk(question, notes);
  const context = notes
    .map(
      (n) =>
        `<note id="${n.id}" date="${n.createdAt}">\nTiêu đề: ${n.title}\nTóm tắt: ${n.summary}\nTranscript: ${n.transcript.slice(0, 4000)}\n</note>`,
    )
    .join("\n");
  const response = await client.responses.create({
    model: textModel,
    instructions: ASK_INSTRUCTIONS,
    input: `${context}\n\nCâu hỏi: ${question}`,
    text: {
      format: { type: "json_schema", name: "note_answer", strict: true, schema: askJsonSchema },
    },
  });
  const result = JSON.parse(response.output_text) as AskResult;
  const known = new Set(notes.map((n) => n.id));
  return { ...result, noteIds: result.noteIds.filter((id) => known.has(id)) };
}
