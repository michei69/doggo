import React, { useState, useCallback, useEffect } from "react";
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  ScrollView,
  Switch,
  View,
  StyleSheet,
} from "react-native";
import { X } from "lucide-react-native";
import { colors } from "../../utils/colors";

export default function AdvancedSearchModal({
  visible,
  keywords,
  blacklisted,
  matchMode,
  hideDarkened,
  onKeywordsChange,
  onBlacklistedChange,
  onMatchModeChange,
  onHideDarkenedChange,
  onClose,
}: {
  visible: boolean;
  keywords: string[];
  blacklisted: string[];
  matchMode: "any" | "all";
  hideDarkened: boolean;
  onKeywordsChange: (keywords: string[]) => void;
  onBlacklistedChange: (keywords: string[]) => void;
  onMatchModeChange: (mode: "any" | "all") => void;
  onHideDarkenedChange: (hide: boolean) => void;
  onClose: () => void;
}) {
  const [keywordInput, setKeywordInput] = useState("");
  const [blacklistInput, setBlacklistInput] = useState("");

  useEffect(() => {
    if (visible) {
      setKeywordInput("");
      setBlacklistInput("");
    }
  }, [visible]);

  const handleAddKeyword = useCallback(() => {
    const trimmed = keywordInput.trim();
    if (!trimmed || keywords.includes(trimmed)) return;
    onKeywordsChange([...keywords, trimmed]);
    setKeywordInput("");
  }, [keywordInput, keywords, onKeywordsChange]);

  const handleRemoveKeyword = useCallback(
    (kw: string) => onKeywordsChange(keywords.filter((k) => k !== kw)),
    [keywords, onKeywordsChange],
  );

  const handleAddBlacklisted = useCallback(() => {
    const trimmed = blacklistInput.trim();
    if (!trimmed || blacklisted.includes(trimmed)) return;
    onBlacklistedChange([...blacklisted, trimmed]);
    setBlacklistInput("");
  }, [blacklistInput, blacklisted, onBlacklistedChange]);

  const handleRemoveBlacklisted = useCallback(
    (kw: string) => onBlacklistedChange(blacklisted.filter((k) => k !== kw)),
    [blacklisted, onBlacklistedChange],
  );

  const handleClearAll = useCallback(() => {
    onKeywordsChange([]);
    onBlacklistedChange([]);
    onMatchModeChange("any");
  }, [onKeywordsChange, onBlacklistedChange, onMatchModeChange]);

  const hasAnyFilter = keywords.length > 0 || blacklisted.length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>Advanced Search</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Search keywords</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Type a keyword..."
                placeholderTextColor={colors.textDim}
                value={keywordInput}
                onChangeText={setKeywordInput}
                onSubmitEditing={handleAddKeyword}
                returnKeyType="done"
                autoCorrect={false}
                autoCapitalize="none"
              />
              <Pressable
                style={[
                  styles.addBtn,
                  !keywordInput.trim() && styles.addBtnDisabled,
                ]}
                onPress={handleAddKeyword}
              >
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            </View>
            {keywords.length > 0 && (
              <View style={styles.pillsRow}>
                {keywords.map((kw) => (
                  <Pressable
                    key={kw}
                    style={styles.pill}
                    onPress={() => handleRemoveKeyword(kw)}
                  >
                    <Text style={styles.pillText}>{kw}</Text>
                    <Text style={styles.pillRemove}>{"✕"}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={styles.sectionLabel}>Blacklisted keywords</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Type a keyword..."
                placeholderTextColor={colors.textDim}
                value={blacklistInput}
                onChangeText={setBlacklistInput}
                onSubmitEditing={handleAddBlacklisted}
                returnKeyType="done"
                autoCorrect={false}
                autoCapitalize="none"
              />
              <Pressable
                style={[
                  styles.addBtn,
                  !blacklistInput.trim() && styles.addBtnDisabled,
                ]}
                onPress={handleAddBlacklisted}
              >
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            </View>
            {blacklisted.length > 0 && (
              <View style={styles.pillsRow}>
                {blacklisted.map((kw) => (
                  <Pressable
                    key={kw}
                    style={[styles.pill, styles.pillBlacklisted]}
                    onPress={() => handleRemoveBlacklisted(kw)}
                  >
                    <Text style={styles.pillText}>{kw}</Text>
                    <Text style={styles.pillRemove}>{"✕"}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.matchRow}>
              <Text style={styles.matchLabel}>
                Match: {matchMode === "any" ? "Any" : "All"}
              </Text>
              <View style={styles.matchToggle}>
                <Pressable
                  style={[
                    styles.matchBtn,
                    styles.matchBtnLeft,
                    matchMode === "any" && styles.matchBtnActive,
                  ]}
                  onPress={() => onMatchModeChange("any")}
                >
                  <Text
                    style={[
                      styles.matchBtnText,
                      matchMode === "any" && styles.matchBtnTextActive,
                    ]}
                  >
                    Any
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.matchBtn,
                    styles.matchBtnRight,
                    matchMode === "all" && styles.matchBtnActive,
                  ]}
                  onPress={() => onMatchModeChange("all")}
                >
                  <Text
                    style={[
                      styles.matchBtnText,
                      matchMode === "all" && styles.matchBtnTextActive,
                    ]}
                  >
                    All
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>
                Hide darkened: {hideDarkened ? "On" : "Off"}
              </Text>
              <Switch
                value={hideDarkened}
                onValueChange={onHideDarkenedChange}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.text}
              />
            </View>

            {hasAnyFilter && (
              <Pressable style={styles.clearRow} onPress={handleClearAll}>
                <Text style={styles.clearText}>Clear all</Text>
              </Pressable>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    width: "85%",
    maxWidth: 480,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  sectionLabel: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 8,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(124, 92, 231, 0.15)",
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  pillBlacklisted: {
    backgroundColor: "rgba(231, 76, 60, 0.15)",
    borderColor: colors.danger,
  },
  pillText: {
    color: colors.text,
    fontSize: 13,
  },
  pillRemove: {
    color: colors.textDim,
    fontSize: 12,
  },
  matchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  matchLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  matchToggle: {
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
  },
  matchBtn: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  matchBtnLeft: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  matchBtnRight: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  matchBtnActive: {
    backgroundColor: "rgba(124, 92, 231, 0.3)",
    borderColor: colors.accent,
  },
  matchBtnText: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: "600",
  },
  matchBtnTextActive: {
    color: colors.accent,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toggleLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  clearRow: {
    backgroundColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  clearText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
});
