import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput as RNTextInput,
} from "react-native";
import { colors } from "../../utils/colors";
import {
  createPersonaGroup,
  updatePersonaGroup,
} from "../../api/profile";
import type { PersonaGroup } from "../../types/api";
import { useAlert } from "../../hooks/useAlert";
import FormSheet from "../../components/common/FormSheet";
import type { FormSheetHandle } from "../../components/common/FormSheet";

const GROUP_COLORS = [
  "#7c5ce7",
  "#e74c3c",
  "#2ecc71",
  "#f39c12",
  "#3498db",
  "#e91e63",
  "#00bcd4",
  "#ff9800",
];

type GroupForm = Pick<PersonaGroup, "name" | "description" | "color">;

function initialGroupForm(group?: PersonaGroup): GroupForm {
  if (group) {
    return {
      name: group.name,
      description: group.description,
      color: group.color,
    };
  }
  return { name: "", description: "", color: GROUP_COLORS[0] };
}

export default function PersonaGroupSheet({
  visible,
  group,
  onClose,
  onSaved,
  onDeleteRequested,
}: {
  visible: boolean;
  group?: PersonaGroup;
  onClose: () => void;
  onSaved: () => void;
  onDeleteRequested: (groupId: string) => void;
}) {
  const sheetRef = useRef<FormSheetHandle>(null);
  const editingId = group?.id ?? null;
  const { alert, showAlert, dismissAlert } = useAlert();

  const [form, setForm] = useState<GroupForm>(() => initialGroupForm(group));
  const [saving, setSaving] = useState(false);

  const handleCancel = useCallback(() => {
    sheetRef.current?.close(onClose);
  }, [onClose]);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        description: form.description.trim(),
        color: form.color,
      };
      if (editingId) {
        await updatePersonaGroup(editingId, data);
      } else {
        await createPersonaGroup(data);
      }

      sheetRef.current?.close(onSaved);
    } catch {
      showAlert("Error", "Failed to save group", [{ text: "OK", onPress: dismissAlert }]);
    } finally {
      setSaving(false);
    }
  }, [form, editingId, onSaved, showAlert, dismissAlert]);

  const handleDelete = useCallback(() => {
    if (!editingId) return;
    onDeleteRequested(editingId);
  }, [editingId, onDeleteRequested]);

  return (
    <FormSheet
      ref={sheetRef}
      visible={visible}
      title={editingId ? "Edit Group" : "Create Group"}
      onClose={onClose}
      onCancel={handleCancel}
      onSave={handleSave}
      saving={saving}
      saveLabel={editingId ? "Save" : "Create"}
      deleteLabel={editingId ? "Delete Group" : undefined}
      onDelete={handleDelete}
      alert={{
        visible: alert.visible,
        title: alert.title,
        message: alert.message,
        buttons: alert.buttons,
        onDismiss: dismissAlert,
      }}
    >
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Name</Text>
        <RNTextInput
          style={styles.formInput}
          placeholder="Group name"
          placeholderTextColor={colors.textPlaceholder}
          value={form.name}
          onChangeText={(v) =>
            setForm((f) => ({
              ...f,
              name: v,
            }))
          }
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Description</Text>
        <RNTextInput
          style={styles.formInput}
          placeholder="Group description"
          placeholderTextColor={colors.textPlaceholder}
          value={form.description}
          onChangeText={(v) =>
            setForm((f) => ({
              ...f,
              description: v,
            }))
          }
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Color</Text>
        <View style={styles.colorRow}>
          {GROUP_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() =>
                setForm((f) => ({
                  ...f,
                  color: c,
                }))
              }
              style={[
                styles.colorSwatch,
                { backgroundColor: c },
                form.color === c && styles.colorSwatchActive,
              ]}
            />
          ))}
        </View>
      </View>
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  formGroup: { marginBottom: 16 },
  formLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: colors.text,
  },
});
