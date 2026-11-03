// Kết quả trả về từ backend (khớp với backend/src/schema.ts)
export type AiTask = {
  title: string;
  assignee: string | null;
  dueDate: string | null;
};

export type AiAnalysis = {
  title: string;
  summary: string;
  keyPoints: string[];
  tasks: AiTask[];
  tags: string[];
};

export type ProcessResult = AiAnalysis & { transcript: string };

export type AskResult = { answer: string; noteIds: string[] };

export type HealthResult = {
  status: string;
  aiConfigured: boolean;
  mock: boolean;
  authRequired: boolean;
  transcriptionModel: string;
  textModel: string;
};

// Dữ liệu lưu trên máy
export type NoteStatus = "recorded" | "processing" | "done" | "error";

export type NoteTask = AiTask & { id: string; done: boolean };

export type Note = {
  id: string;
  createdAt: string;
  updatedAt: string;
  durationMs: number;
  audioUri: string | null;
  status: NoteStatus;
  error?: string;
  title: string;
  summary: string;
  keyPoints: string[];
  tasks: NoteTask[];
  tags: string[];
  transcript: string;
};

export type Settings = {
  apiUrl: string;
  appToken: string;
  autoProcess: boolean;
};
