import { View, Text, Pressable, Modal, StyleSheet, useWindowDimensions } from "react-native";
import { colors } from "../../utils/colors";
import { useIsTablet } from "../../hooks/useIsTablet";

export interface AlertButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

export default function CustomAlert({
  visible,
  title,
  message,
  buttons,
  onDismiss,
}: {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
  onDismiss?: () => void;
}) {
  const isTablet = useIsTablet();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={[styles.card, isTablet && styles.cardTablet]} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actions}>
            {buttons.map((btn, i) => {
              const isLast = i === buttons.length - 1 && buttons.length > 1;
              return (
                <Pressable
                  key={btn.text}
                  style={({ pressed }) => [
                    styles.btn,
                    btn.style === "destructive" && styles.btnDestructive,
                    btn.style === "cancel" && styles.btnCancel,
                    !isLast && styles.btnBorder,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => {
                    btn.onPress?.();
                  }}
                >
                  <Text
                    style={[
                      styles.btnText,
                      btn.style === "destructive" && styles.btnTextDestructive,
                      btn.style === "cancel" && styles.btnTextCancel,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cardTablet: {
    maxWidth: 420,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 8,
  },
  message: {
    color: colors.textPlaceholder,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
    paddingBottom: 18,
    lineHeight: 20,
  },
  actions: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  btn: {
    paddingVertical: 14,
    alignItems: "center",
  },
  btnBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  btnDestructive: {
    backgroundColor: "rgba(231, 76, 60, 0.1)",
  },
  btnCancel: {
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  btnText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "600",
  },
  btnTextDestructive: {
    color: colors.danger,
  },
  btnTextCancel: {
    color: colors.textFaint,
  },
});
