import React, { useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import type { ChatListItem } from "../../types/api";
import { colors } from "../../utils/colors";

const ChatsSheet = React.memo(function ChatsSheet({
  title,
  loading,
  chats,
  emptyText,
  onBack,
  renderItem,
}: {
  title: string;
  loading: boolean;
  chats: ChatListItem[];
  emptyText: string;
  onBack: () => void;
  renderItem: ({ item }: { item: ChatListItem }) => React.ReactElement;
}) {
  const keyExtractor = useCallback(
    (item: ChatListItem) => item.id.toString(),
    [],
  );
  return (
    <View style={styles.chatsContent}>
      <View style={styles.chatsTitleRow}>
        <Pressable onPress={onBack} style={styles.chatsBackBtn}>
          <Text style={styles.chatsBackText}>{"\u2190"}</Text>
        </Pressable>
        <Text style={styles.chatsTitle}>{title}</Text>
        <View style={styles.chatsBackBtn} />
      </View>
      {loading ? (
        <ActivityIndicator
          color={colors.accent}
          style={{ paddingVertical: 24 }}
        />
      ) : chats.length === 0 ? (
        <Text style={styles.chatsEmpty}>{emptyText}</Text>
      ) : (
        <FlashList
          data={chats}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          style={styles.chatsList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  chatsContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  chatsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  chatsBackBtn: {
    width: 40,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  chatsBackText: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: "600",
  },
  chatsTitle: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 12,
    flex: 1,
  },
  chatsEmpty: {
    color: colors.textFaint,
    textAlign: "center",
    paddingVertical: 24,
    fontSize: 14,
  },
  chatsList: {
    flexGrow: 1,
    maxHeight: 300,
  },
});

export default ChatsSheet;
