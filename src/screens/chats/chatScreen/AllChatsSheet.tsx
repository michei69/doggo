import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { FlashList } from "@shopify/flash-list";
import CustomBottomSheet from "../../../components/common/CustomBottomSheet";
import Avatar from "../../../components/common/Avatar";
import { botAvatarUrl, avatarUrl } from "../../../utils/assets";
import type { ChatListItem } from "../../../types/api";
import { colors } from "../../../utils/colors";

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
        const persona = Array.isArray(item.personas)
          ? (item.personas as Array<{ id?: string; name?: string; avatar?: string }>).find(
              (p) => p?.id === item.persona_id,
            ) ??
            (item.personas as Array<{ id?: string; name?: string; avatar?: string }>)[0]
          : undefined;
        return (
          <Pressable
            style={({ pressed }) => [
              styles.allChatsRow,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => onSelectChat(item)}
          >
            <Avatar
              uri={botAvatarUrl(item.character.avatar)}
              name={item.character.name}
              size={36}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.allChatsRowName} numberOfLines={1}>
                {item.character.name}
              </Text>
              <Text style={styles.allChatsRowMeta}>
                {item.chat_count} messages
                {persona?.name ? ` · ${persona.name}` : ""}
              </Text>
            </View>
            {persona?.avatar ? (
              <Avatar uri={avatarUrl(persona.avatar)} name={persona.name} size={28} />
            ) : null}
          </Pressable>
        );
      },
      [onSelectChat],
    );
    return (
      <CustomBottomSheet visible={visible} onClose={onClose}>
        <View style={styles.allChatsContent}>
          <View style={styles.allChatsTitleRow}>
            <Pressable
              onPress={onBack}
              style={styles.allChatsBackBtn}
            >
              <Text style={styles.allChatsBackText}>{"\u2190"}</Text>
            </Pressable>
            <Text style={styles.allChatsTitle}>{characterName}</Text>
            <View style={styles.allChatsBackBtn} />
          </View>
          {loading ? (
            <ActivityIndicator
              color={colors.accent}
              style={{ paddingVertical: 24 }}
            />
          ) : chats.length === 0 ? (
            <Text style={styles.allChatsEmpty}>
              No chats with this character
            </Text>
          ) : (
            <FlashList
              data={chats}
              renderItem={renderRow}
              keyExtractor={(item) => item.id.toString()}
              style={styles.allChatsList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </CustomBottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  allChatsContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  allChatsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  allChatsBackBtn: {
    width: 40,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  allChatsBackText: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: "600",
  },
  allChatsTitle: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 12,
    flex: 1,
  },
  allChatsEmpty: {
    color: colors.textFaint,
    textAlign: "center",
    paddingVertical: 24,
    fontSize: 14,
  },
  allChatsList: {
    maxHeight: 300,
  },
  allChatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  allChatsRowName: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  allChatsRowMeta: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
});

export default AllChatsSheet;
