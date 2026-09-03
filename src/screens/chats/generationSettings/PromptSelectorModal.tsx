import React, { useCallback, useRef, useState } from "react";
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
import { FlashList } from "@shopify/flash-list";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import {
  createPrompt,
  deletePrompt,
  updatePrompt,
} from "../../../api/settings";
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
  dismissAlert,
}: {
  visible: boolean;
  prompts: PromptLibraryItem[];
  setPrompts: Dispatch<SetStateAction<PromptLibraryItem[]>>;
  selectedPromptId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
  showAlert: ShowAlert;
  dismissAlert: () => void;
}) {
  type PromptMode = "list" | "editing" | "creating";
  const [mode, setMode] = useState<PromptMode>("list");
  const editingIdRef = useRef<string | null>(null);
  const [form, setForm] = useState<PromptEditForm>({ name: "", content: "" });
  const [formSaving, setFormSaving] = useState(false);

  // Animates the form view sliding in (matches the modal open/close feel).
  const formAnim = useSharedValue(0);

  const openCreate = useCallback(() => {
    setForm({ name: "", content: "" });
    editingIdRef.current = null;
    setMode("creating");
    formAnim.value = withTiming(1, { duration: 200 });
  }, [formAnim]);

  const openEditPrompt = useCallback(
    (prompt: PromptLibraryItem) => {
      setForm({ name: prompt.name, content: prompt.content });
      editingIdRef.current = prompt.id;
      setMode("editing");
      formAnim.value = withTiming(1, { duration: 200 });
    },
    [formAnim],
  );

  const goBackToList = useCallback(() => {
    setMode("list");
    editingIdRef.current = null;
    formAnim.value = 0;
  }, [formAnim]);

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
        { text: "OK", onPress: dismissAlert },
      ]);
    } finally {
      setFormSaving(false);
    }
  }, [mode, form, setPrompts, onSelect, showAlert, dismissAlert]);

  const handleDeletePrompt = useCallback(
    (prompt: PromptLibraryItem) => {
      showAlert("Delete Prompt", `Delete "${prompt.name}"?`, [
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            dismissAlert();
            try {
              await deletePrompt(prompt.id);
              setPrompts((prev) => prev.filter((p) => p.id !== prompt.id));
              if (selectedPromptId === prompt.id) onSelect(null);
            } catch (err: any) {
              showAlert("Error", err.message || "Failed to delete prompt", [
                { text: "OK", onPress: dismissAlert },
              ]);
            }
          },
        },
        { text: "Cancel", style: "cancel", onPress: dismissAlert },
      ]);
    },
    [showAlert, dismissAlert, selectedPromptId, setPrompts, onSelect],
  );

  const promptKeyExtractor = useCallback((p: PromptLibraryItem) => p.id, []);

  const renderPromptItem = useCallback(
    ({ item: p }: { item: PromptLibraryItem }) => (
      <PromptRow
        prompt={p}
        selected={selectedPromptId === p.id}
        onSelect={() => {
          onSelect(p.id);
          onClose();
        }}
        onEdit={() => openEditPrompt(p)}
        onDelete={() => handleDeletePrompt(p)}
      />
    ),
    [selectedPromptId, onSelect, onClose, openEditPrompt, handleDeletePrompt],
  );

  const isFormView = mode === "editing" || mode === "creating";

  const formStyle = useAnimatedStyle(() => ({
    opacity: formAnim.value,
    transform: [
      {
        translateY: (1 - formAnim.value) * 24,
      },
    ],
  }));

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
              <Animated.View style={formStyle}>
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
                      style={[
                        styles.modalSaveBtn,
                        formSaving && { opacity: 0.6 },
                      ]}
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
              </Animated.View>
            ) : (
              <View style={styles.modalScroll}>
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
                <FlashList
                  data={prompts}
                  keyExtractor={promptKeyExtractor}
                  renderItem={renderPromptItem}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            )}
          </Pressable>
        </Pressable>
      </View>
    </Modal>
  );
}

const PromptRow = React.memo(function PromptRow({
  prompt,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: {
  prompt: PromptLibraryItem;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.promptItemRow}>
      <Pressable
        style={[
          styles.promptItem,
          styles.promptItemRowMain,
          selected && styles.promptItemSelected,
        ]}
        onPress={onSelect}
      >
        <Text style={styles.promptItemName} numberOfLines={2}>
          {prompt.name || "(unnamed)"}
        </Text>
      </Pressable>
      <Pressable style={styles.promptItemActionBtn} onPress={onEdit}>
        <Text style={styles.promptItemActionText}>Edit</Text>
      </Pressable>
      <Pressable style={styles.promptItemIconBtn} onPress={onDelete}>
        <Text style={styles.promptItemIconText}>{"\u{1F5D1}"}</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayStrong,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    width: "94%",
    maxHeight: "85%",
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
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  promptItemRowMain: {
    flex: 1,
    marginBottom: 0,
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
  promptItemIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  promptItemIconText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "600",
  },
});
