import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  Modal,
  Switch,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../../navigation/types";

type Nav = NativeStackNavigationProp<ProfileStackParamList, "Settings">;
import Button from "../../components/common/Button";
import ScreenHeader from "../../components/common/ScreenHeader";
import { useAuthStore } from "../../stores/authStore";
import { useChatStore } from "../../stores/chatStore";
import { useIsTablet } from "../../hooks/useIsTablet";
import { colors } from "../../utils/colors";
import { storage } from "../../utils/storage";

type LayoutOption = "messaging" | "janitor" | "edgeToEdge";

const LAYOUTS: { key: LayoutOption; label: string; desc: string }[] = [
  {
    key: "messaging",
    label: "Messaging",
    desc: "User messages on the right, bot on the left",
  },
  {
    key: "janitor",
    label: "Janitor",
    desc: "Both sides look the same, avatar beside the bubble",
  },
  {
    key: "edgeToEdge",
    label: "Edge to edge",
    desc: "Like Janitor but avatar on same row as name",
  },
];

function layoutLabel(key: LayoutOption): string {
  return LAYOUTS.find((l) => l.key === key)?.label ?? "Messaging";
}

type WrapperOption = { key: string; label: string };

const WRAPPERS: WrapperOption[] = [
  { key: "", label: "None" },
  { key: "*", label: "Italic (*)" },
  { key: "**", label: "Bold (**)" },
  { key: "***", label: "Italic & Bold (***)" },
];

function wrapperLabel(key: string): string {
  return WRAPPERS.find((w) => w.key === key)?.label ?? "Italic (*)";
}

type PickerOption = { key: string; label: string; desc?: string };

const ToggleRow = React.memo(function ToggleRow({
  label,
  detail,
  value,
  onValueChange,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {detail ? <Text style={styles.settingValue}>{detail}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.text}
      />
    </View>
  );
});

const PressableRow = React.memo(function PressableRow({
  label,
  detail,
  chevron,
  spaced,
  onPress,
}: {
  label: string;
  detail?: string;
  chevron?: string;
  spaced?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingRow,
        spaced && styles.rowSpaced,
        pressed && { opacity: 0.7 },
      ]}
      onPress={onPress}
    >
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {detail ? <Text style={styles.settingValue}>{detail}</Text> : null}
      </View>
      {chevron ? <Text style={styles.settingChevron}>{chevron}</Text> : null}
    </Pressable>
  );
});

const PickerModal = React.memo(function PickerModal({
  visible,
  title,
  options,
  activeKey,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: PickerOption[];
  activeKey: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.pickerContent} onPress={() => {}}>
          <Text style={styles.pickerTitle}>{title}</Text>
          {options.map((opt) => {
            const active = activeKey === opt.key;
            return (
              <Pressable
                key={opt.key}
                style={[
                  styles.pickerOption,
                  active && styles.pickerOptionActive,
                ]}
                onPress={() => onSelect(opt.key)}
              >
                <Text
                  style={[
                    styles.pickerOptionLabel,
                    active && styles.pickerOptionLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
                {opt.desc ? (
                  <Text style={styles.pickerOptionDesc}>{opt.desc}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const ChatLayoutSection = React.memo(function ChatLayoutSection({
  isTablet,
  onOpenLayoutPicker,
}: {
  isTablet: boolean;
  onOpenLayoutPicker: () => void;
}) {
  const chatLayout = useChatStore((s) => s.chatLayout);
  const showTimestamps = useChatStore((s) => s.showTimestamps);
  const setShowTimestamps = useChatStore((s) => s.setShowTimestamps);
  const chatCentered = useChatStore((s) => s.chatCentered);
  const setChatCentered = useChatStore((s) => s.setChatCentered);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Chat Layout</Text>
      <PressableRow
        label="Layout"
        detail={layoutLabel(chatLayout)}
        chevron="▼"
        onPress={onOpenLayoutPicker}
      />
      <ToggleRow
        label="Show timestamps"
        value={showTimestamps}
        onValueChange={setShowTimestamps}
      />
      {isTablet && (
        <ToggleRow
          label="Center chat"
          detail="Constrain chat width instead of edge-to-edge"
          value={chatCentered}
          onValueChange={setChatCentered}
        />
      )}
    </View>
  );
});

const AutoFormatSection = React.memo(function AutoFormatSection({
  onOpenWrapperPicker,
}: {
  onOpenWrapperPicker: () => void;
}) {
  const autoFormatEnabled = useChatStore((s) => s.autoFormatEnabled);
  const setAutoFormatEnabled = useChatStore((s) => s.setAutoFormatEnabled);
  const narrationWrapper = useChatStore((s) => s.narrationWrapper);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Auto Formatting</Text>
      <ToggleRow
        label="Auto-format on generation"
        detail="Wrap narration lines when bot finishes generating"
        value={autoFormatEnabled}
        onValueChange={setAutoFormatEnabled}
      />
      <PressableRow
        label="Narration style"
        detail={wrapperLabel(narrationWrapper)}
        chevron="▼"
        spaced
        onPress={onOpenWrapperPicker}
      />
    </View>
  );
});

const ContentSection = React.memo(function ContentSection() {
  const { navigate } = useNavigation<Nav>();
  const [dateFormat, setDateFormat] = useState<"relative" | "absolute">(
    "relative",
  );
  const [reviewReactionsEnabled, setReviewReactionsEnabled] = useState(false);
  const [fullResImages, setFullResImages] = useState(false);

  useEffect(() => {
    storage.getDateFormat().then(setDateFormat);
  }, []);

  useEffect(() => {
    storage.getReviewReactionsEnabled().then(setReviewReactionsEnabled);
  }, []);

  useEffect(() => {
    storage.getFullResImages().then(setFullResImages);
  }, []);

  const changeDateFormat = useCallback((value: boolean) => {
    const next = value ? "relative" : "absolute";
    setDateFormat(next);
    storage.setDateFormat(next);
  }, []);

  const changeReviewReactions = useCallback((value: boolean) => {
    setReviewReactionsEnabled(value);
    storage.setReviewReactionsEnabled(value);
  }, []);

  const changeFullResImages = useCallback((value: boolean) => {
    setFullResImages(value);
    storage.setFullResImages(value);
  }, []);

  const openBlockedContent = useCallback(
    () => navigate("BlockedContent"),
    [navigate],
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Content</Text>
      <PressableRow
        label="Blocked Content"
        detail="Manage blocked creators, characters, and tags"
        chevron="›"
        onPress={openBlockedContent}
      />
      <ToggleRow
        label="Date Format"
        detail={
          dateFormat === "relative"
            ? "Relative (2d, 3mo, 1y)"
            : "Absolute (January 15, 2024)"
        }
        value={dateFormat === "relative"}
        onValueChange={changeDateFormat}
      />
      <ToggleRow
        label="Review Reactions"
        detail="Enable emoji reactions on reviews"
        value={reviewReactionsEnabled}
        onValueChange={changeReviewReactions}
      />
      <ToggleRow
        label="Full Resolution Images"
        detail="Always load images in full resolution"
        value={fullResImages}
        onValueChange={changeFullResImages}
      />
    </View>
  );
});

const AboutSection = React.memo(function AboutSection() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Janitor AI</Text>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </View>
  );
});

export default function SettingsScreen() {
  const { goBack } = useNavigation<Nav>();
  const logout = useAuthStore((s) => s.logout);
  const chatLayout = useChatStore((s) => s.chatLayout);
  const setChatLayout = useChatStore((s) => s.setChatLayout);
  const narrationWrapper = useChatStore((s) => s.narrationWrapper);
  const setNarrationWrapper = useChatStore((s) => s.setNarrationWrapper);
  const isTablet = useIsTablet();
  const [layoutPickerVisible, setLayoutPickerVisible] = useState(false);
  const [wrapperPickerVisible, setWrapperPickerVisible] = useState(false);

  const handleLogout = useCallback(() => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      {
        text: "Logout",
        style: "destructive",
        onPress: () => logout(),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [logout]);

  const openLayoutPicker = useCallback(() => setLayoutPickerVisible(true), []);
  const closeLayoutPicker = useCallback(() => setLayoutPickerVisible(false), []);
  const selectLayout = useCallback(
    (key: string) => {
      setChatLayout(key as LayoutOption);
      setLayoutPickerVisible(false);
    },
    [setChatLayout],
  );

  const openWrapperPicker = useCallback(
    () => setWrapperPickerVisible(true),
    [],
  );
  const closeWrapperPicker = useCallback(
    () => setWrapperPickerVisible(false),
    [],
  );
  const selectWrapper = useCallback(
    (key: string) => {
      setNarrationWrapper(key);
      setWrapperPickerVisible(false);
    },
    [setNarrationWrapper],
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Settings" onBack={() => goBack()} />
      <ScrollView style={styles.content}>
        <ChatLayoutSection
          isTablet={isTablet}
          onOpenLayoutPicker={openLayoutPicker}
        />
        <AutoFormatSection onOpenWrapperPicker={openWrapperPicker} />
        <ContentSection />
        <AboutSection />
        <Button
          title="Logout"
          onPress={handleLogout}
          variant="danger"
          style={styles.logoutBtn}
        />
      </ScrollView>

      <PickerModal
        visible={layoutPickerVisible}
        title="Chat Layout"
        options={LAYOUTS}
        activeKey={chatLayout}
        onSelect={selectLayout}
        onClose={closeLayoutPicker}
      />

      <PickerModal
        visible={wrapperPickerVisible}
        title="Narration Style"
        options={WRAPPERS}
        activeKey={narrationWrapper}
        onSelect={selectWrapper}
        onClose={closeWrapperPicker}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowSpaced: {
    marginTop: 10,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "500",
  },
  settingValue: {
    color: colors.textDim,
    fontSize: 13,
    marginTop: 2,
  },
  settingChevron: {
    color: colors.textFaint,
    fontSize: 10,
    marginLeft: 8,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 10,
  },
  placeholder: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeholderText: { color: colors.textFaint, fontSize: 14 },
  versionText: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  logoutBtn: { marginBottom: 28 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  pickerContent: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  pickerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  pickerOptionActive: {
    backgroundColor: colors.accentFaded,
  },
  pickerOptionLabel: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  pickerOptionLabelActive: {
    color: colors.accent,
  },
  pickerOptionDesc: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 3,
  },
});
