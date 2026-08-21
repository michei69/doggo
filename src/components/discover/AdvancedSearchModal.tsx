import { useState, useCallback } from "react";
import type React from "react";
import {
  Pressable,
  Text,
  TextInput,
  ScrollView,
  Switch,
  View,
  StyleSheet,
} from "react-native";
import { colors } from "../../utils/colors";
import CenteredModal from "../../components/common/CenteredModal";
import { centeredModalStyles } from "../../components/common/centeredModalStyles";
import { useModalHandle } from "../../hooks/useModalHandle";

export interface AdvancedSearchModalHandle {
  open: () => void;
}

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
  ref,
}: {
  visible?: boolean;
  keywords: string[];
  blacklisted: string[];
  matchMode: "any" | "all";
  hideDarkened: boolean;
  onKeywordsChange: (keywords: string[]) => void;
  onBlacklistedChange: (keywords: string[]) => void;
  onMatchModeChange: (mode: "any" | "all") => void;
  onHideDarkenedChange: (hide: boolean) => void;
  onClose?: () => void;
  ref?: React.Ref<AdvancedSearchModalHandle>;
}) {
  const [keywordInput, setKeywordInput] = useState("");
  const [blacklistInput, setBlacklistInput] = useState("");

  // When the parent passes a `visible` prop (controlled mode) the handle is
  // ignored; otherwise the modal is driven through the ref handle.
  const { visible: handleVisible, close } = useModalHandle(ref, () => {
    setKeywordInput("");
    setBlacklistInput("");
  });
  const isVisible = visible ?? handleVisible;

  const handleClose = useCallback(() => {
    if (visible === undefined) {
      close();
    } else {
      onClose?.();
    }
  }, [visible, onClose, close]);

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
    <CenteredModal
      visible={isVisible}
      onClose={handleClose}
      title="Advanced Search"
      contentStyle={styles.content}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Search keywords</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={centeredModalStyles.input}
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
              centeredModalStyles.addBtn,
              !keywordInput.trim() && centeredModalStyles.addBtnDisabled,
            ]}
            onPress={handleAddKeyword}
          >
            <Text style={centeredModalStyles.addBtnText}>Add</Text>
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
            style={centeredModalStyles.input}
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
              centeredModalStyles.addBtn,
              !blacklistInput.trim() && centeredModalStyles.addBtnDisabled,
            ]}
            onPress={handleAddBlacklisted}
          >
            <Text style={centeredModalStyles.addBtnText}>Add</Text>
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
    </CenteredModal>
  );
}

const styles = StyleSheet.create({
  content: {
    maxHeight: "80%",
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
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  pillBlacklisted: {
    backgroundColor: colors.dangerSoft,
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
    backgroundColor: colors.accentStrong,
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
