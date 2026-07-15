import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import { StreamdownText } from "react-native-streamdown";
import TypingDots from "./TypingDots";
import Avatar from "../common/Avatar";
import AvatarPreview from "../common/AvatarPreview";
import type { ChatMessage } from "../../types/api";
import type { Pronouns } from "../../types/api";
import { replaceTags } from "../../utils/markdown";
import { markdownStyle, userMarkdownStyle } from "../../utils/markdownStyle";
import { useNavigateToJanitorLink } from "../../utils/janitorLinks";
import { useChatStore } from "../../stores/chatStore";
import { colors } from "../../utils/colors";

const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/g;
export function extractThinking(content: string): {
  thinking: string;
  rest: string;
} {
  const thinking: string[] = [];
  const cleaned = content.replace(thinkingRegex, (_match, p1: string) => {
    thinking.push(p1.trim());
    return "";
  });
  return { thinking: thinking.join("\n\n"), rest: cleaned.trim() };
}

export default React.memo(function ChatBubble({
  message,
  isUser,
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
}: {
  message: ChatMessage;
  isUser: boolean;
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
}) {
  const chatLayout = useChatStore((s) => s.chatLayout);
  const isJanitor = chatLayout === "janitor";
  const isEdgeToEdge = chatLayout === "edgeToEdge";
  const showTimestamps = useChatStore((s) => s.showTimestamps);

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [thinkingExpanded, setThinkingExpanded] = useState(false);
  const [preview, setPreview] = useState<{ uri: string; name: string } | null>(
    null,
  );
  const inputRef = useRef<TextInput>(null);
  const onLinkPress = useNavigateToJanitorLink();

  useEffect(() => {
    if (editingMessageId === message.id) {
      setEditContent(message.message);
      setEditing(true);
    } else if (editing) {
      setEditing(false);
    }
  }, [editingMessageId, editing, message]);

  useEffect(() => {
    if (editing) {
      const id = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(id);
    }
  }, [editing]);

  const handleSaveEdit = useCallback(() => {
    if (editContent.trim() && editContent !== message.message) {
      onEdit(message.id, editContent.trim());
    }
    setEditing(false);
    onEditingDone?.();
  }, [editContent, message.message, message.id, onEdit, onEditingDone]);

  const handleCancelEdit = useCallback(() => {
    setEditing(false);
    onEditingDone?.();
  }, [onEditingDone]);

  const rawContent = message.message ?? "";
  const isEmpty = !rawContent || rawContent.trim() === "";

  const { thinking: messageThinking } = useMemo(() => {
    if (isEmpty || isUser) return { thinking: "", rest: "" };
    return extractThinking(
      replaceTags(rawContent, personaName, characterChatName, personaPronouns),
    );
  }, [rawContent, isEmpty, isUser, personaName, characterChatName, personaPronouns]);

  const thinkingContent = activeThinking || messageThinking;
  const showThinking = !isUser && !!thinkingContent && enableThinking;
  const displayContent = useMemo(() => {
    if (isEmpty || isUser)
      return replaceTags(rawContent, personaName, characterChatName, personaPronouns);
    return extractThinking(
      replaceTags(rawContent, personaName, characterChatName, personaPronouns),
    ).rest;
  }, [rawContent, isEmpty, isUser, personaName, characterChatName, personaPronouns]);

  const avatarUri = isUser ? personaAvatar : characterAvatar;
  const avatarName = isUser
    ? (personaName ?? "You")
    : (characterChatName ?? "Character");
  const openPreview = () => {
    if (avatarUri) setPreview({ uri: avatarUri, name: avatarName });
  };

  const messageBubble = (
    <Pressable
      onLongPress={() => (!isEmpty ? onMessageLongPress?.(message) : undefined)}
      style={({ pressed }) => [
        styles.container,
        isEdgeToEdge
          ? styles.edgeToEdgeBubble
          : isJanitor
            ? styles.janitorBubble
            : isUser
              ? styles.userBubble
              : styles.botBubble,
        pressed && !isEmpty && { opacity: 0.8 },
      ]}
    >
      {editing ? (
        <View style={styles.editContainer}>
          <TextInput
            ref={inputRef}
            value={editContent}
            onChangeText={setEditContent}
            multiline
            style={styles.editInput}
            autoFocus
          />
          <View style={styles.editActions}>
            <Pressable onPress={handleCancelEdit} style={styles.editBtn}>
              <Text style={styles.cancelEditText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSaveEdit}
              style={[styles.editBtn, styles.saveBtn]}
            >
              <Text style={styles.saveEditText}>Save</Text>
            </Pressable>
          </View>
        </View>
      ) : isEmpty && !isUser ? (
        <TypingDots />
      ) : (
        <View>
          <StreamdownText
            markdown={displayContent}
            markdownStyle={isUser && chatLayout === "messaging" ? userMarkdownStyle : markdownStyle}
            selectable={false}
            onLinkPress={onLinkPress}
          />
          {showTimestamps ? (
            <Text style={styles.time}>
              {new Date(message.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );

  const thinkingBlock = showThinking ? (
    <View style={[styles.thinkingBox, styles.thinkingBoxBot]}>
      <Pressable
        onPress={() => setThinkingExpanded((e) => !e)}
        style={({ pressed }) => [
          styles.thinkingHeader,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={styles.thinkingLabel}>Thinking</Text>
        <Text style={styles.thinkingChevron}>
          {thinkingExpanded ? "▲" : "▼"}
        </Text>
      </Pressable>
      {thinkingExpanded ? (
        <View style={styles.thinkingContent}>
          <Text style={styles.thinkingText}>{thinkingContent}</Text>
        </View>
      ) : (
        <View style={styles.thinkingContent}>
          <Text style={styles.thinkingText} numberOfLines={1}>
            {thinkingContent}
          </Text>
        </View>
      )}
    </View>
  ) : null;

  const previewEl = (
    <AvatarPreview
      visible={preview !== null}
      uri={preview?.uri ?? ""}
      onClose={() => setPreview(null)}
    />
  );

  if (isJanitor) {
    return (
      <>
        <View style={styles.janitorRow}>
          <Avatar
            uri={avatarUri}
            name={avatarName}
            size={40}
            onPress={openPreview}
          />
          <View style={styles.janitorContent}>
            <Text style={styles.janitorName}>{avatarName}</Text>
            {thinkingBlock}
            {messageBubble}
          </View>
        </View>
        {previewEl}
      </>
    );
  }

  if (isEdgeToEdge) {
    return (
      <>
        <View>
          <View style={[styles.avatarRow, styles.avatarRowLeft]}>
            <Avatar
              uri={avatarUri}
              name={avatarName}
              size={24}
              onPress={openPreview}
            />
            <Text style={styles.avatarName}>{avatarName}</Text>
          </View>
          {thinkingBlock}
          {messageBubble}
        </View>
        {previewEl}
      </>
    );
  }

  return (
    <>
      <View>
        <View
          style={[
            styles.avatarRow,
            !isUser ? styles.avatarRowLeft : styles.avatarRowRight,
          ]}
        >
          <Avatar
            uri={avatarUri}
            name={avatarName}
            size={24}
            onPress={openPreview}
          />
          <Text style={styles.avatarName}>{avatarName}</Text>
        </View>
        {thinkingBlock}
        {messageBubble}
      </View>
      {previewEl}
    </>
  );
});

const styles = StyleSheet.create({
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 2,
  },
  avatarRowLeft: {
    alignSelf: "flex-start",
  },
  avatarRowRight: {
    alignSelf: "flex-end",
  },
  avatarName: {
    color: colors.textFaint,
    fontSize: 16,
  },
  thinkingBox: {
    maxWidth: "85%",
    borderRadius: 12,
    marginVertical: 2,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  thinkingBoxBot: {
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thinkingHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  thinkingLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  thinkingChevron: {
    color: colors.accent,
    fontSize: 10,
  },
  thinkingContent: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  thinkingText: {
    color: colors.textPlaceholder,
    fontSize: 13,
    lineHeight: 18,
  },
  container: {
    maxWidth: "85%",
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
    marginHorizontal: 16,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  janitorBubble: {
    alignSelf: "stretch",
    maxWidth: "100%",
    marginHorizontal: 0,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  edgeToEdgeBubble: {
    alignSelf: "stretch",
    maxWidth: "100%",
    marginHorizontal: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  janitorRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  janitorContent: {
    flex: 1,
  },
  janitorName: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  time: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    marginTop: 4,
    textAlign: "right",
  },
  editContainer: {
    minWidth: 200,
  },
  editInput: {
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.overlayLight,
    borderRadius: 8,
    padding: 8,
    maxHeight: 200,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 8,
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  cancelEditText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
  },
  saveEditText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
});
