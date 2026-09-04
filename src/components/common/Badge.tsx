import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../utils/colors";

type BadgeVariant = "nsfw" | "safe" | "proxy" | "private";

const VARIANT_STYLES = {
  nsfw: {
    bg: colors.dangerLight,
    border: "rgba(231, 76, 60, 0.3)",
    color: colors.danger,
  },
  safe: {
    bg: colors.successLight,
    border: "rgba(46, 204, 113, 0.3)",
    color: colors.success,
  },
  proxy: {
    bg: colors.accentFaded,
    border: colors.accentStrong,
    color: colors.accent,
  },
  private: {
    bg: "rgba(170, 170, 170, 0.15)",
    border: "rgba(170, 170, 170, 0.25)",
    color: colors.textMuted,
  },
} as const;

export default function Badge({
  label,
  variant = "proxy",
}: {
  label: string;
  variant?: BadgeVariant;
}) {
  const { bg, border, color } = VARIANT_STYLES[variant];

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
