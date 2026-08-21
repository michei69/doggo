import { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import CustomBottomSheet from "../common/CustomBottomSheet";
import type { OptionSheetAction } from "../common/OptionSheet";
import { colors } from "../../utils/colors";

export default function ChatSettingsOverlay({
  visible,
  onClose,
  characterName,
  characterId,
  chatId,
  creatorId,
  creatorName,
  allowProxy,
  onNewChat,
  onAllChats,
  onMessagesActions,
  onDeleteChat,
  onViewSystemPrompt,
  onAttemptViewSystemPrompt,
}: {
  visible: boolean;
  onClose: () => void;
  characterName: string;
  characterId: string;
  chatId: number;
  creatorId?: string;
  creatorName?: string;
  allowProxy?: boolean;
  onNewChat: () => void;
  onAllChats: () => void;
  onMessagesActions: () => void;
  onDeleteChat: () => void;
  onViewSystemPrompt?: () => void;
  onAttemptViewSystemPrompt?: () => void;
}) {
  const nav = useNavigation<any>();

  const handleViewCharacter = useCallback(() => {
    onClose();
    nav.navigate("ChatCharacter", { characterId, characterName });
  }, [onClose, nav, characterId, characterName]);

  const handleViewCreator = useCallback(() => {
    if (!creatorId) return;
    onClose();
    nav.navigate("CreatorScreen", {
      userId: creatorId,
      userName: creatorName || "Creator",
    });
  }, [onClose, nav, creatorId, creatorName]);

  const handleGenerationSettings = useCallback(() => {
    onClose();
    nav.navigate("GenerationSettings");
  }, [onClose, nav]);

  const handleNewChat = useCallback(() => {
    onClose();
    onNewChat();
  }, [onClose, onNewChat]);
  const handleAllChats = useCallback(() => {
    onClose();
    onAllChats();
  }, [onClose, onAllChats]);
  const handleMessagesActions = useCallback(() => {
    onClose();
    onMessagesActions();
  }, [onClose, onMessagesActions]);
  const handleDeleteChat = useCallback(() => {
    onClose();
    onDeleteChat();
  }, [onClose, onDeleteChat]);

  const handleViewSystemPrompt = useCallback(() => {
    onClose();
    onViewSystemPrompt?.();
  }, [onClose, onViewSystemPrompt]);

  const handleAttemptViewSystemPrompt = useCallback(() => {
    onClose();
    onAttemptViewSystemPrompt?.();
  }, [onClose, onAttemptViewSystemPrompt]);

  const sections: { header: string; actions: OptionSheetAction[] }[] = [
    {
      header: "CHARACTER",
      actions: [
        { label: "View Character", onPress: handleViewCharacter },
        ...(creatorId
          ? [{ label: "View Creator", onPress: handleViewCreator }]
          : []),
        {
          label: allowProxy ? "View System Prompt" : "Fetch System Prompt",
          onPress: allowProxy
            ? handleViewSystemPrompt
            : handleAttemptViewSystemPrompt,
        },
      ],
    },
    {
      header: "GENERATION",
      actions: [
        { label: "Generation Settings", onPress: handleGenerationSettings },
      ],
    },
    {
      header: "CHAT",
      actions: [
        { label: "New Chat", onPress: handleNewChat },
        { label: "All Chats", onPress: handleAllChats },
        {
          label: "Messages Actions",
          onPress: handleMessagesActions,
          accent: true,
        },
        { label: "Delete Chat", onPress: handleDeleteChat, destructive: true },
      ],
    },
  ];

  return (
    <CustomBottomSheet visible={visible} onClose={onClose}>
      <View style={styles.content}>
        <Text style={styles.title}>{characterName}</Text>
        {sections.map((section) => (
          <View key={section.header}>
            <Text style={styles.sectionHeader}>{section.header}</Text>
            {section.actions.map((action) => (
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
  sectionHeader: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    textAlign: "center",
    paddingTop: 12,
    paddingBottom: 4,
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
});
