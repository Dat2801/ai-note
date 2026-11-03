import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Note, Settings } from "./types";

const NOTES_KEY = "ai-note/notes/v1";
const SETTINGS_KEY = "ai-note/settings/v1";

export const defaultSettings: Settings = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000",
  appToken: process.env.EXPO_PUBLIC_APP_TOKEN ?? "",
  autoProcess: true,
};

export async function loadNotes(): Promise<Note[]> {
  const raw = await AsyncStorage.getItem(NOTES_KEY);
  if (!raw) return [];
  const notes = JSON.parse(raw) as Note[];
  // Nếu app bị tắt khi đang xử lý, đưa về trạng thái lỗi để người dùng thử lại
  return notes.map((n) =>
    n.status === "processing" ? { ...n, status: "error", error: "Xử lý bị gián đoạn, hãy thử lại" } : n,
  );
}

export async function saveNotes(notes: Note[]): Promise<void> {
  await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export async function loadSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  return raw ? { ...defaultSettings, ...(JSON.parse(raw) as Partial<Settings>) } : defaultSettings;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
