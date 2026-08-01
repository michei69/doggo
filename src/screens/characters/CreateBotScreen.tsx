import { useCallback } from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import ScreenHeader from "../../components/common/ScreenHeader";
import TextInput from "../../components/common/TextInput";
import { botAvatarUrl } from "../../utils/assets";
import { colors } from "../../utils/colors";
import CustomAlert from "../../components/common/CustomAlert";
import { useNavigateToJanitorLink } from "../../utils/janitorLinks";
import { useCreateBotForm } from "./createBot/useCreateBotForm";
import {
  BotRefreshControl,
  AvatarPickerMemo,
  MultilineFieldMemo,
  FirstMessageEditorMemo,
  ContentRatingToggleMemo,
  TagEditorMemo,
  SaveBarMemo,
  PreviewModalMemo,
} from "./createBot/fields";

export default function CreateBotScreen() {
  const onLinkPress = useNavigateToJanitorLink();

  const {
    addCustomTag,
    addFirstMessage,
    alertButtons,
    alertMessage,
    alertTitle,
    alertVisible,
    closePreview,
    firstMsgIndex,
    filteredTags,
    form,
    goBack,
    goToNextFirstMessage,
    goToPrevFirstMessage,
    handleDeleteFirstMessage,
    handlePickAndUploadAvatar,
    handlePreviewFirstMessage,
    handleRefresh,
    handleReset,
    handleSave,
    isEditMode,
    keyboardHeight,
    loaded,
    previewVisible,
    refreshing,
    removeCustomTag,
    saving,
    selectLimited,
    selectLimitless,
    selectedTagIdsSet,
    setAlertVisible,
    setField,
    setTagSearch,
    tagSearch,
    toggleTag,
    updateFirstMessage,
    uploading,
  } = useCreateBotForm();

  const onDescriptionChange = useCallback(
    (v: string) => setField("description", v),
    [setField],
  );
  const onPersonalityChange = useCallback(
    (v: string) => setField("personality", v),
    [setField],
  );
  const onScenarioChange = useCallback(
    (v: string) => setField("scenario", v),
    [setField],
  );
  const onExampleDialogsChange = useCallback(
    (v: string) => setField("example_dialogs", v),
    [setField],
  );

  const refreshControl = (
    <BotRefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
    />
  );

  if (!loaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={isEditMode ? "Edit Bot" : "Create Bot"}
        onBack={goBack}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            Platform.OS === "android" && { paddingBottom: keyboardHeight + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          <AvatarPickerMemo
            uri={form.avatar ? botAvatarUrl(form.avatar) : ""}
            name={form.name}
            uploading={uploading}
            onPress={handlePickAndUploadAvatar}
          />
          <TextInput
            label="Name"
            value={form.name}
            onChangeText={(v) => setField("name", v)}
            placeholder="Character name"
          />
          <TextInput
            label="Chat Name (optional)"
            value={form.chat_name}
            onChangeText={(v) => setField("chat_name", v)}
            placeholder="Name shown in chat"
          />
          <MultilineFieldMemo
            label="Description"
            value={form.description}
            placeholder="Describe the character..."
            onChangeText={onDescriptionChange}
          />
          <MultilineFieldMemo
            label="Personality"
            value={form.personality}
            placeholder="Character personality traits..."
            onChangeText={onPersonalityChange}
          />
          <MultilineFieldMemo
            label="Scenario"
            value={form.scenario}
            placeholder="Roleplay scenario..."
            onChangeText={onScenarioChange}
          />
          <MultilineFieldMemo
            label="Example Dialogs"
            value={form.example_dialogs}
            placeholder="{{char}}: ...\n{{user}}: ..."
            onChangeText={onExampleDialogsChange}
          />
          <FirstMessageEditorMemo
            value={form.first_messages[firstMsgIndex] ?? ""}
            index={firstMsgIndex}
            count={form.first_messages.length}
            onChange={updateFirstMessage}
            onPreview={handlePreviewFirstMessage}
            onAdd={addFirstMessage}
            onDelete={handleDeleteFirstMessage}
            onPrev={goToPrevFirstMessage}
            onNext={goToNextFirstMessage}
          />
          <ContentRatingToggleMemo
            isNsfw={form.is_nsfw}
            onSelectLimited={selectLimited}
            onSelectLimitless={selectLimitless}
          />
          <TagEditorMemo
            customTags={form.custom_tags}
            selectedCount={form.tag_ids.length}
            tagSearch={tagSearch}
            selectedTagIdsSet={selectedTagIdsSet}
            filteredTags={filteredTags}
            onRemoveTag={removeCustomTag}
            onAddTag={addCustomTag}
            onToggleTag={toggleTag}
            onSearchChange={setTagSearch}
          />
          <SaveBarMemo
            isEditMode={isEditMode}
            saving={saving}
            onSave={handleSave}
            onReset={handleReset}
          />
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        buttons={alertButtons}
        onDismiss={() => setAlertVisible(false)}
      />

      <PreviewModalMemo
        visible={previewVisible}
        message={form.first_messages[firstMsgIndex] ?? ""}
        index={firstMsgIndex}
        onClose={closePreview}
        onLinkPress={onLinkPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  bottomSpacer: {
    height: 40,
  },
});
