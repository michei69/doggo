import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Dispatch, SetStateAction } from "react";
import { colors } from "../../../utils/colors";
import type { PromptLibraryItem, ProxyEditForm } from "./types";

export default function ProxyEditModal({
  visible,
  form,
  setForm,
  showApiKey,
  setShowApiKey,
  saving,
  prompts,
  onCancel,
  onSave,
  onOpenPromptSelector,
  keyboardHeight,
  isCreating,
}: {
  visible: boolean;
  form: ProxyEditForm;
  setForm: Dispatch<SetStateAction<ProxyEditForm>>;
  showApiKey: boolean;
  setShowApiKey: Dispatch<SetStateAction<boolean>>;
  saving: boolean;
  prompts: PromptLibraryItem[];
  onCancel: () => void;
  onSave: () => void;
  onOpenPromptSelector: () => void;
  keyboardHeight: number;
  isCreating: boolean;
}) {
  const selectedPromptName =
    prompts.find((p) => p.id === form.prompt_id)?.name ?? null;

  const formBody = (
    <ScrollView
      style={styles.modalScroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.editLabel}>Name</Text>
      <TextInput
        style={styles.editInput}
        value={form.name}
        onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
        placeholderTextColor={colors.textDimAlt}
      />
      <Text style={styles.editLabel}>Model</Text>
      <TextInput
        style={styles.editInput}
        value={form.model}
        onChangeText={(v) => setForm((f) => ({ ...f, model: v }))}
        placeholderTextColor={colors.textDimAlt}
      />
      <Text style={styles.editLabel}>Proxy URL</Text>
      <TextInput
        style={styles.editInput}
        value={form.api_url}
        onChangeText={(v) => setForm((f) => ({ ...f, api_url: v }))}
        placeholderTextColor={colors.textDimAlt}
        autoCapitalize="none"
      />
      <Text style={styles.editLabel}>API Key</Text>
      <View style={styles.passwordRow}>
        <TextInput
          style={[styles.editInput, { flex: 1, marginBottom: 0 }]}
          value={form.api_key}
          onChangeText={(v) => setForm((f) => ({ ...f, api_key: v }))}
          placeholderTextColor={colors.textDimAlt}
          secureTextEntry={!showApiKey}
          autoCapitalize="none"
        />
        <Pressable
          onPress={() => setShowApiKey((s) => !s)}
          style={styles.showPassBtn}
        >
          <Text style={styles.showPassText}>
            {showApiKey ? "\u25C9" : "\u25CE"}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.editLabel}>Prompt</Text>
      <Pressable style={styles.promptSelectRow} onPress={onOpenPromptSelector}>
        <Text style={styles.promptSelectName} numberOfLines={1}>
          {selectedPromptName ?? "None"}
        </Text>
        <Text style={styles.promptSelectChange}>Change</Text>
      </Pressable>
    </ScrollView>
  );

  const actions = (
    <View style={styles.modalActions}>
      <Pressable style={styles.modalCancelBtn} onPress={onCancel}>
        <Text style={styles.modalCancelText}>Cancel</Text>
      </Pressable>
      <Pressable
        style={[styles.modalSaveBtn, saving && { opacity: 0.6 }]}
        onPress={onSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.text} size="small" />
        ) : (
          <Text style={styles.modalSaveText}>
            {isCreating ? "Create" : "Save"}
          </Text>
        )}
      </Pressable>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      {Platform.OS === "ios" ? (
        <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
          <Pressable
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
            onPress={onCancel}
          >
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <Text style={styles.modalTitle}>
                {isCreating ? "New Proxy" : "Edit Proxy"}
              </Text>
              {formBody}
              {actions}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      ) : (
        <View style={[styles.modalOverlay, { paddingBottom: keyboardHeight }]}>
          <Pressable
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
            onPress={onCancel}
          >
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <Text style={styles.modalTitle}>
                {isCreating ? "New Proxy" : "Edit Proxy"}
              </Text>
              {formBody}
              {actions}
            </Pressable>
          </Pressable>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    width: "90%",
    maxHeight: "80%",
    padding: 20,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  modalScroll: { maxHeight: "100%" },
  editLabel: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    marginTop: 10,
  },
  editInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  showPassBtn: {
    padding: 8,
  },
  showPassText: { color: colors.textFaint, fontSize: 18 },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalSaveText: { color: colors.text, fontSize: 15, fontWeight: "700" },
  promptSelectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  promptSelectName: {
    color: colors.text,
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  promptSelectChange: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
});
