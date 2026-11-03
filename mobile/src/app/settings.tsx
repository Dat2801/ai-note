import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Button } from "../components/Button";
import { checkHealth } from "../lib/api";
import { formatDuration } from "../lib/format";
import { useNotes } from "../lib/notes-context";
import { colors, radius } from "../lib/theme";

export default function SettingsScreen() {
  const { settings, updateSettings, notes, deleteAll } = useNotes();
  const [apiUrl, setApiUrl] = useState(settings.apiUrl);
  const [appToken, setAppToken] = useState(settings.appToken);
  const [checking, setChecking] = useState(false);
  const [health, setHealth] = useState<string | null>(null);

  const totalMs = notes.reduce((sum, n) => sum + n.durationMs, 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthMs = notes
    .filter((n) => n.status === "done" && new Date(n.createdAt) >= monthStart)
    .reduce((sum, n) => sum + n.durationMs, 0);

  const save = () => {
    updateSettings({ apiUrl: apiUrl.trim(), appToken: appToken.trim() });
    Alert.alert("Đã lưu cài đặt");
  };

  const test = async () => {
    setChecking(true);
    setHealth(null);
    try {
      const h = await checkHealth({ ...settings, apiUrl: apiUrl.trim(), appToken: appToken.trim() });
      setHealth(
        `✅ Kết nối OK${h.mock ? " — chế độ MOCK (chưa có API key)" : ""}\nSTT: ${h.transcriptionModel} · Text: ${h.textModel}`,
      );
    } catch (err) {
      setHealth(`❌ ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setChecking(false);
    }
  };

  const confirmDeleteAll = () =>
    Alert.alert("Xoá toàn bộ dữ liệu?", `${notes.length} ghi chú và file ghi âm sẽ bị xoá vĩnh viễn.`, [
      { text: "Huỷ", style: "cancel" },
      { text: "Xoá hết", style: "destructive", onPress: deleteAll },
    ]);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.group}>MÁY CHỦ AI</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Địa chỉ backend</Text>
        <TextInput value={apiUrl} onChangeText={setApiUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={styles.input} placeholder="http://192.168.1.25:4000" />
        <Text style={styles.label}>App token (nếu backend có đặt APP_TOKEN)</Text>
        <TextInput value={appToken} onChangeText={setAppToken} autoCapitalize="none" autoCorrect={false} secureTextEntry style={styles.input} />
        <View style={styles.row}>
          <Button title="Kiểm tra" variant="secondary" onPress={test} loading={checking} style={{ flex: 1 }} />
          <Button title="Lưu" onPress={save} style={{ flex: 1 }} />
        </View>
        {health && <Text style={styles.health}>{health}</Text>}
      </View>

      <Text style={styles.group}>XỬ LÝ</Text>
      <View style={[styles.card, styles.switchRow]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Tự động phân tích sau khi ghi âm</Text>
          <Text style={styles.muted}>Tắt nếu muốn tự chọn bản ghi nào gửi lên AI (tiết kiệm chi phí).</Text>
        </View>
        <Switch value={settings.autoProcess} onValueChange={(v) => updateSettings({ autoProcess: v })} trackColor={{ true: colors.primary }} />
      </View>

      <Text style={styles.group}>THỐNG KÊ</Text>
      <View style={styles.card}>
        <Stat label="Số ghi chú" value={String(notes.length)} />
        <Stat label="Tổng thời lượng ghi âm" value={formatDuration(totalMs)} />
        <Stat label="Đã phân tích tháng này" value={formatDuration(monthMs)} />
        <Text style={styles.muted}>Chi phí nhận dạng tham khảo ≈ ${((monthMs / 60000) * 0.0045).toFixed(3)} tháng này.</Text>
      </View>

      <Text style={styles.group}>DỮ LIỆU</Text>
      <View style={styles.card}>
        <Text style={styles.muted}>Ghi chú và file ghi âm chỉ lưu trên máy này. Audio chỉ được gửi lên backend khi phân tích.</Text>
        <Button title="Xoá toàn bộ dữ liệu" variant="danger" onPress={confirmDeleteAll} disabled={notes.length === 0} />
      </View>
      <Text style={styles.version}>AI Note · MVP 0.3</Text>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 8, paddingBottom: 48 },
  group: { fontSize: 12, color: colors.textSecondary, fontWeight: "600", marginTop: 12, marginLeft: 4 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 14, color: colors.text, fontWeight: "500" },
  muted: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 10, fontSize: 15, color: colors.text, backgroundColor: colors.background },
  row: { flexDirection: "row", gap: 8 },
  health: { fontSize: 13, color: colors.text, lineHeight: 19 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stat: { flexDirection: "row", justifyContent: "space-between" },
  statValue: { fontSize: 14, color: colors.primary, fontWeight: "600" },
  version: { textAlign: "center", color: colors.textSecondary, fontSize: 12, marginTop: 16 },
});
