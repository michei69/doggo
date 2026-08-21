import React, { useCallback } from "react";
import CustomBottomSheet from "../../../components/common/CustomBottomSheet";
import ChatsSheet from "../../../components/chat/ChatsSheet";
import { ChatRow } from "../../../components/chat/ChatRow";
import type { ChatListItem } from "../../../types/api";

const AllChatsSheet = React.memo(
  function AllChatsSheet({
    visible,
    onClose,
    onBack,
    characterName,
    loading,
    chats,
    onSelectChat,
  }: {
    visible: boolean;
    onClose: () => void;
    onBack: () => void;
    characterName: string;
    loading: boolean;
    chats: ChatListItem[];
    onSelectChat: (item: ChatListItem) => void;
  }) {
    const renderRow = useCallback(
      ({ item }: { item: ChatListItem }) => {
        const personas = Array.isArray(item.personas) ? item.personas : [];
        const persona =
          item.persona_id != null
            ? personas.find((p) => p.id === item.persona_id)
            : undefined;
        return (
          <ChatRow
            item={item}
            onPress={onSelectChat}
            persona={
              persona
                ? { name: persona.name, avatar: persona.avatar }
                : undefined
            }
          />
        );
      },
      [onSelectChat],
    );
    return (
      <CustomBottomSheet visible={visible} onClose={onClose}>
        <ChatsSheet
          title={characterName}
          loading={loading}
          chats={chats}
          emptyText="No chats with this character"
          onBack={onBack}
          renderItem={renderRow}
        />
      </CustomBottomSheet>
    );
  },
);

export default AllChatsSheet;
