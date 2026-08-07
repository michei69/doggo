import { useState, useCallback, useEffect, useRef, useEffectEvent } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import Avatar from "../../components/common/Avatar";
import CustomAlert from "../../components/common/CustomAlert";
import { avatarUrl } from "../../utils/assets";
import { colors } from "../../utils/colors";
import {
  updateMainPersona,
  createPersona,
  updatePersona,
  uploadFile,
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
import {
  registerSheet,
  updateSheet,
  unregisterSheet,
} from "../../stores/sheetStore";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";
import { useAlert } from "../../hooks/useAlert";

const EMPTY_PRONOUNS: Pronouns = {
  subjective: "",
  objective: "",
  possessive: "",
  possessivePronoun: "",
  reflexive: "",
};

const PRONOUN_PRESETS: Record<string, Pronouns> = {
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
        <Text style={styles.avatarBadgeText}>
          {uploading ? "..." : "Edit"}
        </Text>
      </View>
    </Pressable>
  );
}

function SheetActions({
  saving,
  uploading,
  onCancel,
  onSave,
}: {
  saving: boolean;
  uploading: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <View style={styles.modalActions}>
      <Pressable
        onPress={onCancel}
        style={({ pressed }) => [
          styles.modalCancelBtn,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={styles.modalCancelText}>Cancel</Text>
      </Pressable>
      <Pressable
        onPress={onSave}
        disabled={saving || uploading}
        style={({ pressed }) => [
          styles.modalSaveBtn,
          pressed && { opacity: 0.7 },
          (saving || uploading) && { opacity: 0.5 },
        ]}
      >
        {saving ? (
          <ActivityIndicator color={colors.text} size="small" />
        ) : (
          <Text style={styles.modalSaveText}>Save</Text>
        )}
      </Pressable>
    </View>
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

function PersonaSheetContent({
  mode,
  persona,
  profile,
  personaGroups,
  onClose,
  onSaved,
  onDeleteRequested,
  keyboardHeight,
  windowHeight,
  isTablet,
  sheetInset,
  translateY,
  backdropOpacity,
  animateIn,
  animateOut,
}: {
  mode: "create" | "edit" | "editMain";
  persona?: Persona;
  profile?: UserProfile | null;
  personaGroups: PersonaGroup[];
  onClose: () => void;
  onSaved: () => void;
  onDeleteRequested: (personaId: string) => void;
  keyboardHeight: number;
  windowHeight: number;
  isTablet: boolean;
  sheetInset: number;
  translateY: ReturnType<typeof useSharedValue<number>>;
  backdropOpacity: ReturnType<typeof useSharedValue<number>>;
  animateIn: () => void;
  animateOut: (onFinish: () => void) => void;
}) {
  const isMainPersona = mode === "editMain";
  const editingId = mode === "edit" ? persona?.id ?? null : null;
  const { alert, showAlert, dismissAlert } = useAlert();

  const [form, setForm] = useState<PersonaForm>(() =>
    initialFormValue(mode, persona, profile),
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const pronounPresetKey = form.pronounPreset;

  const handleCancel = useCallback(() => {
    animateOut(() => {
      onClose();
    });
  }, [onClose, animateOut]);

  const handlePickAndUploadAvatar = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAlert("Permission needed", "Allow access to photos to change your avatar.", [
        { text: "OK", onPress: dismissAlert },
      ]);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 256, height: 256 } }],
        { format: ImageManipulator.SaveFormat.WEBP, compress: 0.85 },
      );

      scheduleOnRN(() => {
        requestAnimationFrame(() => animateIn());
      });

      const upload = await uploadFile("webp", "avatar");

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", upload.url);
        xhr.setRequestHeader("Content-Type", "image/webp");
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`HTTP ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send({
          uri: manipResult.uri,
          type: "image/webp",
          name: "avatar.webp",
        } as any);
      });
      setForm((f) => ({ ...f, avatar: upload.filename }));
    } catch {
      showAlert("Error", "Failed to upload avatar", [{ text: "OK", onPress: dismissAlert }]);
    } finally {
      setUploading(false);
    }
  }, [animateIn, showAlert, dismissAlert]);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      showAlert("Error", "Name is required", [{ text: "OK", onPress: dismissAlert }]);
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

      animateOut(() => {
        onSaved();
      });
    } catch {
      showAlert("Error", "Failed to save persona", [{ text: "OK", onPress: dismissAlert }]);
    } finally {
      setSaving(false);
    }
  }, [form, isMainPersona, editingId, onSaved, animateOut, showAlert, dismissAlert]);

  const handleDelete = useCallback(() => {
    if (!editingId) return;
    onDeleteRequested(editingId);
  }, [editingId, onDeleteRequested]);

  const rContainerStyle = useAnimatedStyle(() => ({
    pointerEvents:
      backdropOpacity.value > 0.01 ? ("auto" as const) : ("none" as const),
  }));

  const rBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const rSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const sheetStaticStyle = {
    maxHeight: windowHeight * 0.9,
    ...(isTablet && {
      marginLeft: sheetInset,
      marginRight: sheetInset,
    }),
  };

  return (
    <Animated.View style={[styles.container, rContainerStyle]}>
      <Animated.View style={[styles.backdrop, rBackdropStyle]} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Animated.View style={[styles.sheet, rSheetStyle, sheetStaticStyle]}>
          <Text style={styles.modalTitle}>
            {isMainPersona
              ? "Edit Main Persona"
              : editingId
                ? "Edit Persona"
                : "Create Persona"}
          </Text>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={[
              styles.modalScrollInner,
              Platform.OS === "android" && {
                paddingBottom: keyboardHeight + 40,
              },
            ]}
            keyboardShouldPersistTaps="handled"
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
                onGroupIdChange={(groupId) =>
                  setForm((f) => ({ ...f, groupId }))
                }
              />
            )}

            {!isMainPersona && (
              <PronounsFormSection
                pronouns={form.pronouns}
                preset={pronounPresetKey}
                onPresetChange={(preset) =>
                  setForm((f) => ({ ...f, pronounPreset: preset }))
                }
                onPronounsChange={(pronouns) =>
                  setForm((f) => ({ ...f, pronouns }))
                }
              />
            )}
          </ScrollView>

          <SheetActions
            saving={saving}
            uploading={uploading}
            onCancel={handleCancel}
            onSave={handleSave}
          />
          {mode === "edit" && editingId && (
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [
                styles.modalDeleteBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.modalDeleteText}>Delete Persona</Text>
            </Pressable>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        onDismiss={dismissAlert}
      />
    </Animated.View>
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
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const isTablet = Math.min(windowWidth, windowHeight) >= 600;
  const sheetInset = isTablet ? windowWidth * 0.1 : 0;
  const translateY = useSharedValue(windowHeight);
  const backdropOpacity = useSharedValue(0);
  const isClosing = useSharedValue(false);
  const keyboardHeight = useKeyboardHeight();

  const windowHeightRef = useRef(windowHeight);

  useEffect(() => {
    windowHeightRef.current = windowHeight;
  });

  const animateIn = useCallback(() => {
    "worklet";
    const h = windowHeightRef.current;
    cancelAnimation(translateY);
    cancelAnimation(backdropOpacity);
    translateY.value = h;
    translateY.value = withSpring(0, {
      damping: 24,
      stiffness: 200,
      mass: 0.8,
    });
    backdropOpacity.value = withTiming(1, { duration: 200 });
  }, [backdropOpacity, translateY]);

  const animateOut = useCallback((onFinish: () => void) => {
    "worklet";
    if (isClosing.value) return;
    isClosing.value = true;
    const h = windowHeightRef.current;
    cancelAnimation(translateY);
    cancelAnimation(backdropOpacity);
    translateY.value = withTiming(h, { duration: 250 });
    backdropOpacity.value = withTiming(0, { duration: 250 }, () => {
      scheduleOnRN(onFinish);
    });
  }, [backdropOpacity, isClosing, translateY]);

  const animateInEvent = useEffectEvent(animateIn);

  const prevVisible = useRef(false);
  useEffect(() => {
    if (visible && !prevVisible.current) {
      // Opening
      isClosing.value = false;
      translateY.value = windowHeightRef.current;
      backdropOpacity.value = 0;
      requestAnimationFrame(() => animateInEvent());
    } else if (!visible && prevVisible.current) {
      // Closing
      animateOut(() => {
        onClose();
      });
    }
    prevVisible.current = visible;
  }, [visible, animateOut, backdropOpacity, isClosing, onClose, translateY]);

  const overlay = (
    <PersonaSheetContent
      key={`${mode}-${persona?.id ?? ""}`}
      mode={mode}
      persona={persona}
      profile={profile}
      personaGroups={personaGroups}
      onClose={onClose}
      onSaved={onSaved}
      onDeleteRequested={onDeleteRequested}
      keyboardHeight={keyboardHeight}
      windowHeight={windowHeight}
      isTablet={isTablet}
      sheetInset={sheetInset}
      translateY={translateY}
      backdropOpacity={backdropOpacity}
      animateIn={animateIn}
      animateOut={animateOut}
    />
  );

  // Register with portal so the sheet renders above the tab bar
  const portalKeyRef = useRef(-1);

  useEffect(() => {
    if (portalKeyRef.current < 0) {
      portalKeyRef.current = registerSheet(visible, onClose, overlay, true);
    }
    updateSheet(portalKeyRef.current, visible, onClose, overlay, true);
  });

  useEffect(() => {
    const key = portalKeyRef.current;
    return () => {
      if (key >= 0) unregisterSheet(key);
    };
  }, []);

  return null;
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlayDark,
  },
  keyboardView: {
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  modalScroll: { maxHeight: "100%" },
  modalScrollInner: { paddingBottom: 16 },

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

  modalActions: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
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
    paddingVertical: 14,
    alignItems: "center",
  },
  modalSaveText: { color: colors.text, fontSize: 15, fontWeight: "600" },

  groupDot: { width: 10, height: 10, borderRadius: 5 },

  modalDeleteBtn: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: "center" as const,
  },
  modalDeleteText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "600",
  },
});
