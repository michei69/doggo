import { useCallback, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createPrompt, deletePrompt, updatePrompt } from "../../../api/settings";
import { colors } from "../../../utils/colors";
import type { PromptEditForm, PromptLibraryItem, ShowAlert } from "./types";

export default function PromptSelectorModal({
  visible,
  prompts,
  setPrompts,
  selectedPromptId,
  onSelect,
  onClose,
  showAlert,
}: {
  visible: boolean;
  prompts: PromptLibraryItem[];
  setPrompts: Dispatch<SetStateAction<PromptLibraryItem[]>>;
  selectedPromptId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
  showAlert: ShowAlert;
}) {
  type PromptMode = "list" | "editing" | "creating";
  const [mode, setMode] = useState<PromptMode>("list");
  const editingIdRef = useRef<string | null>(null);
  const [form, setForm] = useState<PromptEditForm>({ name: "", content: "" });
  const [formSaving, setFormSaving] = useState(false);

  const openCreate = useCallback(() => {
    setForm({ name: "", content: "" });
    editingIdRef.current = null;
    setMode("creating");
  }, []);

  const openEditPrompt = useCallback((prompt: PromptLibraryItem) => {
    setForm({ name: prompt.name, content: prompt.content });
    editingIdRef.current = prompt.id;
    setMode("editing");
  }, []);

  const goBackToList = useCallback(() => {
    setMode("list");
    editingIdRef.current = null;
  }, []);

  const handleSaveForm = useCallback(async () => {
    if (!form.name.trim()) return;
    setFormSaving(true);
    try {
      if (mode === "creating") {
        const created = await createPrompt({
          content: form.content,
          kind: "system",
          name: form.name.trim(),
        });
        setPrompts((prev) => [...prev, created]);
        onSelect(created.id);
        setMode("list");
      } else if (mode === "editing" && editingIdRef.current) {
        const editingId = editingIdRef.current;
        const updated = await updatePrompt(editingId, {
          content: form.content,
          name: form.name.trim(),
        });
        setPrompts((prev) =>
          prev.map((p) => (p.id === editingId ? updated : p)),
        );
        setMode("list");
      }
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to save prompt", [
        { text: "OK" },
      ]);
    } finally {
      setFormSaving(false);
    }
  }, [mode, form, setPrompts, onSelect, showAlert]);

  const handleDeletePrompt = useCallback(
    (prompt: PromptLibraryItem) => {
      showAlert("Delete Prompt", `Delete "${prompt.name}"?`, [
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePrompt(prompt.id);
              setPrompts((prev) => prev.filter((p) => p.id !== prompt.id));
              if (selectedPromptId === prompt.id) onSelect(null);
            } catch (err: any) {
              showAlert("Error", err.message || "Failed to delete prompt", [
                { text: "OK" },
              ]);
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ]);
    },
    [showAlert, selectedPromptId, setPrompts, onSelect],
  );

  const isFormView = mode === "editing" || mode === "creating";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={isFormView ? goBackToList : onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          onPress={isFormView ? undefined : onClose}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.promptSelectorHeader}>
              <Pressable
                onPress={isFormView ? goBackToList : onClose}
                style={styles.promptSelectorBack}
              >
                <Text style={styles.promptSelectorBackText}>
                  {isFormView ? "\u2190" : "\u2715"}
                </Text>
              </Pressable>
              <Text
                style={[
                  styles.modalTitle,
                  { flex: 1, marginBottom: 0, textAlign: "center" },
                ]}
              >
                {mode === "creating"
                  ? "New Prompt"
                  : mode === "editing"
                    ? "Edit Prompt"
                    : "Select Prompt"}
              </Text>
              {mode === "list" ? (
                <Pressable
                  onPress={openCreate}
                  style={styles.promptSelectorAddBtn}
                >
                  <Text style={styles.promptSelectorAddText}>Add</Text>
                </Pressable>
              ) : (
                <View style={styles.promptSelectorBack} />
              )}
            </View>

            {isFormView ? (
              <ScrollView
                style={styles.modalScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.editLabel}>Name</Text>
                <TextInput
                  style={styles.editInput}
                  value={form.name}
                  onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                  placeholderTextColor={colors.textDimAlt}
                  placeholder="Prompt name..."
                />
                <Text style={styles.editLabel}>Content</Text>
                <TextInput
                  style={styles.editMultiline}
                  value={form.content}
                  onChangeText={(v) => setForm((f) => ({ ...f, content: v }))}
                  placeholderTextColor={colors.textDimAlt}
                  placeholder="Prompt content..."
                  multiline
                />
                <View style={[styles.modalActions, { marginBottom: 4 }]}>
                  <Pressable
                    style={styles.modalCancelBtn}
                    onPress={goBackToList}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalSaveBtn, formSaving && { opacity: 0.6 }]}
                    onPress={handleSaveForm}
                    disabled={formSaving}
                  >
                    {formSaving ? (
                      <ActivityIndicator color={colors.text} size="small" />
                    ) : (
                      <Text style={styles.modalSaveText}>
                        {mode === "creating" ? "Create" : "Save"}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            ) : (
              <ScrollView
                style={styles.modalScroll}
                showsVerticalScrollIndicator={false}
              >
                <Pressable
                  style={[
                    styles.promptItem,
                    selectedPromptId === null && styles.promptItemSelected,
                  ]}
                  onPress={() => {
                    onSelect(null);
                    onClose();
                  }}
                >
                  <Text style={styles.promptItemName}>None</Text>
                </Pressable>
                {prompts.map((p) => (
                  <View key={p.id} style={styles.promptItemRow}>
                    <Pressable
                      style={[
                        styles.promptItem,
                        { flex: 1, marginBottom: 0 },
                        selectedPromptId === p.id && styles.promptItemSelected,
                      ]}
                      onPress={() => {
                        onSelect(p.id);
                        onClose();
                      }}
                    >
                      <Text style={styles.promptItemName} numberOfLines={1}>
                        {p.name}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.promptItemActionBtn}
                      onPress={() => openEditPrompt(p)}
                    >
                      <Text style={styles.promptItemActionText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      style={styles.promptItemActionBtn}
                      onPress={() => handleDeletePrompt(p)}
                    >
                      <Text
                        style={[
                          styles.promptItemActionText,
                          { color: colors.danger },
                        ]}
                      >
                        Del
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </View>
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
  editMultiline: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: "top",
  },
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
  promptSelectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  promptSelectorBack: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  promptSelectorBackText: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: "600",
  },
  promptSelectorAddBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.accent,
    borderRadius: 6,
  },
  promptSelectorAddText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  promptItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  promptItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 4,
  },
  promptItemSelected: {
    backgroundColor: "rgba(124, 92, 231, 0.15)",
    borderColor: colors.accent,
  },
  promptItemName: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  promptItemActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promptItemActionText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
});
