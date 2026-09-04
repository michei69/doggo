import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput as RNTextInput,
} from "react-native";
import { pickAndUploadAvatar } from "../../api/uploads";
import Avatar from "../../components/common/Avatar";
import { avatarUrl } from "../../utils/assets";
import { colors } from "../../utils/colors";
import {
  updateMainPersona,
  createPersona,
  updatePersona,
} from "../../api/profile";
import type {
  Persona,
  PersonaGroup,
  Pronouns,
  UserProfile,
  CreatePersonaRequest,
  UpdatePersonaRequest,
} from "../../types/api";
import { scheduleOnRN } from "react-native-worklets";
import { useAlert } from "../../hooks/useAlert";
import FormSheet from "../../components/common/FormSheet";
import type { FormSheetHandle } from "../../components/common/FormSheet";

const EMPTY_PRONOUNS: Pronouns = {
  subjective: "",
  objective: "",
  possessive: "",
  possessivePronoun: "",
  reflexive: "",
};

interface PronounPresetMap {
  [key: string]: Pronouns;
}

const PRONOUN_PRESETS: PronounPresetMap = {
  "he/him": {
    subjective: "he",
    objective: "him",
    possessive: "his",
    possessivePronoun: "his",
    reflexive: "himself",
  },
  "she/her": {
    subjective: "she",
    objective: "her",
    possessive: "her",
    possessivePronoun: "hers",
    reflexive: "herself",
  },
  "they/them": {
    subjective: "they",
    objective: "them",
    possessive: "their",
    possessivePronoun: "theirs",
    reflexive: "themselves",
  },
};

function pronounExample(p: Pronouns): string {
  if (!p.subjective) return "";
  return `${p.subjective} blamed ${p.reflexive} for losing ${p.objective}. ${p.possessive} mistake cost a point, but ${p.possessivePronoun} cost the game.`;
}

function matchPronounPreset(p: Pronouns): string {
  for (const [key, pr] of Object.entries(PRONOUN_PRESETS)) {
    if (
      pr.subjective === p.subjective &&
      pr.objective === p.objective &&
      pr.possessive === p.possessive &&
      pr.possessivePronoun === p.possessivePronoun &&
      pr.reflexive === p.reflexive
    ) {
      return key;
    }
  }
  return "Custom";
}

interface PersonaForm {
  name: string;
  appearance: string;
  avatar: string;
  groupId: string;
  pronounPreset: string;
  pronouns: Pronouns;
}

function initialFormValue(
  mode: "create" | "edit" | "editMain",
  persona?: Persona,
  profile?: UserProfile | null,
): PersonaForm {
  if (mode === "editMain" && profile) {
    return {
      name: profile.name || "",
      appearance: profile.profile || "",
      avatar: profile.avatar || "",
      groupId: "",
      pronounPreset: "None",
      pronouns: { ...EMPTY_PRONOUNS },
    };
  }
  if (mode === "edit" && persona) {
    const hasPronouns = !!persona.pronouns?.subjective;
    const pronouns = persona.pronouns
      ? { ...persona.pronouns }
      : { ...EMPTY_PRONOUNS };
    return {
      name: persona.name || "",
      appearance: persona.appearance || "",
      avatar: persona.avatar || "",
      groupId: persona.groupId || "",
      pronounPreset: hasPronouns ? matchPronounPreset(pronouns) : "None",
      pronouns,
    };
  }
  return {
    name: "",
    appearance: "",
    avatar: "",
    groupId: "",
    pronounPreset: "None",
    pronouns: { ...EMPTY_PRONOUNS },
  };
}

function AvatarField({
  avatar,
  name,
  uploading,
  onPress,
}: {
  avatar: string;
  name: string;
  uploading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.avatarWrapper}>
      {avatar ? (
        <Avatar uri={avatarUrl(avatar)} name={name} size={80} />
      ) : (
        <Avatar name={name} size={80} />
      )}
      <View style={styles.avatarBadge}>
        <Text style={styles.avatarBadgeText}>{uploading ? "..." : "Edit"}</Text>
      </View>
    </Pressable>
  );
}

function GroupField({
  personaGroups,
  groupId,
  onGroupIdChange,
}: {
  personaGroups: PersonaGroup[];
  groupId: string;
  onGroupIdChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>Group</Text>
      {personaGroups.length === 0 ? (
        <Text style={styles.dropdownEmpty}>
          No groups: create one in the Groups tab
        </Text>
      ) : (
        <View>
          <Pressable
            onPress={() => setOpen(!open)}
            style={[styles.dropdown, open && styles.dropdownOpen]}
          >
            <Text style={styles.dropdownText} numberOfLines={1}>
              {groupId
                ? (personaGroups.find((g) => g.id === groupId)?.name ?? "None")
                : "None"}
            </Text>
            <Text style={styles.dropdownArrow}>{open ? "▲" : "▼"}</Text>
          </Pressable>
          {open && (
            <View style={styles.dropdownOptions}>
              <Pressable
                onPress={() => {
                  onGroupIdChange("");
                  setOpen(false);
                }}
                style={[
                  styles.dropdownOption,
                  groupId === "" && styles.dropdownOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    groupId === "" && styles.dropdownOptionTextActive,
                  ]}
                >
                  None
                </Text>
              </Pressable>
              {personaGroups.map((g) => (
                <Pressable
                  key={g.id}
                  onPress={() => {
                    onGroupIdChange(g.id);
                    setOpen(false);
                  }}
                  style={[
                    styles.dropdownOption,
                    groupId === g.id && styles.dropdownOptionActive,
                  ]}
                >
                  <View
                    style={[styles.groupDot, { backgroundColor: g.color }]}
                  />
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      groupId === g.id && styles.dropdownOptionTextActive,
                    ]}
                  >
                    {g.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function PronounsFormSection({
  pronouns,
  preset,
  onPresetChange,
  onPronounsChange,
}: {
  pronouns: Pronouns;
  preset: string;
  onPresetChange: (preset: string) => void;
  onPronounsChange: (pronouns: Pronouns) => void;
}) {
  return (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>Pronouns</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dropdownScroll}
      >
        {["None", "he/him", "she/her", "they/them", "Custom"].map((opt) => (
          <Pressable
            key={opt}
            onPress={() => {
              if (opt === "Custom") {
                onPresetChange("Custom");
              } else if (opt === "None") {
                onPresetChange("None");
                onPronounsChange({ ...EMPTY_PRONOUNS });
              } else {
                onPresetChange(opt);
                onPronounsChange({ ...PRONOUN_PRESETS[opt] });
              }
            }}
            style={[
              styles.dropdownItem,
              preset === opt && styles.dropdownItemActive,
            ]}
          >
            <Text
              style={[
                styles.dropdownItemText,
                preset === opt && styles.dropdownItemTextActive,
              ]}
            >
              {opt}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {preset !== "None" && (
        <Text style={styles.pronounExample}>
          {pronounExample(
            preset === "Custom" ? pronouns : PRONOUN_PRESETS[preset],
          )}
        </Text>
      )}

      {preset === "Custom" && (
        <View style={styles.pronounsGrid}>
          {[
            { key: "subjective", label: "Subjective" } as const,
            { key: "objective", label: "Objective" } as const,
            { key: "possessive", label: "Possessive" } as const,
            {
              key: "possessivePronoun",
              label: "Poss. Pronoun",
            } as const,
            { key: "reflexive", label: "Reflexive" } as const,
          ].map(({ key, label }) => (
            <View key={key} style={styles.pronounField}>
              <Text style={styles.pronounLabel}>{label}</Text>
              <RNTextInput
                style={styles.pronounInput}
                placeholder={label}
                placeholderTextColor={colors.textPlaceholder}
                value={pronouns[key]}
                onChangeText={(v) =>
                  onPronounsChange({
                    ...pronouns,
                    [key]: v,
                  })
                }
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function PersonaSheet({
  visible,
  mode,
  persona,
  profile,
  personaGroups,
  onClose,
  onSaved,
  onDeleteRequested,
}: {
  visible: boolean;
  mode: "create" | "edit" | "editMain";
  persona?: Persona;
  profile?: UserProfile | null;
  personaGroups: PersonaGroup[];
  onClose: () => void;
  onSaved: () => void;
  onDeleteRequested: (personaId: string) => void;
}) {
  const sheetRef = useRef<FormSheetHandle>(null);
  const isMainPersona = mode === "editMain";
  const editingId = mode === "edit" ? (persona?.id ?? null) : null;
  const { alert, showAlert, dismissAlert } = useAlert();

  const [form, setForm] = useState<PersonaForm>(() =>
    initialFormValue(mode, persona, profile),
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const pronounPresetKey = form.pronounPreset;

  const handleCancel = useCallback(() => {
    sheetRef.current?.close(onClose);
  }, [onClose]);

  const handlePickAndUploadAvatar = useCallback(async () => {
    setUploading(true);
    try {
      const result = await pickAndUploadAvatar("avatar", "avatar.webp", () => {
        scheduleOnRN(() => {
          requestAnimationFrame(() => sheetRef.current?.animateIn());
        });
      });
      if (result.status === "denied") {
        showAlert(
          "Permission needed",
          "Allow access to photos to change your avatar.",
          [{ text: "OK", onPress: dismissAlert }],
        );
        return;
      }
      if (result.status === "cancelled") return;
      setForm((f) => ({ ...f, avatar: result.filename }));
    } catch {
      showAlert("Error", "Failed to upload avatar", [
        { text: "OK", onPress: dismissAlert },
      ]);
    } finally {
      setUploading(false);
    }
  }, [showAlert, dismissAlert]);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      showAlert("Error", "Name is required", [
        { text: "OK", onPress: dismissAlert },
      ]);
      return;
    }
    setSaving(true);
    try {
      const pronouns = form.pronouns.subjective ? form.pronouns : null;

      if (isMainPersona) {
        await updateMainPersona({
          name: form.name.trim(),
          avatar: form.avatar.trim(),
          profile: form.appearance.trim(),
        });
      } else if (editingId) {
        const body: Partial<UpdatePersonaRequest> = {
          name: form.name.trim(),
          appearance: form.appearance.trim(),
          avatar: form.avatar.trim(),
          id: editingId,
        };
        if (form.groupId) body.groupId = form.groupId;
        if (pronouns) body.pronouns = pronouns;
        await updatePersona(editingId, body);
      } else {
        const body: Partial<CreatePersonaRequest> = {
          name: form.name.trim(),
          appearance: form.appearance.trim(),
          avatar: form.avatar.trim(),
        };
        if (form.groupId) body.groupId = form.groupId;
        if (pronouns) body.pronouns = pronouns;
        await createPersona(body);
      }

      sheetRef.current?.close(onSaved);
    } catch {
      showAlert("Error", "Failed to save persona", [
        { text: "OK", onPress: dismissAlert },
      ]);
    } finally {
      setSaving(false);
    }
  }, [form, isMainPersona, editingId, onSaved, showAlert, dismissAlert]);

  const handleDelete = useCallback(() => {
    if (!editingId) return;
    onDeleteRequested(editingId);
  }, [editingId, onDeleteRequested]);

  const title = isMainPersona
    ? "Edit Main Persona"
    : editingId
      ? "Edit Persona"
      : "Create Persona";

  return (
    <FormSheet
      ref={sheetRef}
      visible={visible}
      title={title}
      onClose={onClose}
      onCancel={handleCancel}
      onSave={handleSave}
      saving={saving}
      saveDisabled={uploading}
      deleteLabel={editingId ? "Delete Persona" : undefined}
      onDelete={handleDelete}
      alert={{
        visible: alert.visible,
        title: alert.title,
        message: alert.message,
        buttons: alert.buttons,
        onDismiss: dismissAlert,
      }}
    >
      <AvatarField
        avatar={form.avatar}
        name={form.name}
        uploading={uploading}
        onPress={handlePickAndUploadAvatar}
      />

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Name</Text>
        <RNTextInput
          style={styles.formInput}
          placeholder="Persona name"
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
        <Text style={styles.formLabel}>Appearance</Text>
        <RNTextInput
          style={[styles.formInput, styles.formInputMultiline]}
          placeholder="Describe how this persona looks and acts"
          placeholderTextColor={colors.textPlaceholder}
          value={form.appearance}
          onChangeText={(v) =>
            setForm((f) => ({
              ...f,
              appearance: v,
            }))
          }
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {!isMainPersona && (
        <GroupField
          personaGroups={personaGroups}
          groupId={form.groupId}
          onGroupIdChange={(groupId) => setForm((f) => ({ ...f, groupId }))}
        />
      )}

      {!isMainPersona && (
        <PronounsFormSection
          pronouns={form.pronouns}
          preset={pronounPresetKey}
          onPresetChange={(preset) =>
            setForm((f) => ({ ...f, pronounPreset: preset }))
          }
          onPronounsChange={(pronouns) => setForm((f) => ({ ...f, pronouns }))}
        />
      )}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  avatarWrapper: { alignSelf: "center", marginBottom: 16 },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: -4,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  avatarBadgeText: { color: colors.text, fontSize: 10, fontWeight: "700" },

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
  formInputMultiline: { minHeight: 100, paddingTop: 12 },

  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomColor: colors.accent,
  },
  dropdownText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 15,
  },
  dropdownArrow: {
    color: colors.textFaint,
    fontSize: 12,
    marginLeft: 8,
  },
  dropdownOptions: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.accent,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    overflow: "hidden",
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dropdownOptionActive: {
    backgroundColor: colors.accentFaded,
  },
  dropdownOptionText: {
    color: colors.textFaint,
    fontSize: 14,
    fontWeight: "500",
  },
  dropdownOptionTextActive: {
    color: colors.accent,
    fontWeight: "600",
  },

  dropdownScroll: { gap: 8 },
  dropdownEmpty: { color: colors.textDim, fontSize: 13 },
  dropdownItem: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdownItemActive: {
    backgroundColor: colors.accentFaded,
    borderColor: colors.accent,
  },
  dropdownItemText: {
    color: colors.textFaint,
    fontSize: 13,
    fontWeight: "500",
  },
  dropdownItemTextActive: { color: colors.accent, fontWeight: "600" },

  pronounExample: {
    color: colors.textDim,
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 18,
  },
  pronounsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pronounField: { width: "48%", flexGrow: 1 },
  pronounLabel: { color: colors.textDim, fontSize: 11, marginBottom: 4 },
  pronounInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },

  groupDot: { width: 10, height: 10, borderRadius: 5 },
});
