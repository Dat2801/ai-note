import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatDate, formatDuration } from "../lib/format";
import { colors, radius } from "../lib/theme";
import type { Note } from "../lib/types";
import { StatusBadge } from "./StatusBadge";

export function NoteCard({ note }: { note: Note }) {
  const openTasks = note.tasks.filter((t) => !t.done).length;
  return (
    <Link href={{ pathname: "/note/[id]", params: { id: note.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {note.title}
          </Text>
          <StatusBadge status={note.status} />
        </View>
        {note.summary ? (
          <Text style={styles.summary} numberOfLines={2}>
            {note.summary}
          </Text>
        ) : null}
        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {formatDate(note.createdAt)} · {formatDuration(note.durationMs)}
          </Text>
          {openTasks > 0 && <Text style={styles.tasks}>{openTasks} việc cần làm</Text>}
        </View>
        {note.tags.length > 0 && (
          <View style={styles.tags}>
            {note.tags.map((tag) => (
              <Text key={tag} style={styles.tag}>
                #{tag}
              </Text>
            ))}
          </View>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, gap: 8, borderWidth: 1, borderColor: colors.border },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.text },
  summary: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  meta: { flexDirection: "row", justifyContent: "space-between" },
  metaText: { fontSize: 12, color: colors.textSecondary },
  tasks: { fontSize: 12, color: colors.primary, fontWeight: "600" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { fontSize: 12, color: colors.primary, backgroundColor: colors.primarySoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, overflow: "hidden" },
});
