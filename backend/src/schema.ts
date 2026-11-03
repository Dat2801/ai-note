// Cấu trúc kết quả AI dùng chung cho backend và (bản sao) ở mobile/src/types.ts

export type AiTask = {
  title: string;
  assignee: string | null;
  dueDate: string | null; // dạng chữ như AI nhận diện, vd "thứ Sáu", "2026-11-10"
};

export type AiAnalysis = {
  title: string;
  summary: string;
  keyPoints: string[];
  tasks: AiTask[];
  tags: string[];
};

export type ProcessResult = AiAnalysis & {
  transcript: string;
};

export type AskNote = {
  id: string;
  title: string;
  summary: string;
  transcript: string;
  createdAt: string;
};

export type AskResult = {
  answer: string;
  noteIds: string[];
};

// JSON Schema cho Structured Outputs (strict mode: mọi field đều required,
// field có thể trống thì dùng kiểu ["string","null"])
export const analysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "keyPoints", "tasks", "tags"],
  properties: {
    title: { type: "string", description: "Tiêu đề ngắn gọn, tối đa 10 từ" },
    summary: { type: "string", description: "Tóm tắt 2-5 câu" },
    keyPoints: { type: "array", items: { type: "string" } },
    tasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "assignee", "dueDate"],
        properties: {
          title: { type: "string" },
          assignee: { type: ["string", "null"] },
          dueDate: { type: ["string", "null"] },
        },
      },
    },
    tags: {
      type: "array",
      items: { type: "string" },
      description: "1-4 nhãn chủ đề, vd: họp, học tập, khách hàng",
    },
  },
} as const;

export const askJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "noteIds"],
  properties: {
    answer: { type: "string" },
    noteIds: { type: "array", items: { type: "string" } },
  },
} as const;
