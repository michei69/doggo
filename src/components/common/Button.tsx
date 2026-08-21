import { Pressable, Text, ActivityIndicator, StyleSheet } from "react-native";
import { colors } from "../../utils/colors";

export default function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: object;
}) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "outline" && styles.outline,
        variant === "danger" && styles.danger,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "outline" ? colors.accent : colors.text}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            variant === "outline" && { color: colors.accent },
            variant === "danger" && { color: colors.text },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  outline: {
    backgroundColor: colors.transparent,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
});
