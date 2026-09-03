import { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import ChatSettingsOverlay from "../../components/chat/ChatSettingsOverlay";
import ChatSummaryModal from "../../components/chat/ChatSummaryModal";
import MessagesActionsSheet from "../../components/chat/MessagesActionsSheet";
import PersonaPicker from "../../components/chat/PersonaPicker";
import CustomAlert from "../../components/common/CustomAlert";
import { colors } from "../../utils/colors";
import { useChatScreen } from "./chatScreen/useChatScreen";
import ChatScreenHeader from "./chatScreen/ChatScreenHeader";
import ProxyBanner from "./chatScreen/ProxyBanner";
import LocalModeBanner from "./chatScreen/LocalModeBanner";
import ChatBodyArea from "./chatScreen/ChatBodyArea";
import ChatMessageActions from "./chatScreen/ChatMessageActions";
import AllChatsSheet from "./chatScreen/AllChatsSheet";
import SystemPromptModal from "./chatScreen/SystemPromptModal";

export default function ChatScreen() {
  const {
    chatId,
    characterName,
    characterId,
    handleGoBack,
    handleOpenSettings,
    proxyBlocked,
    localMode,
    localModeBannerDismissed,
    handleLocalModeBannerDismiss,
    error,
    handleRetry,
    messages,
    isLoadingMessages,
    handleEdit,
    handleMessageLongPress,
    editingMessageId,
    handleEditingDone,
    personaName,
    characterChatName,
    personaPronouns,
    characterAvatar,
    personaAvatar,
    activeThinking,
    enableThinking,
    handleSwipeReroll,
    handleSend,
    isSending,
    isGenerating,
    cancelGeneration,
    isTablet,
    chatCentered,
    keyboardHeight,
    settingsVisible,
    handleSettingsClose,
    chatSummaryVisible,
    handleChatSummaryOpen,
    handleChatSummaryClose,
    chatSummaryDraft,
    handleChatSummaryDraftChange,
    chatSummaryLoading,
    chatSummarySaving,
    handleChatSummarySave,
    handleChatSummaryGenerateFromChat,
    handleChatSummaryGenerateFromLastMessage,
    canGenerateChatSummaryFromLastMessage,
    creatorId,
    creatorName,
    allowProxy,
    handleNewChatFromCog,
    handleAllChats,
    handleMessagesActionsOpen,
    handleDeleteChatFromCog,
    handleViewSystemPrompt,
    handleAttemptViewSystemPrompt,
    messagesActionsVisible,
    handleMessagesActionsClose,
    handleExport,
    handleImport,
    handleReset,
    actionsTarget,
    isLastMessage,
    handleActionsClose,
    handleCopyMessage,
    handleActionsEdit,
    handleReformat,
    handleRerollMessage,
    handleFork,
    handleReroll,
    handleActionsDelete,
    newChatPickerVisible,
    handleNewChatPickerClose,
    handleNewChatPersonaSelect,
    deleteAlert,
    dismissAlert,
    allChatsVisible,
    handleAllChatsClose,
    handleAllChatsBack,
    allChatsLoading,
    allChats,
    handleAllChatSelect,
    systemPrompt,
    handleSystemPromptClose,
  } = useChatScreen();

  const bodyFlags = useMemo(
    () => ({
      isLoading: isLoadingMessages,
      isSending,
      isGenerating,
      disabled: proxyBlocked,
      isTablet,
      chatCentered,
      enableThinking,
    }),
    [
      isLoadingMessages,
      isSending,
      isGenerating,
      proxyBlocked,
      isTablet,
      chatCentered,
      enableThinking,
    ],
  );

  return (
    <View style={styles.container}>
      <ChatScreenHeader
        title={characterName}
        onBack={handleGoBack}
        onOpenSettings={handleOpenSettings}
      />
      {proxyBlocked && <ProxyBanner />}
      {localMode && !localModeBannerDismissed && (
        <LocalModeBanner onDismiss={handleLocalModeBannerDismiss} />
      )}
      <ChatBodyArea
        flags={bodyFlags}
        error={error}
        onRetry={handleRetry}
        chatId={chatId}
        messages={messages}
        onEdit={handleEdit}
        onMessageLongPress={handleMessageLongPress}
        editingMessageId={editingMessageId}
        onEditingDone={handleEditingDone}
        personaName={personaName}
        characterChatName={characterChatName}
        personaPronouns={personaPronouns}
        characterAvatar={characterAvatar}
        personaAvatar={personaAvatar}
        activeThinking={activeThinking}
        onReroll={handleSwipeReroll}
        onSend={handleSend}
        onCancel={cancelGeneration}
        keyboardHeight={keyboardHeight}
      />

      <ChatSettingsOverlay
        visible={settingsVisible}
        onClose={handleSettingsClose}
        characterName={characterName}
        characterId={characterId}
        creatorId={creatorId}
        creatorName={creatorName}
        allowProxy={allowProxy}
        onNewChat={handleNewChatFromCog}
        onAllChats={handleAllChats}
        onMessagesActions={handleMessagesActionsOpen}
        onDeleteChat={handleDeleteChatFromCog}
        onViewSystemPrompt={handleViewSystemPrompt}
        onAttemptViewSystemPrompt={handleAttemptViewSystemPrompt}
        onChatSummary={handleChatSummaryOpen}
      />

      <ChatSummaryModal
        visible={chatSummaryVisible}
        summary={chatSummaryDraft}
        onChangeSummary={handleChatSummaryDraftChange}
        onClose={handleChatSummaryClose}
        onSave={handleChatSummarySave}
        saving={chatSummarySaving}
        loading={chatSummaryLoading}
        canGenerateFromLastMessage={canGenerateChatSummaryFromLastMessage}
        onGenerateFromChat={handleChatSummaryGenerateFromChat}
        onGenerateFromLastMessage={handleChatSummaryGenerateFromLastMessage}
      />

      <MessagesActionsSheet
        visible={messagesActionsVisible}
        onClose={handleMessagesActionsClose}
        onExport={handleExport}
        onImport={handleImport}
        onReset={handleReset}
      />

      <ChatMessageActions
        visible={actionsTarget !== null}
        actionsTarget={actionsTarget}
        isLastMessage={isLastMessage}
        onClose={handleActionsClose}
        onCopy={handleCopyMessage}
        onEdit={handleActionsEdit}
        onReformat={handleReformat}
        onRerollMessage={handleRerollMessage}
        onFork={handleFork}
        onReroll={handleReroll}
        onDelete={handleActionsDelete}
      />

      <PersonaPicker
        visible={newChatPickerVisible}
        onClose={handleNewChatPickerClose}
        onSelect={handleNewChatPersonaSelect}
        characterName={characterName}
      />

      <CustomAlert
        visible={deleteAlert.visible}
        title={deleteAlert.title}
        message={deleteAlert.message}
        buttons={deleteAlert.buttons}
        onDismiss={dismissAlert}
      />

      <AllChatsSheet
        visible={allChatsVisible}
        onClose={handleAllChatsClose}
        onBack={handleAllChatsBack}
        characterName={characterName}
        loading={allChatsLoading}
        chats={allChats}
        onSelectChat={handleAllChatSelect}
      />

      <SystemPromptModal
        visible={systemPrompt.visible}
        content={systemPrompt.content}
        botPersonality={systemPrompt.botPersonality}
        scenario={systemPrompt.scenario}
        loading={systemPrompt.loading}
        error={systemPrompt.error}
        onClose={handleSystemPromptClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
