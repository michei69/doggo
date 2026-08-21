import React, { useCallback, useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import type { ListRenderItem } from "@shopify/flash-list";
import { Skeleton } from "boneyard-js/native";
import { Search } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useShallow } from "zustand/react/shallow";
import Avatar from "../../components/common/Avatar";
import { useChatStore } from "../../stores/chatStore";
import { useAlert } from "../../hooks/useAlert";
import { withChallengeRetry } from "../../hooks/useChat";
import { useTurnstile } from "../../components/turnstile/TurnstileProvider";
import { botAvatarUrl } from "../../utils/assets";
import { stripHtml } from "../../utils/markdown";
import type { ChatListItem, PersonaRef } from "../../types/api";
import type { ChatsStackParamList } from "../../navigation/types";
import ChatEntryActions from "../../components/chat/ChatEntryActions";
import PersonaPicker from "../../components/chat/PersonaPicker";
import ChatsSheet from "../../components/chat/ChatsSheet";
import { ChatRow } from "../../components/chat/ChatRow";
import CustomAlert from "../../components/common/CustomAlert";
import CustomBottomSheet from "../../components/common/CustomBottomSheet";
import EmptyState from "../../components/common/EmptyState";
import { useRefreshControl } from "../../components/common/useRefreshControl";
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
  const { alert, showAlert, dismissAlert } = useAlert();
  const [characterChats, setCharacterChats] = useState<ChatListItem[]>([]);
  const [characterChatsVisible, setCharacterChatsVisible] = useState(false);
  const [characterChatsLoading, setCharacterChatsLoading] = useState(false);
  const [characterChatsName, setCharacterChatsName] = useState("");
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUri, setPreviewUri] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChats = useMemo(
    () =>
      searchQuery.trim()
        ? chats.filter((c) =>
            c.character.name
              ?.toLowerCase()
              .includes(searchQuery.toLowerCase()),
          )
        : chats,
    [chats, searchQuery],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadChats(1);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadChats]);
  const handleLoadMore = useCallback(async () => {
    if (!hasMoreChats || isLoadingMore || isLoadingChats) return;
    setIsLoadingMore(true);
    try {
      await loadChats(chatsPage + 1);
    } finally {
      setIsLoadingMore(false);
    }
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
    async (persona: PersonaRef | null) => {
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
    showAlert(
      "Delete Chat",
      `Delete "${targetChat.character.name}"? This cannot be undone.`,
      [
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            dismissAlert();
            try {
              await deleteChat(targetChat.id);
            } catch {}
          },
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: dismissAlert,
        },
      ],
    );
  }, [targetChat, deleteChat, showAlert, dismissAlert]);

  const openChat = useCallback(
    (item: ChatListItem) => {
      navigate("ChatScreen", {
        chatId: item.id,
        characterName: item.character.name || "Chat",
        characterId: item.character_id,
      });
    },
    [navigate],
  );
  const openAvatarPreview = useCallback((item: ChatListItem) => {
    setPreviewUri(botAvatarUrl(item.character.avatar));
    setPreviewVisible(true);
  }, []);
  const openCharChat = useCallback(
    (item: ChatListItem) => {
      setCharacterChatsVisible(false);
      openChat(item);
    },
    [openChat],
  );
  const renderCharChatRow = useCallback(
    ({ item }: { item: ChatListItem }) => (
      <ChatRow item={item} onPress={openCharChat} />
    ),
    [openCharChat],
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
  const handleCharChatsBack = useCallback(() => {
    setCharacterChatsVisible(false);
    setActionsVisible(true);
  }, []);
  const handlePreviewClose = useCallback(() => setPreviewVisible(false), []);

  const retryLoad = useCallback(() => loadChats(1), [loadChats]);

  if (isLoadingChats && chats.length === 0) return <ChatListLoading />;
  if (error && chats.length === 0) return <ChatListError message={error} onRetry={retryLoad} />;

  return (
    <View style={styles.container}>
      <ChatListHeader />
      {chats.length > 0 && (
        <SearchBar query={searchQuery} onQueryChange={setSearchQuery} />
      )}
      {chats.length === 0 ? (
        <ChatListEmptyState
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      ) : (
        <ChatsList
          data={filteredChats}
          onOpenItem={openChat}
          onLongPressItem={handleLongPress}
          onAvatarPressItem={openAvatarPreview}
          onEndReached={handleLoadMore}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          isLoadingMore={isLoadingMore}
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
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        onDismiss={dismissAlert}
      />

      <CustomBottomSheet
        visible={characterChatsVisible}
        onClose={handleAllChatsClose}
      >
        <ChatsSheet
          title={characterChatsName}
          loading={characterChatsLoading}
          chats={characterChats}
          emptyText="No other chats with this character"
          onBack={handleCharChatsBack}
          renderItem={renderCharChatRow}
        />
      </CustomBottomSheet>

      <AvatarPreview
        visible={previewVisible}
        uri={previewUri}
        onClose={handlePreviewClose}
      />
    </View>
  );
}

const ChatListHeader = React.memo(function ChatListHeader() {
  return <Text style={styles.title}>Chats</Text>;
});

const ChatListLoading = React.memo(function ChatListLoading() {
  return (
    <Skeleton
      name="chat-list"
      loading
      animate="shimmer"
      fallback={
        <View style={styles.container}>
          <ChatListHeader />
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        </View>
      }
    >
      <View style={styles.container}>
        <ChatListHeader />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.skeletonRow}>
            <View style={styles.skeletonAvatar} />
            <View style={styles.skeletonInfo}>
              <View style={styles.skeletonName} />
              <View style={styles.skeletonSummary} />
            </View>
          </View>
        ))}
      </View>
    </Skeleton>
  );
});

const ChatListError = React.memo(function ChatListError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.container}>
      <ChatListHeader />
      <View style={styles.centered}>
        <Text style={styles.errorText}>{message}</Text>
        <Pressable
          onPress={onRetry}
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
});

const SearchBar = React.memo(function SearchBar({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (text: string) => void;
}) {
  return (
    <View style={styles.searchRow}>
      <Search size={16} color={colors.textDim} />
      <TextInput
        style={styles.searchInput}
        placeholder="Search conversations..."
        placeholderTextColor={colors.textDim}
        value={query}
        onChangeText={onQueryChange}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {query.length > 0 && (
        <Pressable onPress={() => onQueryChange("")}>
          <Text style={styles.clearBtn}>Clear</Text>
        </Pressable>
      )}
    </View>
  );
});

const ChatListEmptyState = React.memo(function ChatListEmptyState({
  isRefreshing,
  onRefresh,
}: {
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  const refreshControl = useRefreshControl(isRefreshing, onRefresh);
  return (
    <ScrollView
      contentContainerStyle={[styles.centered, { flexGrow: 1 }]}
      refreshControl={refreshControl}
    >
      <EmptyState
        text="No chats yet"
        subtext="Start a chat from the Discover tab"
        textStyle={styles.emptyText}
        subtextStyle={styles.emptySubtext}
      />
    </ScrollView>
  );
});

const ChatListItemRow = React.memo(function ChatListItemRow({
  item,
  onPress,
  onLongPress,
  onAvatarPress,
}: {
  item: ChatListItem;
  onPress: (item: ChatListItem) => void;
  onLongPress: (item: ChatListItem) => void;
  onAvatarPress: (item: ChatListItem) => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.chatItem, pressed && { opacity: 0.7 }]}
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
    >
      <Avatar
        uri={botAvatarUrl(item.character.avatar)}
        name={item.character.name}
        size={52}
        onPress={() => onAvatarPress(item)}
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
  );
});

const ChatsList = React.memo(function ChatsList({
  data,
  onOpenItem,
  onLongPressItem,
  onAvatarPressItem,
  onEndReached,
  isRefreshing,
  onRefresh,
  isLoadingMore,
}: {
  data: ChatListItem[];
  onOpenItem: (item: ChatListItem) => void;
  onLongPressItem: (item: ChatListItem) => void;
  onAvatarPressItem: (item: ChatListItem) => void;
  onEndReached: () => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  isLoadingMore: boolean;
}) {
  const renderItem = useCallback(
    ({ item }: { item: ChatListItem }) => (
      <ChatListItemRow
        item={item}
        onPress={onOpenItem}
        onLongPress={onLongPressItem}
        onAvatarPress={onAvatarPressItem}
      />
    ),
    [onOpenItem, onLongPressItem, onAvatarPressItem],
  );

  const keyExtractor = useCallback(
    (item: ChatListItem) => item.id.toString(),
    [],
  );

  const refreshControl = useRefreshControl(isRefreshing, onRefresh);

  return (
    <FlashList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.2}
      style={styles.flashlist}
      drawDistance={2000}
      overrideProps={{ initialDrawBatchSize: 50 }}
      refreshControl={refreshControl}
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
  );
});

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
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  skeletonAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.border,
  },
  skeletonInfo: {
    flex: 1,
    gap: 8,
  },
  skeletonName: {
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.border,
    width: "55%",
  },
  skeletonSummary: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
    width: "85%",
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.overlayLight,
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 10,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearBtn: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
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
});