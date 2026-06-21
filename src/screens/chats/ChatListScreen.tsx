import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Pressable,
  ScrollView,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useShallow } from "zustand/react/shallow";
import Avatar from "../../components/common/Avatar";
import { useChatStore } from "../../stores/chatStore";
import { withChallengeRetry } from "../../hooks/useChat";
import { useTurnstile } from "../../components/turnstile/TurnstileProvider";
import { botAvatarUrl } from "../../utils/assets";
import { stripHtml } from "../../utils/markdown";
import type { ChatListItem } from "../../types/api";
import type { ChatsStackParamList } from "../../navigation/types";
import ChatEntryActions from "../../components/chat/ChatEntryActions";
import PersonaPicker from "../../components/chat/PersonaPicker";
import CustomAlert, {
  type AlertButton,
} from "../../components/common/CustomAlert";
import CustomBottomSheet from "../../components/common/CustomBottomSheet";
import {
  getCharacterChats,
  deleteChat as deleteChatApi,
} from "../../api/chats";
import { formatRelativeTime } from "../../utils/time";
import { colors } from "../../utils/colors";
import AvatarPreview from "../../components/common/AvatarPreview";

type Nav = NativeStackNavigationProp<ChatsStackParamList, "ChatList">;

export default function ChatListScreen() {
  const { navigate } = useNavigation<Nav>();

  const { chats, isLoadingChats, error, hasMoreChats, chatsPage } =
    useChatStore(
      useShallow((s) => ({
        chats: s.chats,
        isLoadingChats: s.isLoadingChats,
        error: s.error,
        hasMoreChats: s.hasMoreChats,
        chatsPage: s.chatsPage,
      })),
    );

  const storeCreateChat = useChatStore((s) => s.createChat);
  const storeRemoveChat = useChatStore((s) => s.removeChat);

  const { showChallenge, showTurnstile } = useTurnstile();

  const loadChatsStore = useChatStore((s) => s.loadChats);

  const loadChats = useCallback(
    async (page = 1) => {
      await withChallengeRetry(
        () => loadChatsStore(page),
        showChallenge,
        showTurnstile,
      );
    },
    [loadChatsStore, showChallenge, showTurnstile],
  );

  const startNewChat = useCallback(
    async (characterId: string, personaId?: string) => {
      return await withChallengeRetry(
        () => storeCreateChat(characterId, personaId),
        showChallenge,
        showTurnstile,
      );
    },
    [storeCreateChat, showChallenge, showTurnstile],
  );

  const deleteChat = useCallback(
    async (chatId: number) => {
      await withChallengeRetry(
        () => deleteChatApi(chatId),
        showChallenge,
        showTurnstile,
      );
      storeRemoveChat(chatId);
    },
    [storeRemoveChat, showChallenge, showTurnstile],
  );
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadChats(1);
  }, [loadChats]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [targetChat, setTargetChat] = useState<ChatListItem | null>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [personaPickerVisible, setPersonaPickerVisible] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertButtons, setAlertButtons] = useState<AlertButton[]>([]);

  const [characterChats, setCharacterChats] = useState<ChatListItem[]>([]);
  const [characterChatsVisible, setCharacterChatsVisible] = useState(false);
  const [characterChatsLoading, setCharacterChatsLoading] = useState(false);
  const [characterChatsName, setCharacterChatsName] = useState("");
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUri, setPreviewUri] = useState("");
  const [previewName, setPreviewName] = useState("");

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadChats(1);
    setIsRefreshing(false);
  }, [loadChats]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMoreChats || isLoadingMore || isLoadingChats) return;
    setIsLoadingMore(true);
    await loadChats(chatsPage + 1);
    setIsLoadingMore(false);
  }, [hasMoreChats, isLoadingMore, isLoadingChats, chatsPage, loadChats]);

  const handleLongPress = useCallback((item: ChatListItem) => {
    setTargetChat(item);
    setActionsVisible(true);
  }, []);

  const handleViewCharacter = useCallback(() => {
    if (!targetChat) return;
    navigate("ChatCharacter", {
      characterId: targetChat.character_id,
      characterName: targetChat.character.name || "Character",
    });
  }, [targetChat, navigate]);

  const handleViewCreator = useCallback(() => {
    if (!targetChat?.character.creator_id) return;
    navigate("CreatorScreen", {
      userId: targetChat.character.creator_id,
      userName: targetChat.character.creator_name || "Creator",
    });
  }, [targetChat, navigate]);

  const handleNewChat = useCallback(() => {
    if (!targetChat) return;
    setActionsVisible(false);
    setPersonaPickerVisible(true);
  }, [targetChat]);

  const handlePersonaSelect = useCallback(
    async (persona: { id: string; name: string; avatar: string } | null) => {
      if (!targetChat) return;
      try {
        const chatId = await startNewChat(targetChat.character_id, persona?.id);
        navigate("ChatScreen", {
          chatId,
          characterName: targetChat.character.name || "Chat",
          characterId: targetChat.character_id,
        });
      } catch {}
    },
    [targetChat, startNewChat, navigate],
  );

  const handleAllChats = useCallback(async () => {
    if (!targetChat) return;
    setCharacterChatsName(targetChat.character.name || "Character");
    setCharacterChatsVisible(true);
    setCharacterChatsLoading(true);
    try {
      const chats = await getCharacterChats(targetChat.character_id);
      setCharacterChats(chats);
    } catch {
    } finally {
      setCharacterChatsLoading(false);
    }
  }, [targetChat]);

  const handleDelete = useCallback(() => {
    if (!targetChat) return;
    setActionsVisible(false);
    setAlertTitle("Delete Chat");
    setAlertMessage(
      `Delete "${targetChat.character.name}"? This cannot be undone.`,
    );
    setAlertButtons([
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => setAlertVisible(false),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setAlertVisible(false);
          try {
            await deleteChat(targetChat.id);
          } catch {}
        },
      },
    ]);
    setAlertVisible(true);
  }, [targetChat, deleteChat]);

  const renderItem = useCallback(
    ({ item }: { item: ChatListItem }) => (
      <Pressable
        style={({ pressed }) => [styles.chatItem, pressed && { opacity: 0.7 }]}
        onPress={() =>
          navigate("ChatScreen", {
            chatId: item.id,
            characterName: item.character.name || "Chat",
            characterId: item.character_id,
          })
        }
        onLongPress={() => handleLongPress(item)}
      >
        <Avatar
          uri={botAvatarUrl(item.character.avatar)}
          name={item.character.name}
          size={52}
          onPress={() => {
            setPreviewUri(botAvatarUrl(item.character.avatar));
            setPreviewName(item.character.name);
            setPreviewVisible(true);
          }}
        />
        <View style={styles.chatInfo}>
          <View style={styles.chatTopRow}>
            <Text style={styles.chatName} numberOfLines={1}>
              {item.character.name || "Unnamed"}
            </Text>
            <Text style={styles.chatTime}>
              {formatRelativeTime(item.updated_at)}
            </Text>
          </View>
          <Text style={styles.chatSummary} numberOfLines={2}>
            {item.summary && item.summary.length > 0
              ? item.summary
              : item.character.description
                ? stripHtml(item.character.description)
                : "No messages yet"}
          </Text>
          <Text style={styles.chatCount}>{item.chat_count} messages</Text>
        </View>
      </Pressable>
    ),
    [navigate, handleLongPress],
  );

  const keyExtractor = useCallback(
    (item: ChatListItem) => item.id.toString(),
    [],
  );

  const handleActionsClose = useCallback(() => setActionsVisible(false), []);
  const handlePersonaPickerClose = useCallback(
    () => setPersonaPickerVisible(false),
    [],
  );
  const handleAllChatsClose = useCallback(
    () => setCharacterChatsVisible(false),
    [],
  );
  const handleAlertDismiss = useCallback(() => setAlertVisible(false), []);
  const handleCharChatsBack = useCallback(() => {
    setCharacterChatsVisible(false);
    setActionsVisible(true);
  }, []);

  if (isLoadingChats && chats.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Chats</Text>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  if (error && chats.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Chats</Text>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={() => loadChats(1)}
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chats</Text>
      {chats.length === 0 ? (
        <ScrollView
          contentContainerStyle={[styles.centered, { flexGrow: 1 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
        >
          <Text style={styles.emptyText}>No chats yet</Text>
          <Text style={styles.emptySubtext}>
            Start a chat from the Discover tab
          </Text>
        </ScrollView>
      ) : (
        <FlashList
          data={chats}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          style={styles.flashlist}
          drawDistance={2000}
          overrideProps={{ initialDrawBatchSize: 50 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator
                style={styles.footerLoader}
                color={colors.accent}
              />
            ) : null
          }
        />
      )}

      <ChatEntryActions
        visible={actionsVisible}
        onClose={handleActionsClose}
        onViewCharacter={handleViewCharacter}
        onViewCreator={
          targetChat?.character.creator_id ? handleViewCreator : undefined
        }
        onNewChat={handleNewChat}
        onAllChats={handleAllChats}
        onDelete={handleDelete}
        characterName={targetChat?.character.name || "Chat"}
      />

      <PersonaPicker
        visible={personaPickerVisible}
        onClose={handlePersonaPickerClose}
        onSelect={handlePersonaSelect}
        characterName={targetChat?.character.name || "Character"}
      />

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        buttons={alertButtons}
        onDismiss={handleAlertDismiss}
      />

      <CustomBottomSheet
        visible={characterChatsVisible}
        onClose={handleAllChatsClose}
      >
        <View style={styles.charChatsContent}>
          <View style={styles.charChatsTitleRow}>
            <Pressable
              onPress={handleCharChatsBack}
              style={styles.charChatsBackBtn}
            >
              <Text style={styles.charChatsBackText}>{"\u2190"}</Text>
            </Pressable>
            <Text style={styles.charChatsTitle}>{characterChatsName}</Text>
            <View style={styles.charChatsBackBtn} />
          </View>
          {characterChatsLoading ? (
            <ActivityIndicator
              color={colors.accent}
              style={{ paddingVertical: 24 }}
            />
          ) : characterChats.length === 0 ? (
            <Text style={styles.charChatsEmpty}>
              No other chats with this character
            </Text>
          ) : (
            <ScrollView style={styles.charChatsList}>
              {characterChats.map((chat) => (
                <Pressable
                  key={chat.id}
                  style={({ pressed }) => [
                    styles.charChatRow,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => {
                    setCharacterChatsVisible(false);
                    navigate("ChatScreen", {
                      chatId: chat.id,
                      characterName: chat.character.name || "Chat",
                      characterId: chat.character_id,
                    });
                  }}
                >
                  <Avatar
                    uri={botAvatarUrl(chat.character.avatar)}
                    name={chat.character.name}
                    size={36}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.charChatRowName} numberOfLines={1}>
                      {chat.character.name}
                    </Text>
                    <Text style={styles.charChatRowMeta}>
                      {chat.chat_count} messages
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </CustomBottomSheet>

      <AvatarPreview
        visible={previewVisible}
        uri={previewUri}
        onClose={() => setPreviewVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  list: {
    paddingVertical: 8,
  },
  flashlist: {
    flex: 1,
  },
  chatItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  chatInfo: {
    flex: 1,
  },
  chatTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    color: colors.textFaint,
    fontSize: 12,
  },
  chatSummary: {
    color: colors.textFaint,
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
  },
  chatCount: {
    color: colors.accent,
    fontSize: 11,
    marginTop: 4,
    fontWeight: "500",
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: colors.card,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  emptyText: {
    color: colors.textDim,
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtext: {
    color: colors.textDimAlt,
    fontSize: 14,
    marginTop: 8,
  },
  footerLoader: {
    paddingVertical: 20,
  },
  charChatsContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  charChatsTitle: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 12,
    flex: 1,
  },
  charChatsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  charChatsBackBtn: {
    width: 40,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  charChatsBackText: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: "600",
  },
  charChatsEmpty: {
    color: colors.textFaint,
    textAlign: "center",
    paddingVertical: 24,
    fontSize: 14,
  },
  charChatsList: {
    maxHeight: 300,
  },
  charChatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  charChatRowName: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  charChatRowMeta: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
});
