import React from "react";
import OptionSheet from "../../../components/common/OptionSheet";
import type { ChatMessage } from "../../../types/api";

const ChatMessageActions = React.memo(
  function ChatMessageActions({
    visible,
    actionsTarget,
    isLastMessage,
    onClose,
    onCopy,
    onEdit,
    onReformat,
    onRerollMessage,
    onFork,
    onReroll,
    onDelete,
  }: {
    visible: boolean;
    actionsTarget: { message: ChatMessage; isUser: boolean } | null;
    isLastMessage: boolean;
    onClose: () => void;
    onCopy: () => void;
    onEdit: () => void;
    onReformat: () => void;
    onRerollMessage: () => void;
    onFork: () => void;
    onReroll: () => void;
    onDelete: () => void;
  }) {
    return (
      <OptionSheet
        visible={visible}
        onClose={onClose}
        actions={[
          ...(actionsTarget
            ? [
                {
                  label: "Copy Message",
                  onPress: onCopy,
                },
              ]
            : []),
          ...(actionsTarget && actionsTarget.message.id > 0
            ? [
                {
                  label: "Edit Message",
                  onPress: onEdit,
                },
              ]
            : []),
          ...(actionsTarget &&
          !actionsTarget.isUser &&
          actionsTarget.message.id > 0
            ? [
                {
                  label: "Reformat Markdown",
                  onPress: onReformat,
                },
              ]
            : []),
          ...(actionsTarget &&
          actionsTarget.isUser &&
          isLastMessage &&
          actionsTarget.message.id > 0
            ? [
                {
                  label: "Reroll message",
                  onPress: onRerollMessage,
                },
              ]
            : []),
          ...(actionsTarget && actionsTarget.message.id > 0
            ? [
                {
                  label: "Fork Chat",
                  onPress: onFork,
                },
              ]
            : []),
          ...(actionsTarget && !actionsTarget.isUser
            ? [
                {
                  label: "Reroll",
                  onPress: onReroll,
                },
              ]
            : []),
          {
            label: "Delete Message",
            destructive: true,
            onPress: onDelete,
          },
        ]}
      />
    );
  },
);

export default ChatMessageActions;
