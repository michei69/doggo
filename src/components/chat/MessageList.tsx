import React, {
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  View,
  StyleSheet,
  Text,
  Pressable,
} from "react-native";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Skeleton } from "boneyard-js/native";
import ChatBubble from "./ChatBubble";
import type { ChatMessage } from "../../types/api";
import type { Pronouns } from "../../types/api";
import { colors } from "../../utils/colors";
import { useChatStore } from "../../stores/chatStore";
import { scheduleOnRN } from "react-native-worklets";
import { setMessageMainState } from "../../api/chats";

import { groupMessages, type MessageGroup } from "../../utils/messages";

const MessageGroupRenderer = React.memo(
  function MessageGroupRenderer({
    group,
    isLast,
    chatId,
    onEdit,
    onDelete,
    onMessageLongPress,
    editingMessageId,
    onEditingDone,
    personaName,
    characterChatName,
    personaPronouns,
    characterAvatar,
    personaAvatar,
    activeThinking,
    enableThinking,
    onReroll,
  }: {
    group: MessageGroup;
    isLast: boolean;
    chatId?: number;
    onEdit: (messageId: number, newContent: string) => void;
    onDelete: (messageId: number) => void;
    onMessageLongPress?: (message: ChatMessage) => void;
    editingMessageId?: number | null;
    onEditingDone?: () => void;
    personaName?: string;
    characterChatName?: string;
    personaPronouns?: Pronouns | null;
    characterAvatar?: string;
    personaAvatar?: string;
    activeThinking?: string;
    enableThinking?: boolean;
    onReroll?: () => void;
  }) {
    const [activeIdx, setActiveIdx] = useState(() => {
      const last = group.messages[group.messages.length - 1];
      if (last && last.id < 0) return group.messages.length - 1;
      const mainIdx = group.messages.findIndex((m) => m.is_main);
      return mainIdx >= 0 ? mainIdx : group.messages.length - 1;
    });
    const variantCount = group.messages.length;

    useEffect(() => {
      const last = group.messages[variantCount - 1];
      // Streaming temp placeholder (negative id) → show it, not is_main
      if (last && last.id < 0) {
        setActiveIdx(variantCount - 1);
        return;
      }
      const mainIdx = group.messages.findIndex((m) => m.is_main);
      setActiveIdx(mainIdx >= 0 ? mainIdx : variantCount - 1);
    }, [variantCount, group.messages]);

    const safeIdx = Math.max(0, Math.min(variantCount - 1, activeIdx));
    const activeMessage =
      group.messages[safeIdx] ?? group.messages[variantCount - 1];

    const onRerollRef = useRef(onReroll);
    const safeIdxRef = useRef(safeIdx);
    const variantCountRef = useRef(variantCount);
    const groupRef = useRef(group);
    const chatIdRef = useRef(chatId);

    useEffect(() => {
      onRerollRef.current = onReroll;
      safeIdxRef.current = safeIdx;
      variantCountRef.current = variantCount;
      groupRef.current = group;
      chatIdRef.current = chatId;
    });

    const syncVariantToServer = useCallback((newIdx: number) => {
      const g = groupRef.current;
      const cId = chatIdRef.current;
      if (!g.isBot || g.messages.length <= 1 || !cId) return;
      const chosen = g.messages[newIdx];
      if (!chosen) return;
      // Commit the choice locally too, otherwise the group's is_main-based
      // reset effect snaps the display back to the old main (usually the
      // last variant) the moment a new message arrives.
      useChatStore.setState((s) => ({
        messages: s.messages.map((m) =>
          g.messages.some((gm) => gm.id === m.id)
            ? { ...m, is_main: m.id === chosen.id }
            : m,
        ),
      }));
      for (const msg of g.messages) {
        const isMain = msg.id === chosen.id;
        if (msg.is_main !== isMain) {
          setMessageMainState(cId, msg.id, isMain).catch(() => {});
        }
      }
    }, []);

    const goNext = useCallback(() => {
      if (safeIdxRef.current >= variantCountRef.current - 1) {
        onRerollRef.current?.();
      } else {
        const newIdx = Math.min(variantCountRef.current - 1, safeIdxRef.current + 1);
        setActiveIdx(newIdx);
        syncVariantToServer(newIdx);
      }
    }, [syncVariantToServer]);

    const goPrev = useCallback(() => {
      const newIdx = Math.max(0, safeIdxRef.current - 1);
      setActiveIdx(newIdx);
      syncVariantToServer(newIdx);
    }, [syncVariantToServer]);

    useEffect(() => {
      if (!group.isBot || group.messages.length <= 1) return;
      const allIds = group.messages.map((m) => m.id);
      const chosenId = group.messages[safeIdx]?.id;
      if (chosenId !== undefined) {
        useChatStore.getState().setChosenVariant(allIds, chosenId);
      }
    }, [safeIdx, group.isBot, group.messages]);

    const panGesture = useMemo(
      () =>
        Gesture.Pan()
          .activeOffsetX([-10, 10])
          .failOffsetY([-10, 10])
          .onEnd((event) => {
            if (event.translationX < -60) {
              scheduleOnRN(goNext);
            } else if (event.translationX > 60) {
              scheduleOnRN(goPrev);
            }
          }),
      [goNext, goPrev],
    );

    const isLastVariant = safeIdx >= variantCount - 1;

    if (group.isBot) {
      const showVariantUI = isLast;

      return (
        <View>
          {showVariantUI ? (
            <GestureDetector gesture={panGesture}>
              <View>
                <ChatBubble
                  message={activeMessage}
                  isUser={false}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onMessageLongPress={onMessageLongPress}
                  editingMessageId={editingMessageId}
                  onEditingDone={onEditingDone}
                  personaName={personaName}
                  characterChatName={characterChatName}
                  personaPronouns={personaPronouns}
                  characterAvatar={characterAvatar}
                  personaAvatar={personaAvatar}
                  activeThinking={activeThinking}
                  enableThinking={enableThinking}
                />
              </View>
            </GestureDetector>
          ) : (
            <ChatBubble
              message={
                group.messages.find((m) => m.is_main) ??
                group.messages[group.messages.length - 1]
              }
              isUser={false}
              onEdit={onEdit}
              onDelete={onDelete}
              onMessageLongPress={onMessageLongPress}
              editingMessageId={editingMessageId}
              onEditingDone={onEditingDone}
              personaName={personaName}
              characterChatName={characterChatName}
              personaPronouns={personaPronouns}
              characterAvatar={characterAvatar}
              personaAvatar={personaAvatar}
              enableThinking={enableThinking}
            />
          )}
          {showVariantUI && (
            <View style={styles.variantNav}>
              {variantCount > 1 && (
                <Pressable
                  onPress={goPrev}
                  disabled={safeIdx <= 0}
                  style={[
                    styles.variantBtn,
                    safeIdx <= 0 && styles.variantBtnDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.variantBtnText,
                      safeIdx <= 0 && styles.variantBtnTextDisabled,
                    ]}
                  >
                    {"\u2190"}
                  </Text>
                </Pressable>
              )}
              {variantCount > 1 && (
                <>
                  <Text style={styles.variantCount}>
                    {safeIdx + 1} / {variantCount}
                  </Text>
                  <Pressable
                    onPress={isLastVariant ? () => onReroll?.() : goNext}
                    style={styles.variantBtn}
                  >
                    <Text style={styles.variantBtnText}>{"\u2192"}</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        </View>
      );
    }

    const userMsg = group.messages[0];
    return (
      <ChatBubble
        message={userMsg}
        isUser={true}
        onEdit={onEdit}
        onDelete={onDelete}
        onMessageLongPress={onMessageLongPress}
        editingMessageId={editingMessageId}
        onEditingDone={onEditingDone}
        personaName={personaName}
        characterChatName={characterChatName}
        personaPronouns={personaPronouns}
        characterAvatar={characterAvatar}
        personaAvatar={personaAvatar}
      />
    );
  },
  (prev, next) => {
    if (prev.group.key !== next.group.key) return false;
    if (prev.isLast !== next.isLast) return false;
    if (prev.activeThinking !== next.activeThinking) return false;
    if (prev.editingMessageId !== next.editingMessageId) return false;
    if (prev.enableThinking !== next.enableThinking) return false;

    // Check message content changes for ALL groups — not just isLast.
    // Without this, editing a non-last message never shows the update.
    const prevLen = prev.group.messages.length;
    const nextLen = next.group.messages.length;
    if (prevLen !== nextLen) return false;
    for (let i = 0; i < prevLen; i++) {
      if (prev.group.messages[i]?.message !== next.group.messages[i]?.message)
        return false;
      if (i < prevLen && prev.group.messages[i]?.is_main !== next.group.messages[i]?.is_main)
        return false;
    }

    return true;
  },
);

export default function MessageList({
  messages,
  isLoading,
  currentUserId,
  chatId,
  onEdit,
  onDelete,
  onMessageLongPress,
  editingMessageId,
  onEditingDone,
  personaName,
  characterChatName,
  personaPronouns,
  characterAvatar,
  personaAvatar,
  activeThinking,
  enableThinking,
  onReroll,
}: {
  messages: ChatMessage[];
  isLoading: boolean;
  currentUserId: string | undefined;
  chatId?: number;
  onEdit: (messageId: number, newContent: string) => void;
  onDelete: (messageId: number) => void;
  onMessageLongPress?: (message: ChatMessage) => void;
  editingMessageId?: number | null;
  onEditingDone?: () => void;
  personaName?: string;
  characterChatName?: string;
  personaPronouns?: Pronouns | null;
  characterAvatar?: string;
  personaAvatar?: string;
  activeThinking?: string;
  enableThinking?: boolean;
  onReroll?: () => void;
}) {
  const listRef = useRef<FlashListRef<MessageGroup>>(null);
  const didInitialScrollRef = useRef(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNearBottomRef = useRef(true);

  const groups = useMemo(() => groupMessages(messages), [messages]);

  useEffect(() => {
    if (isLoading) {
      didInitialScrollRef.current = false;
    }
  }, [isLoading]);

  const scrollToBottom = useCallback(() => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: 9999999, animated: false });
    }, 50);
  }, []);

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - contentOffset.y - layoutMeasurement.height;
      isNearBottomRef.current = distanceFromBottom < 200;
    },
    [],
  );

  const handleContentSizeChange = useCallback(() => {
    if (!didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      scrollToBottom();
      setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: 9999999, animated: false });
      }, 300);
      return;
    }
    // Only auto-scroll when user is following the conversation (near bottom).
    // Prevents yanking user back to bottom when they scroll up through
    // older messages and FlashList item recycling triggers size re-measurements.
    if (isNearBottomRef.current) {
      scrollToBottom();
    }
  }, [scrollToBottom]);

    const renderItem = useCallback(
    ({ item, index }: { item: MessageGroup; index: number }) => {
      const isLast = index === groups.length - 1;
      return (
        <MessageGroupRenderer
          group={item}
          isLast={isLast}
          chatId={chatId}
          onEdit={onEdit}
          onDelete={onDelete}
          onMessageLongPress={onMessageLongPress}
          editingMessageId={editingMessageId}
          onEditingDone={onEditingDone}
          personaName={personaName}
          characterChatName={characterChatName}
          personaPronouns={personaPronouns}
          characterAvatar={characterAvatar}
          personaAvatar={personaAvatar}
          activeThinking={isLast ? activeThinking : undefined}
          enableThinking={enableThinking}
          onReroll={onReroll}
        />
      );
    },
    [
      groups.length,
      chatId,
      onEdit,
      onDelete,
      onMessageLongPress,
      editingMessageId,
      onEditingDone,
      personaName,
      characterChatName,
      personaPronouns,
      characterAvatar,
      personaAvatar,
      activeThinking,
      enableThinking,
      onReroll,
    ],
  );

  if (isLoading) {
    return (
      <Skeleton
        name="message-list"
        loading
        animate="shimmer"
        fallback={
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        }
      >
        <View style={styles.flashlist}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <View style={[styles.skeletonAvatar, i % 2 === 0 && styles.skeletonAvatarRight]} />
              <View style={[styles.skeletonBubble, i % 2 === 0 && styles.skeletonBubbleRight]} />
            </View>
          ))}
        </View>
      </Skeleton>
    );
  }

  return (
    <FlashList
      ref={listRef}
      data={groups}
      renderItem={renderItem}
      keyExtractor={(item) => item.key}
      getItemType={(item) => (item.isBot ? "bot" : "user")}
      contentContainerStyle={styles.list}
      onContentSizeChange={handleContentSizeChange}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      style={styles.flashlist}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingVertical: 12,
    flexGrow: 1,
  },
  flashlist: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  skeletonAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border,
  },
  skeletonAvatarRight: {
    marginLeft: "auto",
  },
  skeletonBubble: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.border,
    maxWidth: "70%",
  },
  skeletonBubbleRight: {
    marginLeft: "auto",
  },
  variantNav: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  variantBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  variantBtnDisabled: {
    opacity: 0.3,
  },
  variantBtnText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "600",
  },
  variantBtnTextDisabled: {
    color: colors.textDimAlt,
  },
  variantCount: {
    color: colors.textDim,
    fontSize: 12,
  },
  rerollBtnText: {
    color: colors.warning,
    fontSize: 18,
  },
});
