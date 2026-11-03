import { File } from "expo-file-system";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { analyzeTranscript, processAudio } from "./api";
import { newId } from "./format";
import { defaultSettings, loadNotes, loadSettings, saveNotes, saveSettings } from "./storage";
import type { AiAnalysis, Note, Settings } from "./types";

type NotesContextValue = {
  ready: boolean;
  notes: Note[];
  settings: Settings;
  getNote: (id: string) => Note | undefined;
  addRecording: (audioUri: string, durationMs: number) => Note;
  processNote: (id: string) => Promise<void>;
  reanalyze: (id: string, transcript: string) => Promise<void>;
  updateNote: (id: string, patch: Partial<Note>) => void;
  toggleTask: (noteId: string, taskId: string) => void;
  deleteNote: (id: string) => void;
  deleteAll: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
};

const NotesContext = createContext<NotesContextValue | null>(null);

function applyAnalysis(analysis: AiAnalysis): Partial<Note> {
  return {
    title: analysis.title,
    summary: analysis.summary,
    keyPoints: analysis.keyPoints,
    tags: analysis.tags,
    tasks: analysis.tasks.map((t) => ({ ...t, id: newId(), done: false })),
  };
}

function deleteAudio(uri: string | null) {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (err) {
    console.warn("Không xoá được file ghi âm", err);
  }
}

export function NotesProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  // Giữ bản mới nhất để các hàm async không đọc state cũ
  const notesRef = useRef(notes);
  const settingsRef = useRef(settings);
  notesRef.current = notes;
  settingsRef.current = settings;

  useEffect(() => {
    Promise.all([loadNotes(), loadSettings()]).then(([n, s]) => {
      setNotes(n);
      setSettings(s);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) saveNotes(notes).catch((err) => console.warn("Lưu ghi chú lỗi", err));
  }, [notes, ready]);

  const updateNote = useCallback((id: string, patch: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n)),
    );
  }, []);

  const addRecording = useCallback((audioUri: string, durationMs: number) => {
    const now = new Date().toISOString();
    const note: Note = {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      durationMs,
      audioUri,
      status: "recorded",
      title: "Bản ghi mới",
      summary: "",
      keyPoints: [],
      tasks: [],
      tags: [],
      transcript: "",
    };
    // Cập nhật ref ngay để có thể gọi processNote(note.id) liền sau đó
    notesRef.current = [note, ...notesRef.current];
    setNotes((prev) => [note, ...prev]);
    return note;
  }, []);

  const processNote = useCallback(
    async (id: string) => {
      const note = notesRef.current.find((n) => n.id === id);
      if (!note?.audioUri || note.status === "processing") return;
      updateNote(id, { status: "processing", error: undefined });
      try {
        const result = await processAudio(settingsRef.current, note.audioUri);
        updateNote(id, { ...applyAnalysis(result), transcript: result.transcript, status: "done" });
      } catch (err) {
        updateNote(id, { status: "error", error: err instanceof Error ? err.message : String(err) });
      }
    },
    [updateNote],
  );

  const reanalyze = useCallback(
    async (id: string, transcript: string) => {
      updateNote(id, { status: "processing", error: undefined, transcript });
      try {
        const analysis = await analyzeTranscript(settingsRef.current, transcript);
        updateNote(id, { ...applyAnalysis(analysis), status: "done" });
      } catch (err) {
        updateNote(id, { status: "error", error: err instanceof Error ? err.message : String(err) });
      }
    },
    [updateNote],
  );

  const toggleTask = useCallback((noteId: string, taskId: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? { ...n, tasks: n.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) }
          : n,
      ),
    );
  }, []);

  const deleteNote = useCallback((id: string) => {
    deleteAudio(notesRef.current.find((n) => n.id === id)?.audioUri ?? null);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const deleteAll = useCallback(() => {
    notesRef.current.forEach((n) => deleteAudio(n.audioUri));
    setNotes([]);
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next).catch((err) => console.warn("Lưu cài đặt lỗi", err));
      return next;
    });
  }, []);

  const value = useMemo<NotesContextValue>(
    () => ({
      ready,
      notes,
      settings,
      getNote: (id) => notes.find((n) => n.id === id),
      addRecording,
      processNote,
      reanalyze,
      updateNote,
      toggleTask,
      deleteNote,
      deleteAll,
      updateSettings,
    }),
    [ready, notes, settings, addRecording, processNote, reanalyze, updateNote, toggleTask, deleteNote, deleteAll, updateSettings],
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes(): NotesContextValue {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes phải nằm trong NotesProvider");
  return ctx;
}
