import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../components/Button";
import { NoteCard } from "../components/NoteCard";
import { askNotes } from "../lib/api";
import { useNotes } from "../lib/notes-context";
import { colors, radius } from "../lib/theme";
import type { AskResult } from "../lib/types";

const SUGGESTIONS = ["Tuần này tôi có những việc gì cần làm?", "Cuộc họp gần nhất đã thống nhất gì?", "Ai phụ trách kiểm thử?"];

export default function AskScreen() {
  const { notes, settings } = useNotes();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const doneCount = notes.filter((n) => n.status === "done").length;

  const submit = async (q = question) => {
    if (!q.trim()) return;
    setQuestion(q);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await askNotes(settings, q.trim(), notes));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const related = result ? notes.filter((n) => result.noteIds.includes(n.id)) : [];

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>Hỏi bằng câu tự nhiên, AI sẽ tìm trong {doneCount} ghi chú đã tóm tắt của bạn.</Text>
      <TextInput
        value={question}
        onChangeText={setQuestion}
        placeholder="Ví dụ: Anh Minh phụ trách việc gì?"
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        multiline
        returnKeyType="send"
        submitBehavior="blurAndSubmit"
        onSubmitEditing={() => submit()}
      />
      <Button title="Hỏi AI" onPress={() => submit()} loading={loading} disabled={!question.trim() || doneCount === 0} />

      {!result && !loading && (
        <View style={styles.suggestions}>
          {SUGGESTIONS.map((s) => (
            <Text key={s} style={styles.suggestion} onPress={() => submit(s)}>
              {s}
            </Text>
          ))}
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      {result && (
        <View style={styles.answer}>
          <Text style={styles.answerText}>{result.answer}</Text>
        </View>
      )}
      {related.length > 0 && (
        <View style={{ gap: 12 }}>
          <Text style={styles.sectionTitle}>Ghi chú liên quan</Text>
          {related.map((n) => (
            <NoteCard key={n.id} note={n} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  intro: { fontSize: 14, color: colors.textSecondary },
  input: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, minHeight: 80, fontSize: 15, borderWidth: 1, borderColor: colors.border, color: colors.text, textAlignVertical: "top" },
  suggestions: { gap: 8 },
  suggestion: { color: colors.primary, backgroundColor: colors.primarySoft, padding: 12, borderRadius: radius.md, overflow: "hidden", fontSize: 14 },
  error: { color: colors.danger, fontSize: 14 },
  answer: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, borderLeftWidth: 4, borderLeftColor: colors.primary },
  answerText: { fontSize: 15, lineHeight: 23, color: colors.text },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
});
