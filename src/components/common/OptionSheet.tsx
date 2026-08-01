import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import CustomBottomSheet from "./CustomBottomSheet";
import { colors } from "../../utils/colors";

export interface OptionSheetAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  accent?: boolean;
}

export default function OptionSheet({
  visible,
  onClose,
  title,
  actions,
  variant = "default",
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  actions: OptionSheetAction[];
  variant?: "default" | "menu";
}) {
  const isMenu = variant === "menu";

  return (
    <CustomBottomSheet visible={visible} onClose={onClose}>
      {isMenu ? (
        <ScrollView>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              style={styles.menuItem}
              onPress={action.onPress}
            >
              <Text
                style={[
                  styles.menuText,
                  action.destructive && styles.deleteText,
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.content}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
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
                  action.accent && styles.accentText,
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </CustomBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
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
  accentText: {
    color: colors.accent,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
  },
});
