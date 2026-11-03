import { Link, Stack, router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NoteCard } from "../components/NoteCard";
import { normalize } from "../lib/format";
import { useNotes } from "../lib/notes-context";
import { colors, radius } from "../lib/theme";

type Filter = "all" | "tasks";

export default function HomeScreen() {
  const { ready, notes } = useNotes();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  // Tìm kiếm cục bộ, không dấu, trên tiêu đề / tóm tắt / transcript / nhãn / công việc
  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return notes.filter((n) => {
      if (filter === "tasks" && !n.tasks.some((t) => !t.done)) return false;
      if (!q) return true;
      const haystack = [n.title, n.summary, n.transcript, ...n.tags, ...n.tasks.map((t) => t.title)].join(" ");
      return normalize(haystack).includes(q);
    });
  }, [notes, query, filter]);

  const openTaskCount = notes.reduce((sum, n) => sum + n.tasks.filter((t) => !t.done).length, 0);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/settings" asChild>
              <Pressable hitSlop={10}>
                <Text style={styles.headerIcon}>⚙︎</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      <FlatList
        data={visible}
        keyExtractor={(n) => n.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 120 }]}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={
          <View style={styles.headerBox}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Tìm kiếm ghi chú…"
              placeholderTextColor={colors.textSecondary}
              style={styles.search}
              clearButtonMode="while-editing"
            />
            <View style={styles.row}>
              <Chip label={`Tất cả (${notes.length})`} active={filter === "all"} onPress={() => setFilter("all")} />
              <Chip label={`Việc cần làm (${openTaskCount})`} active={filter === "tasks"} onPress={() => setFilter("tasks")} />
              <View style={{ flex: 1 }} />
              <Link href="/ask" asChild>
                <Pressable style={styles.askButton}>
                  <Text style={styles.askText}>✨ Hỏi AI</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        }
        ListEmptyComponent={
          !ready ? (
            <ActivityIndicator style={{ marginTop: 48 }} />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{query ? "Không tìm thấy ghi chú" : "Chưa có ghi chú nào"}</Text>
              <Text style={styles.emptyText}>
                {query ? "Thử từ khoá khác hoặc dùng “Hỏi AI”." : "Bấm nút ghi âm bên dưới để bắt đầu cuộc họp, bài giảng…"}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => <NoteCard note={item} />}
      />
      <Pressable
        onPress={() => router.push("/record")}
        style={({ pressed }) => [styles.fab, { bottom: insets.bottom + 24 }, pressed && { transform: [{ scale: 0.95 }] }]}
      >
        <View style={styles.fabDot} />
      </Pressable>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerIcon: { fontSize: 22, color: colors.primary },
  list: { padding: 16 },
  headerBox: { gap: 12, marginBottom: 16 },
  search: { backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, borderWidth: 1, borderColor: colors.border, color: colors.text },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textSecondary },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  askButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.primarySoft },
  askText: { color: colors.primary, fontWeight: "600", fontSize: 13 },
  empty: { alignItems: "center", marginTop: 64, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
  fab: {
    position: "absolute",
    alignSelf: "center",
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#fff" },
});
