import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { X } from "lucide-react-native";
import { colors } from "../../utils/colors";

export default function CenteredModal({
  visible,
  onClose,
  title,
  children,
  backdropOpacity = 0.6,
  contentStyle,
  hideCloseButton = false,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  backdropOpacity?: number;
  contentStyle?: StyleProp<ViewStyle>;
  hideCloseButton?: boolean;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={[
          styles.overlay,
          { backgroundColor: `rgba(0,0,0,${backdropOpacity})` },
        ]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Pressable style={[styles.content, contentStyle]} onPress={() => {}}>
          {title && (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              {!hideCloseButton && (
                <Pressable
                  onPress={onClose}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <X size={20} color={colors.text} />
                </Pressable>
              )}
            </View>
          )}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    width: "85%",
    maxWidth: 480,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
});
