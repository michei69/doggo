import { useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import OptionSheet, { type OptionSheetAction } from "../common/OptionSheet";

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

  const actions: OptionSheetAction[] = [
    { label: "View Character", onPress: handleViewCharacter },
    {
      label: allowProxy ? "View System Prompt" : "Fetch System Prompt",
      onPress: allowProxy
        ? handleViewSystemPrompt
        : handleAttemptViewSystemPrompt,
    },
    ...(creatorId
      ? [{ label: "View Creator", onPress: handleViewCreator }]
      : []),
    { label: "Generation Settings", onPress: handleGenerationSettings },
    { label: "New Chat", onPress: handleNewChat },
    { label: "All Chats", onPress: handleAllChats },
    {
      label: "Messages Actions",
      onPress: handleMessagesActions,
      accent: true,
    },
    { label: "Delete Chat", onPress: handleDeleteChat, destructive: true },
  ];

  return (
    <OptionSheet
      visible={visible}
      onClose={onClose}
      title={characterName}
      actions={actions}
    />
  );
}
