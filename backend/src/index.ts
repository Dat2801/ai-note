import "dotenv/config";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { analyze, ask, language, mockMode, textModel, transcribe, transcriptionModel } from "./ai";
import type { AskNote, ProcessResult } from "./schema";

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || "0.0.0.0";
const APP_TOKEN = process.env.APP_TOKEN?.trim();
const MAX_UPLOAD_MB = 25; // giới hạn file của API transcription

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
});

// Xác thực đơn giản bằng token chung giữa app và backend (đủ cho chạy nội bộ / TestFlight)
function requireToken(req: Request, res: Response, next: NextFunction) {
  if (!APP_TOKEN || req.header("x-app-token") === APP_TOKEN) return next();
  res.status(401).json({ error: "Sai hoặc thiếu x-app-token" });
}

app.get("/", (_req, res) => {
  res.type("text").send("AI Note backend đang chạy. Kiểm tra trạng thái tại /health");
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "ai-note-backend",
    aiConfigured: !mockMode,
    mock: mockMode,
    authRequired: Boolean(APP_TOKEN),
    transcriptionModel,
    textModel,
    language,
  });
});

// Ghi âm → nhận dạng giọng nói → tóm tắt + công việc
app.post("/api/process", requireToken, upload.single("audio"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Thiếu file audio (field 'audio')" });
      return;
    }
    const started = Date.now();
    const transcript = await transcribe(
      req.file.buffer,
      req.file.originalname || "recording.m4a",
      req.file.mimetype || "audio/m4a",
    );
    const analysis = await analyze(transcript);
    const result: ProcessResult = { transcript, ...analysis };
    console.log(`[process] ${(req.file.size / 1024).toFixed(0)} KB in ${Date.now() - started} ms`);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Phân tích lại sau khi người dùng sửa transcript
app.post("/api/analyze", requireToken, async (req, res, next) => {
  try {
    const transcript = typeof req.body?.transcript === "string" ? req.body.transcript : "";
    if (!transcript.trim()) {
      res.status(400).json({ error: "Thiếu transcript" });
      return;
    }
    res.json(await analyze(transcript));
  } catch (err) {
    next(err);
  }
});

// Hỏi đáp trên toàn bộ ghi chú bằng câu hỏi tự nhiên
app.post("/api/ask", requireToken, async (req, res, next) => {
  try {
    const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
    const notes = Array.isArray(req.body?.notes) ? (req.body.notes as AskNote[]).slice(0, 50) : [];
    if (!question) {
      res.status(400).json({ error: "Thiếu câu hỏi" });
      return;
    }
    res.json(await ask(question, notes));
  } catch (err) {
    next(err);
  }
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ error: `File vượt quá ${MAX_UPLOAD_MB} MB` });
    return;
  }
  console.error(err);
  const message = err instanceof Error ? err.message : "Lỗi không xác định";
  res.status(500).json({ error: message });
});

app.listen(PORT, HOST, () => {
  console.log(`AI Note backend chạy tại http://${HOST}:${PORT} ${mockMode ? "(MOCK AI)" : ""}`);
});
