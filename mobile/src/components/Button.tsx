import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { colors, radius } from "../lib/theme";

type Props = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = "primary", loading, disabled, style }: Props) {
  const palette = {
    primary: { bg: colors.primary, fg: "#fff" },
    secondary: { bg: colors.primarySoft, fg: colors.primary },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={palette.fg} /> : <Text style={[styles.text, { color: palette.fg }]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: 13, paddingHorizontal: 18, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  text: { fontSize: 15, fontWeight: "600" },
});
