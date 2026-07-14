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

export default function SettingsScreen() {
  const { goBack, navigate } = useNavigation<Nav>();
  const logout = useAuthStore((s) => s.logout);
  const chatLayout = useChatStore((s) => s.chatLayout);
  const setChatLayout = useChatStore((s) => s.setChatLayout);
  const showTimestamps = useChatStore((s) => s.showTimestamps);
  const setShowTimestamps = useChatStore((s) => s.setShowTimestamps);
  const autoFormatEnabled = useChatStore((s) => s.autoFormatEnabled);
  const setAutoFormatEnabled = useChatStore((s) => s.setAutoFormatEnabled);
  const narrationWrapper = useChatStore((s) => s.narrationWrapper);
  const setNarrationWrapper = useChatStore((s) => s.setNarrationWrapper);
  const chatCentered = useChatStore((s) => s.chatCentered);
  const setChatCentered = useChatStore((s) => s.setChatCentered);
  const isTablet = useIsTablet();
  const [dateFormat, setDateFormat] = useState<"relative" | "absolute">("relative");
  const [reviewReactionsEnabled, setReviewReactionsEnabled] = useState(false);
  const [layoutPickerVisible, setLayoutPickerVisible] = useState(false);
  const [wrapperPickerVisible, setWrapperPickerVisible] = useState(false);

  useEffect(() => {
    storage.getDateFormat().then(setDateFormat);
  }, []);

  useEffect(() => {
    storage.getReviewReactionsEnabled().then(setReviewReactionsEnabled);
  }, []);

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

  return (
    <View style={styles.container}>
      <ScreenHeader title="Settings" onBack={() => goBack()} />
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chat Layout</Text>
          <Pressable
            style={({ pressed }) => [
              styles.settingRow,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => setLayoutPickerVisible(true)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Layout</Text>
              <Text style={styles.settingValue}>{layoutLabel(chatLayout)}</Text>
            </View>
            <Text style={styles.settingChevron}>▼</Text>
          </Pressable>

          <View style={styles.toggleRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Show timestamps</Text>
            </View>
            <Switch
              value={showTimestamps}
              onValueChange={setShowTimestamps}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.text}
            />
          </View>

          {isTablet && (
            <View style={styles.toggleRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Center chat</Text>
                <Text style={styles.settingValue}>
                  Constrain chat width instead of edge-to-edge
                </Text>
              </View>
              <Switch
                value={chatCentered}
                onValueChange={setChatCentered}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.text}
              />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Auto Formatting</Text>
          <View style={styles.toggleRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-format on generation</Text>
              <Text style={styles.settingValue}>
                Wrap narration lines when bot finishes generating
              </Text>
            </View>
            <Switch
              value={autoFormatEnabled}
              onValueChange={setAutoFormatEnabled}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.text}
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.settingRow,
              { marginTop: 10 },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => setWrapperPickerVisible(true)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Narration style</Text>
              <Text style={styles.settingValue}>
                {wrapperLabel(narrationWrapper)}
              </Text>
            </View>
            <Text style={styles.settingChevron}>▼</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content</Text>
          <Pressable
            style={({ pressed }) => [
              styles.settingRow,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => navigate("BlockedContent")}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Blocked Content</Text>
              <Text style={styles.settingValue}>
                Manage blocked creators, characters, and tags
              </Text>
            </View>
            <Text style={styles.settingChevron}>›</Text>
          </Pressable>

          <View style={styles.toggleRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Date Format</Text>
              <Text style={styles.settingValue}>
                {dateFormat === "relative"
                  ? "Relative (2d, 3mo, 1y)"
                  : "Absolute (January 15, 2024)"}
              </Text>
            </View>
            <Switch
              value={dateFormat === "relative"}
              onValueChange={(val) => {
                const next = val ? "relative" : "absolute";
                setDateFormat(next);
                storage.setDateFormat(next);
              }}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.text}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Review Reactions</Text>
              <Text style={styles.settingValue}>
                Enable emoji reactions on reviews
              </Text>
            </View>
            <Switch
              value={reviewReactionsEnabled}
              onValueChange={(val) => {
                setReviewReactionsEnabled(val);
                storage.setReviewReactionsEnabled(val);
              }}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.text}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Janitor AI</Text>
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
        </View>

        <Button
          title="Logout"
          onPress={handleLogout}
          variant="danger"
          style={styles.logoutBtn}
        />
      </ScrollView>

      <Modal
        visible={layoutPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLayoutPickerVisible(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setLayoutPickerVisible(false)}
        >
          <Pressable style={styles.pickerContent} onPress={() => {}}>
            <Text style={styles.pickerTitle}>Chat Layout</Text>
            {LAYOUTS.map((opt) => {
              const active = chatLayout === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.pickerOption,
                    active && styles.pickerOptionActive,
                  ]}
                  onPress={() => {
                    setChatLayout(opt.key);
                    setLayoutPickerVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionLabel,
                      active && styles.pickerOptionLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text style={styles.pickerOptionDesc}>{opt.desc}</Text>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={wrapperPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWrapperPickerVisible(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setWrapperPickerVisible(false)}
        >
          <Pressable style={styles.pickerContent} onPress={() => {}}>
            <Text style={styles.pickerTitle}>Narration Style</Text>
            {WRAPPERS.map((opt) => {
              const active = narrationWrapper === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.pickerOption,
                    active && styles.pickerOptionActive,
                  ]}
                  onPress={() => {
                    setNarrationWrapper(opt.key);
                    setWrapperPickerVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionLabel,
                      active && styles.pickerOptionLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
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
