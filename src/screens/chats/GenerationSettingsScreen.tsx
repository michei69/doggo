import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  ActivityIndicator,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ChatsStackParamList } from "../../navigation/types";
import { getMyProfile, updateMyProfile } from "../../api/profile";
import { colors } from "../../utils/colors";
import Slider from "../../components/common/Slider";
import CollapsibleSection from "../../components/common/CollapsibleSection";
import ScreenHeader from "../../components/common/ScreenHeader";
import CustomAlert, {
  type AlertButton,
} from "../../components/common/CustomAlert";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";
import type { UserProfile, ProxyConfiguration } from "../../types/api";
import { useChatStore } from "../../stores/chatStore";
import { storage, type ChatLocalData } from "../../utils/storage";
import { attemptExtractSystemPrompt, fetchSystemPrompt } from "../../api/chats";
import { processSystemMessage } from "../../utils/processText";
import { cleanTags, generify } from "../../utils/markdown";

type Config = UserProfile["config"];
type GenSettings = Config["generation_settings"];
type UpdateGen = (patch: Partial<Config["generation_settings"]>) => void;
type ShowAlert = (title: string, message: string, buttons: AlertButton[]) => void;
type ProxyEditForm = {
  name: string;
  model: string;
  apiUrl: string;
  apiKey: string;
  jailbreakPrompt: string;
};

function buildDefaultConfig(): Config {
  return {
    api: "",
    llm_prompt: "",
    open_ai_jailbreak_prompt: "",
    open_ai_mode: "",
    open_ai_reverse_proxy: "",
    openAiModel: "",
    proxy_global_prompt: "",
    proxyConfigurations: [],
    selectedProxyConfigId: "",
    generation_settings: {
      context_length: 0,
      max_new_token: 0,
      temperature: 1.0,
      frequency_penalty: 0,
      prefill_enabled: false,
      prefill_text: "",
      repetition_penalty: 1.0,
      top_k: 0,
      top_p: 1.0,
      enable_thinking: false,
      enable_reasoning: true,
      enable_reasoning_chat: false,
      privacy_mode: false,
      local_mode: false,
    },
    bad_words: [],
    bio_preview_images: false,
    allow_mobile_nsfw: false,
  };
}

function newId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function fmtFloat(v: number): string {
  return v.toFixed(2);
}

function fmtInt(v: number): string {
  return String(Math.round(v));
}

function useAlert() {
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertButtons, setAlertButtons] = useState<AlertButton[]>([]);

  const showAlert = useCallback(
    (title: string, message: string, buttons: AlertButton[]) => {
      setAlertTitle(title);
      setAlertMessage(message);
      setAlertButtons(buttons);
      setAlertVisible(true);
    },
    [],
  );

  const dismissAlert = useCallback(() => setAlertVisible(false), []);

  return {
    alertVisible,
    alertTitle,
    alertMessage,
    alertButtons,
    showAlert,
    dismissAlert,
  };
}

function useLocalSettings({
  activeChatId,
  showAlert,
  dismissAlert,
  setIsDirty,
}: {
  activeChatId: number | null;
  showAlert: ShowAlert;
  dismissAlert: () => void;
  setIsDirty: Dispatch<SetStateAction<boolean>>;
}) {
  const [localLocalMode, setLocalLocalMode] = useState(false);
  const [localPersonality, setLocalPersonality] = useState("");
  const [localScenario, setLocalScenario] = useState("");
  const [fetchingPersonality, setFetchingPersonality] = useState(false);
  const [fetchingScenario, setFetchingScenario] = useState(false);
  const localLoadedRef = useRef(false);

  // Load per-chat local data
  useEffect(() => {
    if (!activeChatId) return;
    localLoadedRef.current = false;
    let cancelled = false;
    const load = async () => {
      try {
        const data = await storage.getChatLocalData(activeChatId);
        if (cancelled) return;
        if (data) {
          setLocalLocalMode(data.local_mode);
          setLocalPersonality(data.personality);
          setLocalScenario(data.scenario);
        } else {
          setLocalLocalMode(false);
          setLocalPersonality("");
          setLocalScenario("");
        }
      } finally {
        if (!cancelled) localLoadedRef.current = true;
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [activeChatId]);

  // Save per-chat local data on change
  const saveLocalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!localLoadedRef.current || !activeChatId) return;
    if (saveLocalRef.current) clearTimeout(saveLocalRef.current);
    saveLocalRef.current = setTimeout(() => {
      storage.setChatLocalData(activeChatId, {
        local_mode: localLocalMode,
        personality: localPersonality,
        scenario: localScenario,
      });
    }, 300);
    return () => {
      if (saveLocalRef.current) clearTimeout(saveLocalRef.current);
    };
  }, [localLocalMode, localPersonality, localScenario, activeChatId]);

  const setPersonality = useCallback(
    (v: string) => {
      setLocalPersonality(v);
      setIsDirty(true);
    },
    [setIsDirty],
  );

  const setScenario = useCallback(
    (v: string) => {
      setLocalScenario(v);
      setIsDirty(true);
    },
    [setIsDirty],
  );

  const handleFetchPersonality = useCallback(async () => {
    if (!activeChatId) return;
    setFetchingPersonality(true);
    try {
      const detail = useChatStore.getState().activeChatDetail;
      if (!detail) throw new Error("Chat not loaded");
      const characterName = detail.character.chat_name || detail.character.name;
      try {
        const prompt = await fetchSystemPrompt(detail);
        const { personality } = processSystemMessage(prompt, characterName);
        setLocalPersonality(
          generify(
            cleanTags(personality ?? "", `${characterName}'s Persona`),
            characterName,
          ),
        );
      } catch {
        const abortController = new AbortController();
        const { character_id } = detail.chat;
        const personaTag = `${characterName}'s Persona`;
        const personaResult = await attemptExtractSystemPrompt(
          character_id,
          personaTag,
          abortController.signal,
        );
        setLocalPersonality(
          generify(cleanTags(personaResult, personaTag), characterName),
        );
      }
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to fetch personality", [
        { text: "OK", onPress: dismissAlert },
      ]);
    } finally {
      setFetchingPersonality(false);
    }
  }, [activeChatId, showAlert, dismissAlert]);

  const handleFetchScenario = useCallback(async () => {
    if (!activeChatId) return;
    setFetchingScenario(true);
    try {
      const detail = useChatStore.getState().activeChatDetail;
      if (!detail) throw new Error("Chat not loaded");
      const characterName = detail.character.chat_name || detail.character.name;
      try {
        const prompt = await fetchSystemPrompt(detail);
        const { scenario } = processSystemMessage(prompt, characterName);
        setLocalScenario(
          generify(cleanTags(scenario ?? "", "Scenario"), characterName),
        );
      } catch {
        const abortController = new AbortController();
        const { character_id } = detail.chat;
        const scenario = await attemptExtractSystemPrompt(
          character_id,
          "Scenario",
          abortController.signal,
        );
        setLocalScenario(
          generify(cleanTags(scenario ?? "", "Scenario"), characterName),
        );
      }
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to fetch scenario", [
        { text: "OK" },
      ]);
    } finally {
      setFetchingScenario(false);
    }
  }, [activeChatId, showAlert]);

  const handleToggleLocalMode = useCallback(
    (v: boolean) => {
      setLocalLocalMode(v);
      setIsDirty(true);
    },
    [setIsDirty],
  );

  return {
    localLocalMode,
    localPersonality,
    localScenario,
    fetchingPersonality,
    fetchingScenario,
    setPersonality,
    setScenario,
    handleFetchPersonality,
    handleFetchScenario,
    handleToggleLocalMode,
  };
}

function useProxyEditor({
  setConfig,
  setIsDirty,
  showAlert,
}: {
  setConfig: Dispatch<SetStateAction<Config>>;
  setIsDirty: Dispatch<SetStateAction<boolean>>;
  showAlert: ShowAlert;
}) {
  const [editingProxy, setEditingProxy] = useState<ProxyConfiguration | null>(
    null,
  );
  const [editForm, setEditForm] = useState<ProxyEditForm>({
    name: "",
    model: "",
    apiUrl: "",
    apiKey: "",
    jailbreakPrompt: "",
  });
  const [showApiKey, setShowApiKey] = useState(false);

  const selectProxy = useCallback(
    (id: string) => {
      setConfig((c) => ({ ...c, selectedProxyConfigId: id }));
      setIsDirty(true);
    },
    [setConfig, setIsDirty],
  );

  const openEdit = useCallback((proxy: ProxyConfiguration) => {
    setEditingProxy(proxy);
    setEditForm({
      name: proxy.name,
      model: proxy.model,
      apiUrl: proxy.apiUrl,
      apiKey: proxy.apiKey,
      jailbreakPrompt: proxy.jailbreakPrompt,
    });
    setShowApiKey(false);
  }, []);

  const closeEdit = useCallback(() => setEditingProxy(null), []);

  const saveEdit = useCallback(() => {
    if (!editingProxy) return;
    setConfig((c) => ({
      ...c,
      proxyConfigurations: c.proxyConfigurations.map((p) =>
        p.id === editingProxy.id
          ? {
              ...p,
              name: editForm.name,
              model: editForm.model,
              apiUrl: editForm.apiUrl,
              apiKey: editForm.apiKey,
              jailbreakPrompt: editForm.jailbreakPrompt,
            }
          : p,
      ),
    }));
    setEditingProxy(null);
    setIsDirty(true);
  }, [editingProxy, editForm, setConfig, setIsDirty]);

  const duplicateProxy = useCallback(
    (proxy: ProxyConfiguration) => {
      setConfig((c) => ({
        ...c,
        proxyConfigurations: [
          ...c.proxyConfigurations,
          { ...proxy, id: newId(), name: `${proxy.name} (Copy)` },
        ],
      }));
      setIsDirty(true);
    },
    [setConfig, setIsDirty],
  );

  const deleteProxy = useCallback(
    (proxy: ProxyConfiguration) => {
      showAlert("Delete Proxy", `Delete "${proxy.name}"?`, [
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setConfig((c) => {
              const remaining = c.proxyConfigurations.filter(
                (p) => p.id !== proxy.id,
              );
              return {
                ...c,
                proxyConfigurations: remaining,
                selectedProxyConfigId:
                  c.selectedProxyConfigId === proxy.id && remaining.length > 0
                    ? remaining[0].id
                    : c.selectedProxyConfigId === proxy.id
                      ? ""
                      : c.selectedProxyConfigId,
              };
            });
          },
        },
        { text: "Cancel", style: "cancel" },
      ]);
    },
    [showAlert, setConfig],
  );

  const copyJson = useCallback(
    (proxy: ProxyConfiguration) => {
      showAlert("Proxy JSON", JSON.stringify(proxy, null, 2), [{ text: "OK" }]);
    },
    [showAlert],
  );

  return {
    editingProxy,
    editForm,
    setEditForm,
    showApiKey,
    setShowApiKey,
    selectProxy,
    openEdit,
    closeEdit,
    saveEdit,
    duplicateProxy,
    deleteProxy,
    copyJson,
  };
}

const ApiToggleRow = memo(function ApiToggleRow({
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
          style={[
            styles.apiToggleBtn,
            isJanitor && styles.apiToggleBtnActive,
          ]}
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
          style={[
            styles.apiToggleBtn,
            !isJanitor && styles.apiToggleBtnActive,
          ]}
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

const GlobalPromptInput = memo(function GlobalPromptInput({
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

const ProxyConfigList = memo(function ProxyConfigList({
  proxies,
  selectedId,
  onSelect,
  onEdit,
  onDuplicate,
  onCopyJson,
  onDelete,
}: {
  proxies: ProxyConfiguration[];
  selectedId: string;
  onSelect: (id: string) => void;
  onEdit: (proxy: ProxyConfiguration) => void;
  onDuplicate: (proxy: ProxyConfiguration) => void;
  onCopyJson: (proxy: ProxyConfiguration) => void;
  onDelete: (proxy: ProxyConfiguration) => void;
}) {
  return (
    <CollapsibleSection title="Proxy Configuration">
      {proxies.map((proxy) => {
        const active = proxy.id === selectedId;
        return (
          <View key={proxy.id} style={styles.proxyCard}>
            <Pressable
              style={[
                styles.proxyOption,
                active && styles.proxyOptionActive,
              ]}
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
                  {proxy.apiUrl}
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
                  >
                    <Text style={styles.proxyActionText}>Duplicate</Text>
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
                      style={[
                        styles.proxyActionText,
                        styles.proxyActionDelete,
                      ]}
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
    </CollapsibleSection>
  );
});

const ToggleRows = memo(function ToggleRows({
  gs,
  updateGen,
}: {
  gs: GenSettings;
  updateGen: UpdateGen;
}) {
  return (
    <>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Privacy Mode</Text>
        <Switch
          value={gs.privacy_mode}
          onValueChange={(v) => updateGen({ privacy_mode: v })}
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
    </>
  );
});

const LocalModeToggle = memo(function LocalModeToggle({
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

const LocalSettingsSection = memo(function LocalSettingsSection({
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

const GenerationSlidersSection = memo(function GenerationSlidersSection({
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

const AdvancedSlidersSection = memo(function AdvancedSlidersSection({
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

const PrefillSection = memo(function PrefillSection({
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

const ForbiddenWordsSection = memo(function ForbiddenWordsSection({
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

const SaveButton = memo(function SaveButton({
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

function ProxyEditModal({
  visible,
  form,
  setForm,
  showApiKey,
  setShowApiKey,
  onCancel,
  onSave,
  keyboardHeight,
}: {
  visible: boolean;
  form: ProxyEditForm;
  setForm: Dispatch<SetStateAction<ProxyEditForm>>;
  showApiKey: boolean;
  setShowApiKey: Dispatch<SetStateAction<boolean>>;
  onCancel: () => void;
  onSave: () => void;
  keyboardHeight: number;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      {Platform.OS === "ios" ? (
        <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
          <Pressable
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={onCancel}
          >
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <Text style={styles.modalTitle}>Edit Proxy</Text>
              <ScrollView
                style={styles.modalScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.editLabel}>Name</Text>
                <TextInput
                  style={styles.editInput}
                  value={form.name}
                  onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                  placeholderTextColor={colors.textDimAlt}
                />
                <Text style={styles.editLabel}>Model</Text>
                <TextInput
                  style={styles.editInput}
                  value={form.model}
                  onChangeText={(v) => setForm((f) => ({ ...f, model: v }))}
                  placeholderTextColor={colors.textDimAlt}
                />
                <Text style={styles.editLabel}>Proxy URL</Text>
                <TextInput
                  style={styles.editInput}
                  value={form.apiUrl}
                  onChangeText={(v) => setForm((f) => ({ ...f, apiUrl: v }))}
                  placeholderTextColor={colors.textDimAlt}
                  autoCapitalize="none"
                />
                <Text style={styles.editLabel}>API Key</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.editInput, { flex: 1, marginBottom: 0 }]}
                    value={form.apiKey}
                    onChangeText={(v) => setForm((f) => ({ ...f, apiKey: v }))}
                    placeholderTextColor={colors.textDimAlt}
                    secureTextEntry={!showApiKey}
                    autoCapitalize="none"
                  />
                  <Pressable
                    onPress={() => setShowApiKey((s) => !s)}
                    style={styles.showPassBtn}
                  >
                    <Text style={styles.showPassText}>
                      {showApiKey ? "\u25C9" : "\u25CE"}
                    </Text>
                  </Pressable>
                </View>
                <Text style={styles.editLabel}>Custom Prompt</Text>
                <TextInput
                  style={styles.editMultiline}
                  value={form.jailbreakPrompt}
                  onChangeText={(v) =>
                    setForm((f) => ({ ...f, jailbreakPrompt: v }))
                  }
                  placeholderTextColor={colors.textDimAlt}
                  multiline
                />
              </ScrollView>
              <View style={styles.modalActions}>
                <Pressable style={styles.modalCancelBtn} onPress={onCancel}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalSaveBtn} onPress={onSave}>
                  <Text style={styles.modalSaveText}>Save</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      ) : (
        <View
          style={[styles.modalOverlay, { paddingBottom: keyboardHeight }]}
        >
          <Pressable
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={onCancel}
          >
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <Text style={styles.modalTitle}>Edit Proxy</Text>
              <ScrollView
                style={styles.modalScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.editLabel}>Name</Text>
                <TextInput
                  style={styles.editInput}
                  value={form.name}
                  onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                  placeholderTextColor={colors.textDimAlt}
                />
                <Text style={styles.editLabel}>Model</Text>
                <TextInput
                  style={styles.editInput}
                  value={form.model}
                  onChangeText={(v) => setForm((f) => ({ ...f, model: v }))}
                  placeholderTextColor={colors.textDimAlt}
                />
                <Text style={styles.editLabel}>Proxy URL</Text>
                <TextInput
                  style={styles.editInput}
                  value={form.apiUrl}
                  onChangeText={(v) => setForm((f) => ({ ...f, apiUrl: v }))}
                  placeholderTextColor={colors.textDimAlt}
                  autoCapitalize="none"
                />
                <Text style={styles.editLabel}>API Key</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.editInput, { flex: 1, marginBottom: 0 }]}
                    value={form.apiKey}
                    onChangeText={(v) => setForm((f) => ({ ...f, apiKey: v }))}
                    placeholderTextColor={colors.textDimAlt}
                    secureTextEntry={!showApiKey}
                    autoCapitalize="none"
                  />
                  <Pressable
                    onPress={() => setShowApiKey((s) => !s)}
                    style={styles.showPassBtn}
                  >
                    <Text style={styles.showPassText}>
                      {showApiKey ? "\u25C9" : "\u25CE"}
                    </Text>
                  </Pressable>
                </View>
                <Text style={styles.editLabel}>Custom Prompt</Text>
                <TextInput
                  style={styles.editMultiline}
                  value={form.jailbreakPrompt}
                  onChangeText={(v) =>
                    setForm((f) => ({ ...f, jailbreakPrompt: v }))
                  }
                  placeholderTextColor={colors.textDimAlt}
                  multiline
                />
              </ScrollView>
              <View style={styles.modalActions}>
                <Pressable style={styles.modalCancelBtn} onPress={onCancel}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalSaveBtn} onPress={onSave}>
                  <Text style={styles.modalSaveText}>Save</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </View>
      )}
    </Modal>
  );
}

export default function GenerationSettingsScreen() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<ChatsStackParamList, "GenerationSettings">
    >();
  const { goBack } = navigation;
  const [config, setConfig] = useState<Config>(buildDefaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const fetchedRef = useRef(false);
  const activeChatId = useChatStore((s) => s.activeChatId);
  const keyboardHeight = useKeyboardHeight();
  const {
    alertVisible,
    alertTitle,
    alertMessage,
    alertButtons,
    showAlert,
    dismissAlert,
  } = useAlert();
  const proxy = useProxyEditor({ setConfig, setIsDirty, showAlert });
  const local = useLocalSettings({
    activeChatId,
    showAlert,
    dismissAlert,
    setIsDirty,
  });

  const updateGen = useCallback(
    (patch: Partial<Config["generation_settings"]>) => {
      setConfig((c) => ({
        ...c,
        generation_settings: { ...c.generation_settings, ...patch },
      }));
      setIsDirty(true);
    },
    [],
  );

  const handleApiSelect = useCallback((mode: "janitor" | "proxy") => {
    setConfig((c) =>
      mode === "janitor"
        ? { ...c, api: "janitor" }
        : { ...c, api: "openai", open_ai_mode: "proxy" },
    );
    setIsDirty(true);
  }, []);

  const updateGlobalPrompt = useCallback((v: string) => {
    setConfig((c) => ({ ...c, proxy_global_prompt: v }));
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateMyProfile(config);
      setIsDirty(false);
      showAlert("Saved", "Generation settings updated.", [
        { text: "OK", onPress: goBack },
      ]);
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to save settings", [
        { text: "OK" },
      ]);
    } finally {
      setSaving(false);
    }
  }, [config, goBack, showAlert]);

  const addBadWord = useCallback((word: string) => {
    setConfig((c) => ({ ...c, bad_words: [...c.bad_words, word] }));
    setIsDirty(true);
  }, []);

  const removeBadWord = useCallback((index: number) => {
    setConfig((c) => ({
      ...c,
      bad_words: c.bad_words.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  }, []);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const profile = await getMyProfile();
        if (cancelled) return;
        if (profile.config) {
          setConfig((prev) => ({
            ...prev,
            ...profile.config,
            generation_settings: {
              ...prev.generation_settings,
              ...profile.config.generation_settings,
            },
            bad_words: profile.config.bad_words ?? [],
          }));
        }
        setLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        showAlert("Error", err.message || "Failed to load settings", [
          { text: "OK" },
        ]);
        setLoading(false);
      }
    };
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [showAlert]);

  // Intercept back navigation when there are unsaved changes
  useEffect(() => {
    const onBeforeRemove = (e: any) => {
      if (!isDirty) return;

      e.preventDefault();

      showAlert(
        "Unsaved Changes",
        "You have unsaved changes. Discard them?",
        [
          { text: "Stay", style: "cancel" as const, onPress: () => {} },
          {
            text: "Leave",
            style: "destructive" as const,
            onPress: () => navigation.dispatch(e.data.action),
          },
        ],
      );
    };

    navigation.addListener("beforeRemove", onBeforeRemove);
    return () => navigation.removeListener("beforeRemove", onBeforeRemove);
  }, [navigation, isDirty, showAlert]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const gs = config.generation_settings;
  const isJanitor = config.api === "janitor";
  const isProxyMode = !isJanitor && config.open_ai_mode === "proxy";

  const scrollContent = (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <ApiToggleRow isJanitor={isJanitor} onSelect={handleApiSelect} />

      {isProxyMode && (
        <View style={styles.proxyWarning}>
          <Text style={styles.proxyWarningText}>
            Some characters do not allow proxy. Messages sent to those
            characters in proxy mode will fail. Switch to JanitorLLM or ensure
            the character allows proxy.
          </Text>
        </View>
      )}

      <GlobalPromptInput
        value={config.proxy_global_prompt}
        onChangeText={updateGlobalPrompt}
      />

      {!isJanitor && config.proxyConfigurations.length > 0 && (
        <ProxyConfigList
          proxies={config.proxyConfigurations}
          selectedId={config.selectedProxyConfigId}
          onSelect={proxy.selectProxy}
          onEdit={proxy.openEdit}
          onDuplicate={proxy.duplicateProxy}
          onCopyJson={proxy.copyJson}
          onDelete={proxy.deleteProxy}
        />
      )}

      <ToggleRows gs={gs} updateGen={updateGen} />

      <LocalModeToggle
        value={local.localLocalMode}
        onValueChange={local.handleToggleLocalMode}
      />

      {local.localLocalMode && (
        <LocalSettingsSection
          personality={local.localPersonality}
          scenario={local.localScenario}
          fetchingPersonality={local.fetchingPersonality}
          fetchingScenario={local.fetchingScenario}
          onPersonalityChange={local.setPersonality}
          onScenarioChange={local.setScenario}
          onFetchPersonality={local.handleFetchPersonality}
          onFetchScenario={local.handleFetchScenario}
        />
      )}

      <GenerationSlidersSection gs={gs} updateGen={updateGen} />
      <AdvancedSlidersSection gs={gs} updateGen={updateGen} />
      <PrefillSection gs={gs} updateGen={updateGen} />

      <ForbiddenWordsSection
        badWords={config.bad_words}
        onAddWord={addBadWord}
        onRemoveWord={removeBadWord}
      />

      <SaveButton saving={saving} onPress={handleSave} />
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Generation Settings" onBack={goBack} />

      {Platform.OS === "ios" ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          {scrollContent}
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
          {scrollContent}
        </View>
      )}

      <ProxyEditModal
        visible={proxy.editingProxy !== null}
        form={proxy.editForm}
        setForm={proxy.setEditForm}
        showApiKey={proxy.showApiKey}
        setShowApiKey={proxy.setShowApiKey}
        onCancel={proxy.closeEdit}
        onSave={proxy.saveEdit}
        keyboardHeight={keyboardHeight}
      />

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        buttons={alertButtons}
        onDismiss={dismissAlert}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.card,
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backText: { color: colors.accent, fontSize: 24, fontWeight: "600" },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },
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
  section: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionHeaderExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  sectionChevron: { color: colors.textFaint, fontSize: 10 },
  sectionBody: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
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
  toggleRowInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    marginBottom: 8,
  },
  toggleLabel: { color: colors.textSecondary, fontSize: 14 },

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

  saveContainer: { marginTop: 24, marginBottom: 20 },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveText: { color: colors.text, fontSize: 16, fontWeight: "700" },
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

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    width: "90%",
    maxHeight: "80%",
    padding: 20,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  modalScroll: { maxHeight: "100%" },
  editLabel: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    marginTop: 10,
  },
  editInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  showPassBtn: {
    padding: 8,
  },
  showPassText: { color: colors.textFaint, fontSize: 18 },
  editMultiline: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
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
    paddingVertical: 12,
    alignItems: "center",
  },
  modalSaveText: { color: colors.text, fontSize: 15, fontWeight: "700" },
  proxyWarning: {
    backgroundColor: colors.dangerLight,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  proxyWarningText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "500",
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
});
