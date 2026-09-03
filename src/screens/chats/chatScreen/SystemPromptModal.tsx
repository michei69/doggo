import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import CollapsibleSection from "../../../components/common/CollapsibleSection";
import TextInput from "../../../components/common/TextInput";
import { colors } from "../../../utils/colors";

const SystemPromptModal = React.memo(function SystemPromptModal({
  visible,
  content,
  botPersonality,
  scenario,
  loading,
  error,
  onClose,
}: {
  visible: boolean;
  content: string;
  botPersonality: string;
  scenario: string;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.sysPromptOverlay}>
        <View style={styles.sysPromptModal}>
          <View style={styles.sysPromptHeader}>
            <Text style={styles.sysPromptTitle}>System Prompt</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.sysPromptClose}>{"\u2715"}</Text>
            </Pressable>
          </View>
          {error ? (
            <Text style={styles.sysPromptError}>{error}</Text>
          ) : loading && !content && !botPersonality && !scenario ? (
            <ActivityIndicator
              color={colors.accent}
              style={{ paddingVertical: 24 }}
            />
          ) : (
            <ScrollView style={styles.sysPromptScroll}>
              {loading && (
                <View style={styles.sysPromptLoadingBar}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={styles.sysPromptLoadingText}>
                    Loading system prompt…
                  </Text>
                </View>
              )}
              {content.length > 0 && (
                <CollapsibleSection title="System Prompt">
                  <TextInput
                    multiline
                    label="Raw System Prompt"
                    style={styles.sysPromptTextInput}
                    editable={!loading}
                  >
                    {content}
                  </TextInput>
                  <Pressable
                    style={styles.sysPromptCopyBtn}
                    onPress={() => {
                      try {
                        const Clipboard = require("expo-clipboard");
                        Clipboard.setStringAsync(content);
                      } catch {}
                    }}
                  >
                    <Text style={styles.sysPromptCopyText}>Copy</Text>
                  </Pressable>
                </CollapsibleSection>
              )}
              {botPersonality.length > 0 && (
                <CollapsibleSection title="Personality">
                  <TextInput
                    multiline
                    label="Bot Personality"
                    style={styles.sysPromptTextInput}
                    editable={!loading}
                  >
                    {botPersonality}
                  </TextInput>

                  <Pressable
                    style={styles.sysPromptCopyBtn}
                    onPress={() => {
                      try {
                        const Clipboard = require("expo-clipboard");
                        Clipboard.setStringAsync(botPersonality);
                      } catch {}
                    }}
                  >
                    <Text style={styles.sysPromptCopyText}>Copy</Text>
                  </Pressable>
                </CollapsibleSection>
              )}
              {scenario.length > 0 && (
                <CollapsibleSection title="Scenario">
                  <TextInput
                    multiline
                    label="Scenario"
                    style={styles.sysPromptTextInput}
                    editable={!loading}
                  >
                    {scenario}
                  </TextInput>

                  <Pressable
                    style={styles.sysPromptCopyBtn}
                    onPress={() => {
                      try {
                        const Clipboard = require("expo-clipboard");
                        Clipboard.setStringAsync(scenario);
                      } catch {}
                    }}
                  >
                    <Text style={styles.sysPromptCopyText}>Copy</Text>
                  </Pressable>
                </CollapsibleSection>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  sysPromptOverlay: {
    flex: 1,
    backgroundColor: colors.overlayStrong,
    justifyContent: "center",
    alignItems: "center",
  },
  sysPromptModal: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    width: "90%",
    maxHeight: "80%",
    padding: 20,
  },
  sysPromptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sysPromptTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  sysPromptClose: {
    color: colors.textFaint,
    fontSize: 18,
    padding: 4,
  },
  sysPromptScroll: {
    maxHeight: "100%",
  },
  sysPromptTextInput: {
    maxHeight: 300,
  },
  sysPromptLoadingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    marginBottom: 8,
    backgroundColor: `${colors.accent}15`,
    borderRadius: 8,
  },
  sysPromptLoadingText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "500",
  },
  sysPromptError: {
    color: colors.danger,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 16,
  },
  sysPromptCopyBtn: {
    marginTop: -4,
    marginBottom: 8,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  sysPromptCopyText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
});

export default SystemPromptModal;
