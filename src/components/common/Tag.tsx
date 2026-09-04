import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../utils/colors";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

function customColor(label: string) {
  const h = ((hashStr(label) % 360) + 360) % 360;
  return {
    bg: `hsla(${h}, 70%, 40%, 0.15)`,
    fg: `hsl(${h}, 60%, 68%)`,
    border: `hsla(${h}, 60%, 55%, 0.35)`,
  };
}

export default function Tag({
  label,
  variant = "default",
  compact = false,
}: {
  label: string;
  variant?: "default" | "custom";
  compact?: boolean;
}) {
  const isCustom = variant === "custom";

  const tint = useMemo(
    () => (isCustom ? customColor(label) : null),
    [isCustom, label],
  );

  return (
    <View
      style={[
        compact ? styles.tagCompact : styles.tag,
        isCustom && (compact ? styles.tagCustomCompact : styles.tagCustom),
        isCustom && tint
          ? { backgroundColor: tint.bg, borderColor: tint.border }
          : null,
      ]}
    >
      <Text
        style={[
          compact ? styles.textCompact : styles.text,
          isCustom && tint ? { color: tint.fg } : null,
        ]}
      >
        {isCustom ? `#${label}` : label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagCustom: {
    backgroundColor: "rgba(124, 92, 231, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(124,92,231,0.2)",
  },
  tagCompact: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagCustomCompact: {
    backgroundColor: "rgba(124, 92, 231, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(124,92,231,0.2)",
  },
  text: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "500",
  },
  textCompact: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "500",
  },
});
