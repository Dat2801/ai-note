import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatDuration } from "../lib/format";
import { colors, radius } from "../lib/theme";

export function AudioPlayerBar({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;

  const toggle = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish || status.currentTime >= status.duration) player.seekTo(0);
    player.play();
  };

  const skip = (seconds: number) => {
    player.seekTo(Math.min(Math.max(0, status.currentTime + seconds), status.duration));
  };

  return (
    <View style={styles.bar}>
      <Pressable onPress={() => skip(-10)} hitSlop={8}>
        <Text style={styles.skip}>−10s</Text>
      </Pressable>
      <Pressable onPress={toggle} style={styles.play} disabled={!status.isLoaded}>
        <Text style={styles.playIcon}>{status.playing ? "❚❚" : "▶"}</Text>
      </Pressable>
      <Pressable onPress={() => skip(10)} hitSlop={8}>
        <Text style={styles.skip}>+10s</Text>
      </Pressable>
      <View style={styles.trackWrap}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.time}>
          {formatDuration(status.currentTime * 1000)} / {formatDuration(status.duration * 1000)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  play: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  playIcon: { color: "#fff", fontSize: 14, fontWeight: "700" },
  skip: { color: colors.primary, fontSize: 12, fontWeight: "600" },
  trackWrap: { flex: 1, gap: 4 },
  track: { height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: "hidden" },
  fill: { height: 4, backgroundColor: colors.primary },
  time: { fontSize: 11, color: colors.textSecondary },
});
