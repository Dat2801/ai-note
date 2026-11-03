import { StyleSheet, Text } from "react-native";
import { colors, radius } from "../lib/theme";
import type { NoteStatus } from "../lib/types";

const LABELS: Record<NoteStatus, { text: string; fg: string; bg: string }> = {
  recorded: { text: "Chưa xử lý", fg: colors.textSecondary, bg: colors.border },
  processing: { text: "AI đang xử lý…", fg: colors.warning, bg: colors.warningSoft },
  done: { text: "Đã tóm tắt", fg: colors.success, bg: colors.successSoft },
  error: { text: "Lỗi", fg: colors.danger, bg: colors.dangerSoft },
};

export function StatusBadge({ status }: { status: NoteStatus }) {
  const label = LABELS[status];
  return <Text style={[styles.badge, { color: label.fg, backgroundColor: label.bg }]}>{label.text}</Text>;
}

const styles = StyleSheet.create({
  badge: { fontSize: 11, fontWeight: "600", paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, overflow: "hidden" },
});
