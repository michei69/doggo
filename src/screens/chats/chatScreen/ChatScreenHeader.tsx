import React from "react";
import { Pressable, StyleSheet } from "react-native";
import ScreenHeader from "../../../components/common/ScreenHeader";
import { Settings } from "lucide-react-native";
import { colors } from "../../../utils/colors";

const ChatScreenHeader = React.memo(
  function ChatScreenHeader({
    title,
    onBack,
    onOpenSettings,
  }: {
    title: string;
    onBack: () => void;
    onOpenSettings: () => void;
  }) {
    return (
      <ScreenHeader
        title={title}
        onBack={onBack}
        rightElement={
          <Pressable
            onPress={onOpenSettings}
            style={styles.backBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Settings size={22} color={colors.accent} />
          </Pressable>
        }
      />
    );
  },
);

const styles = StyleSheet.create({
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ChatScreenHeader;
