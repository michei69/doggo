import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../utils/colors";

export default function Badge({
  label,
  variant = "proxy",
}: {
  label: string;
  variant?: "nsfw" | "safe" | "proxy" | "private";
}) {
  const bg =
    variant === "nsfw"
      ? colors.dangerLight
      : variant === "safe"
        ? colors.successLight
        : variant === "private"
          ? "rgba(170, 170, 170, 0.15)"
          : colors.accentFaded;
  const border =
    variant === "nsfw"
      ? "rgba(231, 76, 60, 0.3)"
      : variant === "safe"
        ? "rgba(46, 204, 113, 0.3)"
        : variant === "private"
          ? "rgba(170, 170, 170, 0.25)"
          : colors.accentStrong;
  const color =
    variant === "nsfw"
      ? colors.danger
      : variant === "safe"
        ? colors.success
        : variant === "private"
          ? colors.textMuted
          : colors.accent;

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
  },
});
