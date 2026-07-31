import { useState, useCallback, useEffect, useRef, useEffectEvent } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
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
import { colors } from "../../utils/colors";
import {
  createPersonaGroup,
  updatePersonaGroup,
} from "../../api/profile";
import type { PersonaGroup } from "../../types/api";
import { scheduleOnRN } from "react-native-worklets";
import {
  registerSheet,
  updateSheet,
  unregisterSheet,
} from "../../stores/sheetStore";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";

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

interface GroupForm {
  name: string;
  description: string;
  color: string;
}

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

function PersonaGroupContent({
  group,
  onClose,
  onSaved,
  onDeleteRequested,
  keyboardHeight,
  windowHeight,
  isTablet,
  sheetInset,
  translateY,
  backdropOpacity,
  animateOut,
}: {
  group?: PersonaGroup;
  onClose: () => void;
  onSaved: () => void;
  onDeleteRequested: (groupId: string) => void;
  keyboardHeight: number;
  windowHeight: number;
  isTablet: boolean;
  sheetInset: number;
  translateY: ReturnType<typeof useSharedValue<number>>;
  backdropOpacity: ReturnType<typeof useSharedValue<number>>;
  animateOut: (onFinish: () => void) => void;
}) {
  const editingId = group?.id ?? null;

  const [form, setForm] = useState<GroupForm>(() => initialGroupForm(group));
  const [saving, setSaving] = useState(false);

  const handleCancel = useCallback(() => {
    animateOut(() => {
      onClose();
    });
  }, [onClose, animateOut]);

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

      animateOut(() => {
        onSaved();
      });
    } catch {
      Alert.alert("Error", "Failed to save group");
    } finally {
      setSaving(false);
    }
  }, [form, editingId, onSaved, animateOut]);

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
    maxHeight: windowHeight * 0.9,
    ...(isTablet && {
      marginLeft: sheetInset,
      marginRight: sheetInset,
    }),
  }));

  return (
    <Animated.View style={[styles.container, rContainerStyle]}>
      <Animated.View style={[styles.backdrop, rBackdropStyle]} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Animated.View style={[styles.sheet, rSheetStyle]}>
          <ScrollView
            contentContainerStyle={
              Platform.OS === "android"
                ? { paddingBottom: keyboardHeight + 40 }
                : undefined
            }
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.modalTitle}>
              {editingId ? "Edit Group" : "Create Group"}
            </Text>

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

            <View style={styles.modalActions}>
              <Pressable
                onPress={handleCancel}
                style={({ pressed }) => [
                  styles.modalCancelBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={({ pressed }) => [
                  styles.modalSaveBtn,
                  pressed && { opacity: 0.7 },
                  saving && { opacity: 0.5 },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color={colors.text} size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>
                    {editingId ? "Save" : "Create"}
                  </Text>
                )}
              </Pressable>
            </View>
            {editingId && (
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => [
                  styles.modalDeleteBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.modalDeleteText}>Delete Group</Text>
              </Pressable>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
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
      isClosing.value = false;
      translateY.value = windowHeightRef.current;
      backdropOpacity.value = 0;
      requestAnimationFrame(() => animateInEvent());
    } else if (!visible && prevVisible.current) {
      animateOut(() => {
        onClose();
      });
    }
    prevVisible.current = visible;
  }, [visible, animateOut, backdropOpacity, isClosing, onClose, translateY]);

  const overlay = (
    <PersonaGroupContent
      key={group?.id ?? ""}
      group={group}
      onClose={onClose}
      onSaved={onSaved}
      onDeleteRequested={onDeleteRequested}
      keyboardHeight={keyboardHeight}
      windowHeight={windowHeight}
      isTablet={isTablet}
      sheetInset={sheetInset}
      translateY={translateY}
      backdropOpacity={backdropOpacity}
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
    return () => {
      if (portalKeyRef.current >= 0) unregisterSheet(portalKeyRef.current);
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
    zIndex: 1000,
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
