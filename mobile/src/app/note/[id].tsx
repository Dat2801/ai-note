import { Stack, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AudioPlayerBar } from "../../components/AudioPlayerBar";
import { Button } from "../../components/Button";
import { StatusBadge } from "../../components/StatusBadge";
import { exportNotePdf, shareNoteText } from "../../lib/export";
import { formatDate, formatDuration } from "../../lib/format";
import { useNotes } from "../../lib/notes-context";
import { colors, radius } from "../../lib/theme";
import type { Note } from "../../lib/types";

type Tab = "summary" | "tasks" | "transcript";

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getNote } = useNotes();
  const note = getNote(id);

  if (!note) {
    return (
      <View style={styles.missing}>
        <Text style={styles.muted}>Ghi chú không tồn tại hoặc đã bị xoá.</Text>
      </View>
    );
  }
  return <NoteDetail note={note} />;
}

function NoteDetail({ note }: { note: Note }) {
  const { processNote, reanalyze, updateNote, toggleTask, deleteNote } = useNotes();
  const [tab, setTab] = useState<Tab>("summary");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(note.title);
  const [editingTranscript, setEditingTranscript] = useState(false);
  const [transcriptDraft, setTranscriptDraft] = useState(note.transcript);
  const processing = note.status === "processing";

  const saveTitle = () => {
    const title = titleDraft.trim();
    if (title) updateNote(note.id, { title });
    setEditingTitle(false);
  };

  const saveTranscript = (rerun: boolean) => {
    setEditingTranscript(false);
    if (rerun) reanalyze(note.id, transcriptDraft);
    else updateNote(note.id, { transcript: transcriptDraft });
  };

  const showMenu = () => {
    Alert.alert(note.title, undefined, [
      { text: "Chia sẻ dạng văn bản", onPress: () => shareNoteText(note) },
      { text: "Xuất biên bản PDF", onPress: () => exportNotePdf(note).catch((e) => Alert.alert("Lỗi xuất PDF", String(e))) },
      ...(note.audioUri && note.status !== "processing"
        ? [{ text: "Xử lý lại bằng AI", onPress: () => processNote(note.id) }]
        : []),
      {
        text: "Xoá ghi chú",
        style: "destructive" as const,
        onPress: () =>
          Alert.alert("Xoá ghi chú?", "File ghi âm cũng sẽ bị xoá khỏi máy.", [
            { text: "Huỷ", style: "cancel" },
            {
              text: "Xoá",
              style: "destructive",
              onPress: () => {
                router.back();
                deleteNote(note.id);
              },
            },
          ]),
      },
      { text: "Đóng", style: "cancel" },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={showMenu} hitSlop={10}>
              <Text style={styles.menu}>•••</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {editingTitle ? (
          <TextInput value={titleDraft} onChangeText={setTitleDraft} onBlur={saveTitle} onSubmitEditing={saveTitle} autoFocus style={styles.titleInput} />
        ) : (
          <Pressable onPress={() => { setTitleDraft(note.title); setEditingTitle(true); }}>
            <Text style={styles.title}>{note.title}</Text>
          </Pressable>
        )}
        <View style={styles.metaRow}>
          <Text style={styles.muted}>
            {formatDate(note.createdAt)} · {formatDuration(note.durationMs)}
          </Text>
          <StatusBadge status={note.status} />
        </View>

        {note.audioUri && <AudioPlayerBar uri={note.audioUri} />}

        {processing && (
          <View style={styles.banner}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.bannerText}>AI đang nhận dạng giọng nói và tóm tắt… Bạn có thể quay lại danh sách, kết quả sẽ tự cập nhật.</Text>
          </View>
        )}
        {note.status === "error" && (
          <View style={[styles.banner, { backgroundColor: colors.dangerSoft }]}>
            <Text style={[styles.bannerText, { color: colors.danger }]}>{note.error ?? "Có lỗi xảy ra"}</Text>
            <Button title="Thử lại" variant="danger" onPress={() => processNote(note.id)} />
          </View>
        )}
        {note.status === "recorded" && (
          <Button title="✨ Phân tích bằng AI" onPress={() => processNote(note.id)} />
        )}

        {(note.status === "done" || note.transcript) && (
          <>
            <View style={styles.tabs}>
              {(
                [
                  ["summary", "Tóm tắt"],
                  ["tasks", `Công việc (${note.tasks.length})`],
                  ["transcript", "Nội dung"],
                ] as const
              ).map(([key, label]) => (
                <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabActive]}>
                  <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {tab === "summary" && (
              <View style={styles.section}>
                <Text style={styles.body}>{note.summary || "Chưa có tóm tắt."}</Text>
                {note.keyPoints.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Ý chính</Text>
                    {note.keyPoints.map((p, i) => (
                      <Text key={i} style={styles.bullet}>
                        •  {p}
                      </Text>
                    ))}
                  </>
                )}
                {note.tags.length > 0 && <Text style={styles.tags}>{note.tags.map((t) => `#${t}`).join("  ")}</Text>}
              </View>
            )}

            {tab === "tasks" && (
              <View style={styles.section}>
                {note.tasks.length === 0 && <Text style={styles.muted}>AI không tìm thấy công việc nào.</Text>}
                {note.tasks.map((t) => (
                  <Pressable key={t.id} onPress={() => toggleTask(note.id, t.id)} style={styles.task}>
                    <View style={[styles.checkbox, t.done && styles.checkboxDone]}>
                      {t.done && <Text style={styles.check}>✓</Text>}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.taskTitle, t.done && styles.taskDone]}>{t.title}</Text>
                      {(t.assignee || t.dueDate) && (
                        <Text style={styles.muted}>
                          {[t.assignee && `👤 ${t.assignee}`, t.dueDate && `📅 ${t.dueDate}`].filter(Boolean).join("   ")}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {tab === "transcript" && (
              <View style={styles.section}>
                {editingTranscript ? (
                  <>
                    <TextInput value={transcriptDraft} onChangeText={setTranscriptDraft} multiline autoFocus style={styles.transcriptInput} />
                    <View style={styles.row}>
                      <Button title="Huỷ" variant="secondary" style={{ flex: 1 }} onPress={() => { setTranscriptDraft(note.transcript); setEditingTranscript(false); }} />
                      <Button title="Lưu" variant="secondary" style={{ flex: 1 }} onPress={() => saveTranscript(false)} />
                    </View>
                    <Button title="Lưu & tóm tắt lại" onPress={() => saveTranscript(true)} />
                  </>
                ) : (
                  <>
                    <Text style={styles.body} selectable>
                      {note.transcript || "Chưa có nội dung."}
                    </Text>
                    <Button
                      title="Sửa nội dung"
                      variant="secondary"
                      disabled={processing}
                      onPress={() => { setTranscriptDraft(note.transcript); setEditingTranscript(true); }}
                    />
                  </>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: "center", justifyContent: "center" },
  menu: { fontSize: 18, color: colors.primary, fontWeight: "700" },
  content: { padding: 16, gap: 14, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  titleInput: { fontSize: 24, fontWeight: "700", color: colors.text, borderBottomWidth: 2, borderColor: colors.primary, paddingVertical: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  muted: { fontSize: 13, color: colors.textSecondary },
  banner: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 14, gap: 10 },
  bannerText: { fontSize: 14, color: colors.primary, lineHeight: 20 },
  tabs: { flexDirection: "row", backgroundColor: colors.border, borderRadius: radius.md, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.card },
  tabText: { fontSize: 13, color: colors.textSecondary },
  tabTextActive: { color: colors.text, fontWeight: "600" },
  section: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: colors.text, marginTop: 6 },
  body: { fontSize: 15, lineHeight: 23, color: colors.text },
  bullet: { fontSize: 15, lineHeight: 22, color: colors.text },
  tags: { fontSize: 13, color: colors.primary, marginTop: 4 },
  task: { flexDirection: "row", gap: 12, alignItems: "flex-start", paddingVertical: 6 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkboxDone: { backgroundColor: colors.primary },
  check: { color: "#fff", fontSize: 13, fontWeight: "700" },
  taskTitle: { fontSize: 15, color: colors.text },
  taskDone: { textDecorationLine: "line-through", color: colors.textSecondary },
  transcriptInput: { minHeight: 200, fontSize: 15, lineHeight: 22, color: colors.text, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 8 },
});
