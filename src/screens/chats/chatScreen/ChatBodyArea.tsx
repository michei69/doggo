import React from "react";
import {
  Platform,
  KeyboardAvoidingView,
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import MessageList from "../../../components/chat/MessageList";
import ChatInput from "../../../components/chat/ChatInput";
import EmptyState from "../../../components/common/EmptyState";
import type { ChatMessage, Pronouns } from "../../../types/api";
import { colors } from "../../../utils/colors";

const ChatBodyArea = React.memo(
  function ChatBodyArea({
    flags,
    error,
    onRetry,
    chatId,
    messages,
    currentUserId,
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
    onReroll,
    onSend,
    onCancel,
    keyboardHeight,
  }: {
    flags: {
      isLoading: boolean;
      isSending: boolean;
      isGenerating: boolean;
      disabled: boolean;
      isTablet: boolean;
      chatCentered: boolean;
      enableThinking: boolean;
    };
    error: string | null;
    onRetry: () => void;
    chatId: number;
    messages: ChatMessage[];
    currentUserId: string | undefined;
    onEdit: (messageId: number, newContent: string) => void;
    onDelete: (messageId: number) => void;
    onMessageLongPress: (message: ChatMessage) => void;
    editingMessageId: number | null;
    onEditingDone: () => void;
    personaName: string;
    characterChatName: string;
    personaPronouns: Pronouns | null | undefined;
    characterAvatar: string;
    personaAvatar: string;
    activeThinking: string;
    onReroll: () => void;
    onSend: (content: string) => void;
    onCancel: () => void;
    keyboardHeight: number;
  }) {
    const {
      isLoading,
      isSending,
      isGenerating,
      disabled,
      isTablet,
      chatCentered,
      enableThinking,
    } = flags;
    const content = (
      <>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
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
        ) : !isLoading && messages.length === 0 ? (
          <EmptyState
            title={characterChatName}
            text={`Say hello to ${characterChatName}`}
            containerStyle={styles.emptyContainer}
            titleStyle={styles.emptyTitle}
          />
        ) : (
          <MessageList
            messages={messages}
            isLoading={isLoading}
            currentUserId={currentUserId}
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
            activeThinking={activeThinking}
            enableThinking={enableThinking}
            onReroll={onReroll}
          />
        )}
        <ChatInput
          onSend={onSend}
          isSending={isSending}
          isGenerating={isGenerating}
          onCancel={onCancel}
          disabled={disabled}
        />
      </>
    );
    return Platform.OS === "ios" ? (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <View
          style={isTablet && chatCentered ? styles.chatCentered : { flex: 1 }}
        >
          {content}
        </View>
      </KeyboardAvoidingView>
    ) : (
      <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
        <View
          style={isTablet && chatCentered ? styles.chatCentered : { flex: 1 }}
        >
          {content}
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  chatCentered: {
    flex: 1,
    width: "100%",
    maxWidth: 700,
    alignSelf: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
  },
  emptyTitle: {
    color: colors.textDim,
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
  },
  retryBtn: {
    backgroundColor: colors.card,
    paddingHorizontal: 20,
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
});

export default ChatBodyArea;
