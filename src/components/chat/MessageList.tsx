import React, {
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useState,
} from "react";
import { View, StyleSheet, Text, Pressable } from "react-native";
import type { DimensionValue } from "react-native";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Skeleton from "../common/Skeleton";
import ChatBubble from "./ChatBubble";
import type { ChatMessage } from "../../types/api";
import type { Pronouns } from "../../types/api";
import { colors } from "../../utils/colors";
import { useChatStore } from "../../stores/chatStore";
import { scheduleOnRN } from "react-native-worklets";
import { setMessageMainState } from "../../api/chats";

import { groupMessages, type MessageGroup } from "../../utils/messages";

const SKELETON_BUBBLE_HEIGHTS = [64, 96, 56, 120, 72, 88];
const SKELETON_BUBBLE_WIDTHS: DimensionValue[] = [
  "70%",
  "55%",
  "80%",
  "45%",
  "65%",
  "75%",
];

const MessagingSkeleton = React.memo(function MessagingSkeleton() {
  return (
    <View style={styles.flashlist}>
      {SKELETON_BUBBLE_HEIGHTS.map((h, i) => {
        const right = i % 2 === 1;
        return (
          <View
            key={i}
            style={[styles.skelGroup, right && styles.skelAlignEnd]}
          >
            <View style={[styles.skelAvatarRow, right && styles.skelAlignEnd]}>
              <View style={styles.skelAvatarXs} />
              <View style={styles.skelNameBar} />
            </View>
            <View
              style={[
                styles.skelMsgCard,
                {
                  width:
                    SKELETON_BUBBLE_WIDTHS[i % SKELETON_BUBBLE_WIDTHS.length],
                  height: h,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
});

const JanitorSkeleton = React.memo(function JanitorSkeleton() {
  return (
    <View style={styles.flashlist}>
      {SKELETON_BUBBLE_HEIGHTS.map((h, i) => (
        <View key={i} style={styles.skelJanitorRow}>
          <View style={styles.skelAvatarMd} />
          <View style={styles.skelJanitorContent}>
            <View style={styles.skelNameBold} />
            <View style={[styles.skelMsgCardFull, { height: h }]} />
          </View>
        </View>
      ))}
    </View>
  );
});

const EdgeToEdgeSkeleton = React.memo(function EdgeToEdgeSkeleton() {
  return (
    <View style={styles.flashlist}>
      {SKELETON_BUBBLE_HEIGHTS.map((h, i) => (
        <View key={i} style={styles.skelEdgeGroup}>
          <View style={styles.skelAvatarRow}>
            <View style={styles.skelAvatarXs} />
            <View style={styles.skelNameBar} />
          </View>
          <View
            style={[
              styles.skelMsgCardFull,
              { height: h, marginHorizontal: 12 },
            ]}
          />
        </View>
      ))}
    </View>
  );
});

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
        const newIdx = Math.min(
          variantCountRef.current - 1,
          safeIdxRef.current + 1,
        );
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
      if (
        i < prevLen &&
        prev.group.messages[i]?.is_main !== next.group.messages[i]?.is_main
      )
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
  const chatLayout = useChatStore((s) => s.chatLayout);
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
    (event: {
      nativeEvent: {
        contentOffset: { y: number };
        contentSize: { height: number };
        layoutMeasurement: { height: number };
      };
    }) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
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
      <Skeleton style={{ flex: 1 }}>
        {chatLayout === "janitor" ? (
          <JanitorSkeleton />
        ) : chatLayout === "edgeToEdge" ? (
          <EdgeToEdgeSkeleton />
        ) : (
          <MessagingSkeleton />
        )}
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
  skelGroup: {
    width: "100%",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  skelAlignEnd: {
    alignItems: "flex-end",
  },
  skelAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 2,
  },
  skelAvatarXs: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  skelNameBar: {
    width: 64,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.border,
  },
  skelMsgCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  skelJanitorRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  skelAvatarMd: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
  },
  skelJanitorContent: {
    flex: 1,
  },
  skelNameBold: {
    width: 90,
    height: 14,
    borderRadius: 7,
    marginBottom: 4,
    backgroundColor: colors.border,
  },
  skelMsgCardFull: {
    alignSelf: "stretch",
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  skelEdgeGroup: {
    marginBottom: 10,
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
