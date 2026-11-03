import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Share } from "react-native";
import { formatDate, formatDuration } from "./format";
import type { Note } from "./types";

export function noteToText(note: Note): string {
  const lines = [
    note.title,
    `${formatDate(note.createdAt)} · ${formatDuration(note.durationMs)}`,
    "",
    "TÓM TẮT",
    note.summary,
  ];
  if (note.keyPoints.length) lines.push("", "Ý CHÍNH", ...note.keyPoints.map((p) => `• ${p}`));
  if (note.tasks.length) {
    lines.push(
      "",
      "CÔNG VIỆC",
      ...note.tasks.map((t) => {
        const meta = [t.assignee && `Phụ trách: ${t.assignee}`, t.dueDate && `Hạn: ${t.dueDate}`].filter(Boolean);
        return `${t.done ? "☑" : "☐"} ${t.title}${meta.length ? ` (${meta.join(", ")})` : ""}`;
      }),
    );
  }
  return lines.join("\n");
}

export async function shareNoteText(note: Note) {
  await Share.share({ title: note.title, message: noteToText(note) });
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function noteToHtml(note: Note): string {
  const tasks = note.tasks
    .map(
      (t) =>
        `<tr><td>${t.done ? "✔" : ""}</td><td>${escape(t.title)}</td><td>${escape(t.assignee ?? "—")}</td><td>${escape(t.dueDate ?? "—")}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"/>
<style>
  body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1c1c28;padding:32px;line-height:1.5}
  h1{font-size:22px;margin:0 0 4px} .meta{color:#6b6b80;font-size:12px;margin-bottom:24px}
  h2{font-size:15px;color:#6c5ce7;border-bottom:1px solid #e6e6ef;padding-bottom:4px;margin-top:24px}
  table{width:100%;border-collapse:collapse;font-size:13px} td,th{border:1px solid #e6e6ef;padding:6px 8px;text-align:left}
  th{background:#f6f6fa} .transcript{font-size:12px;color:#444;white-space:pre-wrap}
</style></head><body>
<h1>BIÊN BẢN: ${escape(note.title)}</h1>
<div class="meta">${escape(formatDate(note.createdAt))} · Thời lượng ${formatDuration(note.durationMs)}</div>
<h2>Tóm tắt</h2><p>${escape(note.summary)}</p>
${note.keyPoints.length ? `<h2>Ý chính</h2><ul>${note.keyPoints.map((p) => `<li>${escape(p)}</li>`).join("")}</ul>` : ""}
${note.tasks.length ? `<h2>Công việc</h2><table><tr><th></th><th>Việc</th><th>Phụ trách</th><th>Hạn</th></tr>${tasks}</table>` : ""}
<h2>Nội dung đầy đủ</h2><div class="transcript">${escape(note.transcript)}</div>
</body></html>`;
}

export async function exportNotePdf(note: Note) {
  const { uri } = await Print.printToFileAsync({ html: noteToHtml(note) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: note.title });
  }
}
