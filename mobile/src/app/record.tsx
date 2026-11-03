import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from "expo-audio";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatDuration } from "../lib/format";
import { useNotes } from "../lib/notes-context";
import { colors } from "../lib/theme";

// Giọng nói không cần chất lượng cao: mono, bitrate thấp → file nhỏ, upload nhanh, nằm dưới giới hạn 25 MB
const RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  directory: "document", // lưu vào thư mục documents để hệ thống không tự xoá
  numberOfChannels: 1,
  bitRate: 64000,
  sampleRate: 22050,
  isMeteringEnabled: true,
};

const BAR_COUNT = 32;

export default function RecordScreen() {
  const insets = useSafeAreaInsets();
  const { addRecording, processNote, settings } = useNotes();
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const state = useAudioRecorderState(recorder, 100);
  const [started, setStarted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(0.05));
  const startedRef = useRef(false);

  // Cập nhật sóng âm từ metering (dB: -160..0)
  useEffect(() => {
    if (!state.isRecording || state.metering == null) return;
    const level = Math.max(0.05, Math.min(1, (state.metering + 60) / 60));
    setLevels((prev) => [...prev.slice(1), level]);
  }, [state.metering, state.isRecording]);

  useEffect(() => {
    (async () => {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Cần quyền micro", "Hãy cho phép AI Note dùng micro trong Cài đặt của iPhone.", [
          { text: "OK", onPress: () => router.back() },
        ]);
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedRef.current = true;
      setStarted(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    })().catch((err) => {
      Alert.alert("Không thể ghi âm", String(err), [{ text: "OK", onPress: () => router.back() }]);
    });

    return () => {
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePause = () => {
    Haptics.selectionAsync();
    if (state.isRecording) recorder.pause();
    else recorder.record();
  };

  const finish = async () => {
    if (!startedRef.current || saving) return;
    setSaving(true);
    const durationMs = state.durationMillis;
    await recorder.stop();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const uri = recorder.uri;
    if (!uri || durationMs < 1000) {
      Alert.alert("Bản ghi quá ngắn", "Hãy ghi âm ít nhất 1 giây.");
      router.back();
      return;
    }
    const note = addRecording(uri, durationMs);
    router.replace({ pathname: "/note/[id]", params: { id: note.id } });
    if (settings.autoProcess) processNote(note.id);
  };

  const cancel = () => {
    if (!startedRef.current || state.durationMillis < 3000) {
      recorder.stop().finally(() => router.back());
      return;
    }
    Alert.alert("Huỷ bản ghi?", "Nội dung vừa ghi sẽ không được lưu.", [
      { text: "Tiếp tục ghi", style: "cancel" },
      { text: "Huỷ bản ghi", style: "destructive", onPress: () => recorder.stop().finally(() => router.back()) },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.top}>
        <Pressable onPress={cancel} hitSlop={12}>
          <Text style={styles.cancel}>Huỷ</Text>
        </Pressable>
        <Text style={styles.status}>{!started ? "Đang chuẩn bị…" : state.isRecording ? "● Đang ghi âm" : "Tạm dừng"}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.center}>
        <Text style={styles.timer}>{formatDuration(state.durationMillis)}</Text>
        <View style={styles.wave}>
          {levels.map((level, i) => (
            <View key={i} style={[styles.waveBar, { height: 6 + level * 80, opacity: state.isRecording ? 1 : 0.4 }]} />
          ))}
        </View>
        <Text style={styles.hint}>Đặt điện thoại gần người nói để nhận dạng chính xác hơn</Text>
      </View>

      <View style={styles.controls}>
        <Pressable onPress={togglePause} disabled={!started} style={styles.sideButton}>
          <Text style={styles.sideIcon}>{state.isRecording ? "❚❚" : "●"}</Text>
          <Text style={styles.sideLabel}>{state.isRecording ? "Tạm dừng" : "Tiếp tục"}</Text>
        </Pressable>
        <Pressable onPress={finish} disabled={!started || saving} style={styles.stopButton}>
          <View style={styles.stopSquare} />
        </Pressable>
        <View style={styles.sideButton}>
          <Text style={styles.sideLabel}>{saving ? "Đang lưu…" : "Kết thúc"}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#15121F", paddingHorizontal: 24 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cancel: { color: "#B8B3D9", fontSize: 16 },
  status: { color: "#fff", fontSize: 15, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 32 },
  timer: { color: "#fff", fontSize: 64, fontWeight: "200", fontVariant: ["tabular-nums"] },
  wave: { flexDirection: "row", alignItems: "center", height: 100, gap: 4 },
  waveBar: { width: 5, borderRadius: 3, backgroundColor: colors.primary },
  hint: { color: "#8A85A8", fontSize: 13, textAlign: "center" },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sideButton: { width: 80, alignItems: "center", gap: 6 },
  sideIcon: { color: "#fff", fontSize: 22 },
  sideLabel: { color: "#B8B3D9", fontSize: 13 },
  stopButton: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  stopSquare: { width: 32, height: 32, borderRadius: 6, backgroundColor: colors.danger },
});
