import { memo, useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import CollapsibleSection from "../../../components/common/CollapsibleSection";
import Slider from "../../../components/common/Slider";
import { colors } from "../../../utils/colors";
import type { ApiProxyConfig, GenSettings, UpdateGen } from "./types";

function fmtFloat(v: number): string {
  return v.toFixed(2);
}

function fmtInt(v: number): string {
  return String(Math.round(v));
}

export const ApiToggleRow = memo(function ApiToggleRow({
  isJanitor,
  onSelect,
}: {
  isJanitor: boolean;
  onSelect: (mode: "janitor" | "proxy") => void;
}) {
  return (
    <View style={styles.apiToggleRow}>
      <Text style={styles.apiToggleLabel}>LLM Provider</Text>
      <View style={styles.apiToggleBtns}>
        <Pressable
          style={[styles.apiToggleBtn, isJanitor && styles.apiToggleBtnActive]}
          onPress={() => onSelect("janitor")}
        >
          <Text
            style={[
              styles.apiToggleBtnText,
              isJanitor && styles.apiToggleBtnTextActive,
            ]}
          >
            JanitorLLM
          </Text>
        </Pressable>
        <Pressable
          style={[styles.apiToggleBtn, !isJanitor && styles.apiToggleBtnActive]}
          onPress={() => onSelect("proxy")}
        >
          <Text
            style={[
              styles.apiToggleBtnText,
              !isJanitor && styles.apiToggleBtnTextActive,
            ]}
          >
            Proxy
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

export const GlobalPromptInput = memo(function GlobalPromptInput({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <View style={styles.globalPromptSection}>
      <Text style={styles.formLabel}>Global Prompt</Text>
      <TextInput
        style={styles.globalPromptInput}
        value={value}
        onChangeText={onChangeText}
        placeholder="e.g. -"
        placeholderTextColor={colors.textDimAlt}
        multiline
      />
    </View>
  );
});

export const ProxyConfigList = memo(function ProxyConfigList({
  proxies,
  selectedId,
  duplicatingId,
  onSelect,
  onEdit,
  onAdd,
  onDuplicate,
  onCopyJson,
  onDelete,
}: {
  proxies: ApiProxyConfig[];
  selectedId: string;
  duplicatingId: string | null;
  onSelect: (id: string) => void;
  onEdit: (proxy: ApiProxyConfig) => void;
  onAdd: () => void;
  onDuplicate: (proxy: ApiProxyConfig) => void;
  onCopyJson: (proxy: ApiProxyConfig) => void;
  onDelete: (proxy: ApiProxyConfig) => void;
}) {
  return (
    <CollapsibleSection title="Proxy Configuration">
      {proxies.map((proxy) => {
        const active = proxy.id === selectedId;
        return (
          <View key={proxy.id} style={styles.proxyCard}>
            <Pressable
              style={[styles.proxyOption, active && styles.proxyOptionActive]}
              onPress={() => onSelect(proxy.id)}
            >
              <Text style={styles.proxyName}>{proxy.name}</Text>
              <View style={styles.proxyModelChip}>
                <Text style={styles.proxyModelText}>{proxy.model}</Text>
              </View>
            </Pressable>

            {active && (
              <View style={styles.proxyExpanded}>
                <Text style={styles.proxyUrl} numberOfLines={1}>
                  {proxy.api_url}
                </Text>

                <View style={styles.proxyActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.proxyActionBtn,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => onEdit(proxy)}
                  >
                    <Text style={styles.proxyActionText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.proxyActionBtn,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => onDuplicate(proxy)}
                    disabled={duplicatingId === proxy.id}
                  >
                    {duplicatingId === proxy.id ? (
                      <ActivityIndicator size="small" color={colors.textSecondary} />
                    ) : (
                      <Text style={styles.proxyActionText}>Duplicate</Text>
                    )}
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.proxyActionBtn,
                      styles.proxyActionBtnDim,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => {}}
                  >
                    <Text style={styles.proxyActionTextDim}>Test</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.proxyActionBtn,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => onCopyJson(proxy)}
                  >
                    <Text style={styles.proxyActionText}>JSON</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.proxyActionBtn,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => onDelete(proxy)}
                  >
                    <Text
                      style={[styles.proxyActionText, styles.proxyActionDelete]}
                    >
                      Delete
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        );
      })}
      <Pressable
        style={({ pressed }) => [
          styles.proxyAddBtn,
          pressed && { opacity: 0.7 },
        ]}
        onPress={onAdd}
      >
        <Text style={styles.proxyAddText}>+ Add Proxy</Text>
      </Pressable>
    </CollapsibleSection>
  );
});

export const ToggleRows = memo(function ToggleRows({
  gs,
  isJanitor,
  privacyMode,
  updateGen,
  onPrivacyModeChange,
}: {
  gs: GenSettings;
  isJanitor: boolean;
  privacyMode: boolean;
  updateGen: UpdateGen;
  onPrivacyModeChange: (v: boolean) => void;
}) {
  return (
    <>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Privacy Mode</Text>
        <Switch
          value={privacyMode}
          onValueChange={onPrivacyModeChange}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={colors.text}
        />
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Show Thinking</Text>
        <Switch
          value={gs.enable_thinking}
          onValueChange={(v) => updateGen({ enable_thinking: v })}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={colors.text}
        />
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Enable Reasoning</Text>
        <Switch
          value={gs.enable_reasoning}
          onValueChange={(v) => updateGen({ enable_reasoning: v })}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={colors.text}
        />
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Show Reasoning</Text>
        <Switch
          value={gs.enable_reasoning_chat}
          onValueChange={(v) => updateGen({ enable_reasoning_chat: v })}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={colors.text}
        />
      </View>
      {isJanitor && (
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Short Responses</Text>
          <Switch
            value={gs.enable_short_responses}
            onValueChange={(v) => updateGen({ enable_short_responses: v })}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.text}
          />
        </View>
      )}
    </>
  );
});

export const LocalModeToggle = memo(function LocalModeToggle({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>Local Mode</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.text}
      />
    </View>
  );
});

export const LocalSettingsSection = memo(function LocalSettingsSection({
  personality,
  scenario,
  fetchingPersonality,
  fetchingScenario,
  onPersonalityChange,
  onScenarioChange,
  onFetchPersonality,
  onFetchScenario,
}: {
  personality: string;
  scenario: string;
  fetchingPersonality: boolean;
  fetchingScenario: boolean;
  onPersonalityChange: (v: string) => void;
  onScenarioChange: (v: string) => void;
  onFetchPersonality: () => void;
  onFetchScenario: () => void;
}) {
  return (
    <CollapsibleSection title="Local Settings">
      <View style={styles.localSection}>
        <View>
          <TextInput
            style={styles.localTextInput}
            value={personality}
            onChangeText={onPersonalityChange}
            placeholder="Enter custom personality..."
            placeholderTextColor={colors.textDimAlt}
            multiline
          />
          <Pressable
            style={({ pressed }) => [
              styles.fetchBtn,
              pressed && { opacity: 0.7 },
            ]}
            onPress={onFetchPersonality}
            disabled={fetchingPersonality}
          >
            {fetchingPersonality ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text style={styles.fetchBtnText}>Fetch Original Personality</Text>
            )}
          </Pressable>
        </View>
        <View>
          <TextInput
            style={styles.localTextInput}
            value={scenario}
            onChangeText={onScenarioChange}
            placeholder="Enter custom scenario..."
            placeholderTextColor={colors.textDimAlt}
            multiline
          />
          <Pressable
            style={({ pressed }) => [
              styles.fetchBtn,
              pressed && { opacity: 0.7 },
            ]}
            onPress={onFetchScenario}
            disabled={fetchingScenario}
          >
            {fetchingScenario ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text style={styles.fetchBtnText}>Fetch Original Scenario</Text>
            )}
          </Pressable>
        </View>
      </View>
    </CollapsibleSection>
  );
});

export const GenerationSlidersSection = memo(function GenerationSlidersSection({
  gs,
  updateGen,
}: {
  gs: GenSettings;
  updateGen: UpdateGen;
}) {
  return (
    <CollapsibleSection title="Generation Settings">
      <Slider
        label="Temperature"
        value={gs.temperature}
        min={0}
        max={2}
        step={0.05}
        formatValue={fmtFloat}
        onValueChange={(v) => updateGen({ temperature: v })}
      />
      <Slider
        label="Max Tokens"
        value={gs.max_new_token}
        min={0}
        max={5000}
        step={50}
        formatValue={fmtInt}
        onValueChange={(v) => updateGen({ max_new_token: v })}
      />
      <Slider
        label="Context Size"
        value={gs.context_length}
        min={0}
        max={128000}
        step={256}
        formatValue={fmtInt}
        onValueChange={(v) => updateGen({ context_length: v })}
      />
    </CollapsibleSection>
  );
});

export const AdvancedSlidersSection = memo(function AdvancedSlidersSection({
  gs,
  updateGen,
}: {
  gs: GenSettings;
  updateGen: UpdateGen;
}) {
  return (
    <CollapsibleSection title="Advanced">
      <Slider
        label="Top K"
        value={gs.top_k}
        min={0}
        max={100}
        step={1}
        formatValue={fmtInt}
        onValueChange={(v) => updateGen({ top_k: v })}
      />
      <Slider
        label="Top P"
        value={gs.top_p}
        min={0}
        max={1}
        step={0.01}
        formatValue={fmtFloat}
        onValueChange={(v) => updateGen({ top_p: v })}
      />
      <Slider
        label="Repetition Penalty"
        value={gs.repetition_penalty}
        min={0}
        max={2}
        step={0.01}
        formatValue={fmtFloat}
        onValueChange={(v) => updateGen({ repetition_penalty: v })}
      />
      <Slider
        label="Frequency Penalty"
        value={gs.frequency_penalty}
        min={0}
        max={2}
        step={0.01}
        formatValue={fmtFloat}
        onValueChange={(v) => updateGen({ frequency_penalty: v })}
      />
    </CollapsibleSection>
  );
});

export const PrefillSection = memo(function PrefillSection({
  gs,
  updateGen,
}: {
  gs: GenSettings;
  updateGen: UpdateGen;
}) {
  return (
    <CollapsibleSection title="Prefill">
      <View style={styles.toggleRowInner}>
        <Text style={styles.toggleLabel}>Enable Prefill</Text>
        <Switch
          value={gs.prefill_enabled}
          onValueChange={(v) => updateGen({ prefill_enabled: v })}
          trackColor={{ false: "#2a2a3e", true: "#7c5ce7" }}
          thumbColor="#fff"
        />
      </View>
      {gs.prefill_enabled && (
        <TextInput
          style={styles.multiline}
          value={gs.prefill_text}
          onChangeText={(v) => updateGen({ prefill_text: v })}
          placeholder="Prefill text..."
          placeholderTextColor={colors.textDimAlt}
          multiline
        />
      )}
    </CollapsibleSection>
  );
});

export const ForbiddenWordsSection = memo(function ForbiddenWordsSection({
  badWords,
  onAddWord,
  onRemoveWord,
}: {
  badWords: string[];
  onAddWord: (word: string) => void;
  onRemoveWord: (index: number) => void;
}) {
  const [input, setInput] = useState("");
  const addBadWord = useCallback(() => {
    const w = input.trim();
    if (!w) return;
    onAddWord(w);
    setInput("");
  }, [input, onAddWord]);

  return (
    <CollapsibleSection title="Forbidden Words">
      <View style={styles.badWordsRow}>
        <TextInput
          style={[styles.textInput, { flex: 1 }]}
          value={input}
          onChangeText={setInput}
          placeholder="Add a forbidden word..."
          placeholderTextColor={colors.textDimAlt}
          onSubmitEditing={addBadWord}
          returnKeyType="done"
        />
        <Pressable style={styles.addBadWordBtn} onPress={addBadWord}>
          <Text style={styles.addBadWordText}>Add</Text>
        </Pressable>
      </View>
      {badWords.length > 0 && (
        <View style={styles.badWordsList}>
          {badWords.map((word, i) => (
            <View key={`${word}`} style={styles.badWordChip}>
              <Text style={styles.badWordChipText}>{String(word)}</Text>
              <Pressable onPress={() => onRemoveWord(i)}>
                <Text style={styles.badWordRemove}>{"\u2715"}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </CollapsibleSection>
  );
});

export const SaveButton = memo(function SaveButton({
  saving,
  onPress,
}: {
  saving: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.saveContainer}>
      <Pressable
        style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.7 }]}
        onPress={onPress}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.saveText}>Save Settings</Text>
        )}
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  apiToggleRow: {
    marginBottom: 16,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  apiToggleLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  apiToggleBtns: {
    flexDirection: "row",
    gap: 8,
  },
  apiToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  apiToggleBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  apiToggleBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  apiToggleBtnTextActive: {
    color: colors.text,
  },
  globalPromptSection: { marginBottom: 16 },
  formLabel: { color: colors.textMuted, fontSize: 13, marginBottom: 4 },
  globalPromptInput: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 80,
    maxHeight: 80,
    textAlignVertical: "top",
  },
  proxyCard: { marginBottom: 6 },
  proxyOption: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  proxyOptionActive: {
    backgroundColor: "rgba(124, 92, 231, 0.15)",
    borderColor: colors.accent,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  proxyName: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  proxyModelChip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(124, 92, 231, 0.15)",
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  proxyModelText: { color: colors.accent, fontSize: 11, fontWeight: "500" },
  proxyExpanded: {
    backgroundColor: colors.background,
    borderColor: colors.accent,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  proxyUrl: {
    color: colors.textFaint,
    fontSize: 12,
    marginBottom: 10,
  },
  proxyActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  proxyActionBtn: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  proxyActionBtnDim: {
    opacity: 0.5,
  },
  proxyActionText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  proxyActionTextDim: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: "500",
  },
  proxyActionDelete: { color: colors.danger },
  proxyAddBtn: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    borderStyle: "dashed",
  },
  proxyAddText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    marginBottom: 16,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleLabel: { color: colors.textSecondary, fontSize: 14 },
  toggleRowInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    marginBottom: 8,
  },
  multiline: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 60,
    textAlignVertical: "top",
  },
  textInput: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  localSection: {
    gap: 12,
  },
  localTextInput: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 100,
    textAlignVertical: "top",
  },
  fetchBtn: {
    backgroundColor: colors.card,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    marginTop: 8,
  },
  fetchBtnText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  badWordsRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  addBadWordBtn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  addBadWordText: { color: colors.text, fontSize: 14, fontWeight: "600" },
  badWordsList: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badWordChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(231, 76, 60, 0.15)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  badWordChipText: { color: colors.danger, fontSize: 12 },
  badWordRemove: { color: colors.danger, fontSize: 12, fontWeight: "700" },
  saveContainer: { marginTop: 24, marginBottom: 20 },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveText: { color: colors.text, fontSize: 16, fontWeight: "700" },
});
