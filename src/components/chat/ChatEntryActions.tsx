import OptionSheet, { type OptionSheetAction } from "../common/OptionSheet";

export default function ChatEntryActions({
  visible,
  onClose,
  onViewCharacter,
  onViewCreator,
  onNewChat,
  onAllChats,
  onDelete,
  characterName,
}: {
  visible: boolean;
  onClose: () => void;
  onViewCharacter: () => void;
  onViewCreator?: () => void;
  onNewChat: () => void;
  onAllChats: () => void;
  onDelete: () => void;
  characterName: string;
}) {
  const actions: OptionSheetAction[] = [
    {
      label: "View Character",
      onPress: () => {
        onClose();
        onViewCharacter();
      },
    },
    ...(onViewCreator
      ? [
          {
            label: "View Creator",
            onPress: () => {
              onClose();
              onViewCreator();
            },
          },
        ]
      : []),
    {
      label: "New Chat",
      onPress: () => {
        onClose();
        onNewChat();
      },
    },
    {
      label: "All Chats",
      onPress: () => {
        onClose();
        onAllChats();
      },
    },
    {
      label: "Delete Chat",
      onPress: () => {
        onClose();
        onDelete();
      },
      destructive: true,
    },
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
