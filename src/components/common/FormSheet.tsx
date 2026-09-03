import type React from "react";
import { useEffect, useEffectEvent, useImperativeHandle, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { colors } from "../../utils/colors";
import {
  registerSheet,
  updateSheet,
  unregisterSheet,
} from "../../stores/sheetStore";
import { useSheetAnimation } from "../../hooks/useSheetAnimation";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";
import CustomAlert from "./CustomAlert";
import type { AlertButton } from "./CustomAlert";

export interface FormSheetHandle {
  /** Animates the sheet out, then calls `onFinish` (defaults to `onClose`). */
  close: (onFinish?: () => void) => void;
  /** Replays the enter animation (used to restore the sheet after a system overlay, e.g. image picker). */
  animateIn: () => void;
}

export default function FormSheet({
  ref,
  visible,
  title,
  onClose,
  onCancel,
  onSave,
  saveLabel = "Save",
  cancelLabel = "Cancel",
  saving = false,
  saveDisabled = false,
  deleteLabel,
  onDelete,
  alert,
  children,
}: {
  ref?: React.Ref<FormSheetHandle>;
  visible: boolean;
  title?: string;
  onClose: () => void;
  onCancel: () => void;
  onSave: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  saving?: boolean;
  saveDisabled?: boolean;
  deleteLabel?: string;
  onDelete?: () => void;
  alert?: {
    visible: boolean;
    title: string;
    message?: string;
    buttons: AlertButton[];
    onDismiss?: () => void;
  };
  children: React.ReactNode;
}) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const isTablet = Math.min(windowWidth, windowHeight) >= 600;
  const sheetInset = isTablet ? windowWidth * 0.1 : 0;
  const { translateY, backdropOpacity, isClosing, animateIn, animateOut } =
    useSheetAnimation(onClose);
  const keyboardHeight = useKeyboardHeight();

  const windowHeightRef = useRef(windowHeight);

  useEffect(() => {
    windowHeightRef.current = windowHeight;
  });

  useImperativeHandle(
    ref,
    () => ({
      close: (onFinish?: () => void) => {
        animateOut(onFinish);
      },
      animateIn: () => {
        animateIn();
      },
    }),
    [animateIn, animateOut],
  );

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
      animateOut();
    }
    prevVisible.current = visible;
  }, [visible, animateOut, backdropOpacity, isClosing, onClose, translateY]);

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

  const overlay = (
    <Animated.View style={[styles.container, rContainerStyle]}>
      <Animated.View style={[styles.backdrop, rBackdropStyle]} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Animated.View style={[styles.sheet, rSheetStyle, sheetStaticStyle]}>
          {title ? <Text style={styles.modalTitle}>{title}</Text> : null}

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
            {children}
          </ScrollView>

          <View style={styles.modalActions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.modalCancelBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.modalCancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onSave}
              disabled={saving || saveDisabled}
              style={({ pressed }) => [
                styles.modalSaveBtn,
                pressed && { opacity: 0.7 },
                (saving || saveDisabled) && { opacity: 0.5 },
              ]}
            >
              {saving ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <Text style={styles.modalSaveText}>{saveLabel}</Text>
              )}
            </Pressable>
          </View>

          {deleteLabel && onDelete && (
            <Pressable
              onPress={onDelete}
              style={({ pressed }) => [
                styles.modalDeleteBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.modalDeleteText}>{deleteLabel}</Text>
            </Pressable>
          )}
        </Animated.View>
      </KeyboardAvoidingView>

      {alert && (
        <CustomAlert
          visible={alert.visible}
          title={alert.title}
          message={alert.message}
          buttons={alert.buttons}
          onDismiss={alert.onDismiss}
        />
      )}
    </Animated.View>
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
