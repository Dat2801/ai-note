import type { AiAnalysis, AskResult, HealthResult, Note, ProcessResult, Settings } from "./types";

const TIMEOUT_MS = 5 * 60 * 1000; // bản ghi dài có thể mất vài phút

async function request<T>(settings: Settings, path: string, init: RequestInit, timeoutMs = TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (settings.appToken) headers["x-app-token"] = settings.appToken;
  try {
    const res = await fetch(`${settings.apiUrl.replace(/\/+$/, "")}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error ?? `Lỗi máy chủ (${res.status})`);
    return body as T;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw new Error("Hết thời gian chờ máy chủ");
    if (err instanceof TypeError) throw new Error(`Không kết nối được ${settings.apiUrl}. Kiểm tra backend và Wi-Fi.`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function checkHealth(settings: Settings): Promise<HealthResult> {
  return request(settings, "/health", { method: "GET" }, 8000);
}

export function processAudio(settings: Settings, audioUri: string): Promise<ProcessResult> {
  const form = new FormData();
  // React Native gửi file từ uri cục bộ theo dạng { uri, name, type }
  form.append("audio", { uri: audioUri, name: "recording.m4a", type: "audio/m4a" } as unknown as Blob);
  return request(settings, "/api/process", { method: "POST", body: form });
}

export function analyzeTranscript(settings: Settings, transcript: string): Promise<AiAnalysis> {
  return request(settings, "/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });
}

export function askNotes(settings: Settings, question: string, notes: Note[]): Promise<AskResult> {
  const payload = notes
    .filter((n) => n.status === "done")
    .map(({ id, title, summary, transcript, createdAt }) => ({ id, title, summary, transcript, createdAt }));
  return request(settings, "/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, notes: payload }),
  });
}
