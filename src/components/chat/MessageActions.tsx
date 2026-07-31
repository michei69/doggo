import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import CustomBottomSheet from "../common/CustomBottomSheet";
import { colors } from "../../utils/colors";

export interface MessageAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export default function MessageActions({
  visible,
  onClose,
  actions,
}: {
  visible: boolean;
  onClose: () => void;
  actions: MessageAction[];
}) {
  return (
    <CustomBottomSheet visible={visible} onClose={onClose}>
      <View style={styles.content}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            style={({ pressed }) => [
              styles.option,
              pressed && { opacity: 0.7 },
            ]}
            onPress={action.onPress}
          >
            <Text
              style={[
                styles.optionText,
                action.destructive && styles.deleteText,
              ]}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </CustomBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  option: {
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "500",
  },
  deleteText: {
    color: colors.danger,
  },
});
