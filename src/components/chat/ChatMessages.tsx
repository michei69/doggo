import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useChatStore } from "../../stores/chatStore";
import Avatar from "../common/Avatar";
import { botAvatarUrl } from "../../utils/assets";
import { colors } from "../../utils/colors";
import type { ChatListItem } from "../../types/api";

export default function ChatMessages({
  visible,
  onClose,
  onSelectChat,
}: {
  visible: boolean;
  onClose: () => void;
  onSelectChat: (chat: ChatListItem) => void;
}) {
  const chats = useChatStore((s) => s.chats);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const query = searchQuery.toLowerCase();
    return chats.filter((chat) => {
      const partnerName =
        chat.character.chat_name ||
        chat.character.name ||
        "";
      return partnerName.toLowerCase().includes(query);
    });
  }, [chats, searchQuery]);

  const handleSelect = useCallback(
    (chat: ChatListItem) => {
      onSelectChat(chat);
      onClose();
    },
    [onSelectChat, onClose],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Forward Message</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.close}>{"\u2715"}</Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search conversations..."
            placeholderTextColor={colors.textDimAlt}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {chats.length === 0 ? (
            <ActivityIndicator
              color={colors.accent}
              style={{ paddingVertical: 24 }}
            />
          ) : (
            <FlatList
              data={filteredChats}
              keyExtractor={(item) => String(item.id)}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const partnerName =
                  item.character.chat_name || item.character.name || "Unknown";
                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.chatRow,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => handleSelect(item)}
                  >
                    <Avatar
                      uri={
                        item.character.avatar
                          ? botAvatarUrl(item.character.avatar)
                          : ""
                      }
                      name={partnerName}
                      size={40}
                    />
                    <View style={styles.chatInfo}>
                      <Text style={styles.chatName} numberOfLines={1}>
                        {partnerName}
                      </Text>
                      {item.summary ? (
                        <Text style={styles.chatSummary} numberOfLines={1}>
                          {item.summary}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.chatCount}>
                      {item.chat_count} messages
                    </Text>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: "700",
  },
  close: {
    color: colors.textFaint,
    fontSize: 18,
    padding: 4,
  },
  searchInput: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  list: {
    maxHeight: 400,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  chatSummary: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  chatCount: {
    color: colors.textFaint,
    fontSize: 11,
  },
});
