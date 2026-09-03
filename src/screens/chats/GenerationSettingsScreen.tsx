import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ChatsStackParamList } from "../../navigation/types";
import { getApiSettings, updateApiSettings } from "../../api/settings";
import { colors } from "../../utils/colors";
import ScreenHeader from "../../components/common/ScreenHeader";
import CustomAlert from "../../components/common/CustomAlert";
import Skeleton from "../../components/common/Skeleton";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";
import { useAlert } from "../../hooks/useAlert";
import { useChatStore } from "../../stores/chatStore";
import { storage } from "../../utils/storage";
import { useProxyEditor } from "./generationSettings/useProxyEditor";
import { useLocalSettings } from "./generationSettings/useLocalSettings";
import ProxyEditModal from "./generationSettings/ProxyEditModal";
import PromptSelectorModal from "./generationSettings/PromptSelectorModal";
import {
  AdvancedSlidersSection,
  ApiToggleRow,
  ForbiddenWordsSection,
  GenerationSlidersSection,
  GlobalPromptInput,
  LocalModeToggle,
  LocalSettingsSection,
  PrefillSection,
  ProxyConfigList,
  SaveButton,
  ToggleRows,
} from "./generationSettings/sections";
import type {
  ApiProxyConfig,
  ApiSettingsGeneration,
  ApiSettingsSettings,
  PromptLibraryItem,
} from "./generationSettings/types";

function buildDefaultSettings(): ApiSettingsSettings {
  return {
    bad_words: [],
    claude_model: null,
    claude_prompt: null,
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
      enable_short_responses: false,
      enable_router_temperature: false,
    },
    janitor_prompt: null,
    migrated_from_legacy_at: "",
    openai_model: "",
    openai_prompt: { id: "" },
    proxy_global_prompt: null,
    router_enabled: false,
    selected_proxy_config_id: "",
    source: "janitor",
    updated_at: "",
  };
}

const GenerationSettingsSkeleton = React.memo(
  function GenerationSettingsSkeleton() {
    return (
      <View style={styles.container}>
        <View style={styles.skelScroll}>
          <Skeleton>
            <View style={styles.skelCard}>
              <View style={styles.skelLabelBar} />
              <View style={styles.skelBtnPair}>
                <View style={styles.skelBtn} />
                <View style={[styles.skelBtn, styles.skelBtnActive]} />
              </View>
            </View>

            {[0, 1].map((s) => (
              <View key={s} style={styles.skelSection}>
                <View style={styles.skelSectionHeader}>
                  <View style={styles.skelSectionTitle} />
                  <View style={styles.skelChevron} />
                </View>
                <View style={styles.skelSectionBody}>
                  {[0, 1].map((i) => (
                    <View key={i} style={styles.skelSlider}>
                      <View style={styles.skelLabelRow}>
                        <View style={styles.skelSliderLabel} />
                        <View style={styles.skelValueChip} />
                      </View>
                      <View style={styles.skelTrack} />
                    </View>
                  ))}
                </View>
              </View>
            ))}

            <View style={styles.skelSaveBtn} />
          </Skeleton>
        </View>
      </View>
    );
  },
);

export default function GenerationSettingsScreen() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<ChatsStackParamList, "GenerationSettings">
    >();
  const { goBack } = navigation;
  const [settings, setSettings] =
    useState<ApiSettingsSettings>(buildDefaultSettings);
  const [proxyConfigs, setProxyConfigs] = useState<ApiProxyConfig[]>([]);
  const [prompts, setPrompts] = useState<PromptLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const fetchedRef = useRef(false);
  const activeChatId = useChatStore((s) => s.activeChatId);
  const keyboardHeight = useKeyboardHeight();
  const { alert, showAlert, dismissAlert } = useAlert();
  const proxy = useProxyEditor({
    proxyConfigs,
    setProxyConfigs,
    setSettings,
    showAlert,
    dismissAlert,
    setIsDirty,
  });
  const local = useLocalSettings({
    activeChatId,
    showAlert,
    dismissAlert,
    setIsDirty,
  });

  const updateGen = useCallback((patch: Partial<ApiSettingsGeneration>) => {
    setSettings((s) => ({
      ...s,
      generation_settings: { ...s.generation_settings, ...patch },
    }));
    setIsDirty(true);
  }, []);

  const handleApiSelect = useCallback((mode: "janitor" | "proxy") => {
    setSettings((s) => ({ ...s, source: mode }));
    setIsDirty(true);
  }, []);

  const updateGlobalPrompt = useCallback((v: string) => {
    setSettings((s) => ({ ...s, proxy_global_prompt: v }));
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateApiSettings(settings);
      setIsDirty(false);
      showAlert("Saved", "Generation settings updated.", [
        { text: "OK", onPress: goBack },
      ]);
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to save settings", [
        { text: "OK", onPress: dismissAlert },
      ]);
    } finally {
      setSaving(false);
    }
  }, [settings, goBack, showAlert, dismissAlert]);

  const addBadWord = useCallback((word: string) => {
    setSettings((s) => ({ ...s, bad_words: [...s.bad_words, word] }));
    setIsDirty(true);
  }, []);

  const handlePrivacyModeChange = useCallback((v: boolean) => {
    setPrivacyMode(v);
    storage.setPrivacyMode(v);
  }, []);

  const removeBadWord = useCallback((index: number) => {
    setSettings((s) => ({
      ...s,
      bad_words: s.bad_words.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  }, []);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    let cancelled = false;
    const load = async () => {
      try {
        const [apiSettings, savedPrivacyMode] = await Promise.all([
          getApiSettings(),
          storage.getPrivacyMode(),
        ]);
        if (cancelled) return;
        setSettings(apiSettings.settings);
        setProxyConfigs(apiSettings.proxy_configs);
        setPrompts(apiSettings.prompts);
        setPrivacyMode(savedPrivacyMode);
        setLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        showAlert("Error", err.message || "Failed to load settings", [
          { text: "OK", onPress: dismissAlert },
        ]);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [showAlert, dismissAlert]);

  useEffect(() => {
    const onBeforeRemove = (e: any) => {
      if (!isDirty) return;
      e.preventDefault();
      showAlert("Unsaved Changes", "You have unsaved changes. Discard them?", [
        { text: "Stay", style: "cancel" as const, onPress: dismissAlert },
        {
          text: "Leave",
          style: "destructive" as const,
          onPress: () => navigation.dispatch(e.data.action),
        },
      ]);
    };
    navigation.addListener("beforeRemove", onBeforeRemove);
    return () => navigation.removeListener("beforeRemove", onBeforeRemove);
  }, [navigation, isDirty, showAlert, dismissAlert]);

  if (loading) {
    return <GenerationSettingsSkeleton />;
  }

  const gs = settings.generation_settings;
  const isJanitor = settings.source === "janitor";
  const isProxyMode = settings.source === "proxy";

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
        value={settings.proxy_global_prompt ?? ""}
        onChangeText={updateGlobalPrompt}
      />

      {!isJanitor && (
        <ProxyConfigList
          proxies={proxyConfigs}
          selectedId={settings.selected_proxy_config_id}
          duplicatingId={proxy.duplicatingId}
          onSelect={proxy.selectProxy}
          onEdit={proxy.openEdit}
          onAdd={proxy.openAdd}
          onDuplicate={proxy.duplicateProxy}
          onCopyJson={proxy.copyJson}
          onDelete={proxy.deleteProxy}
        />
      )}

      <ToggleRows
        gs={gs}
        isJanitor={isJanitor}
        privacyMode={privacyMode}
        updateGen={updateGen}
        onPrivacyModeChange={handlePrivacyModeChange}
      />

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
        badWords={settings.bad_words}
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
        visible={proxy.editingProxyId !== null}
        form={proxy.editForm}
        setForm={proxy.setEditForm}
        showApiKey={proxy.showApiKey}
        setShowApiKey={proxy.setShowApiKey}
        saving={proxy.proxySaving}
        prompts={prompts}
        onCancel={proxy.closeEdit}
        onSave={proxy.saveEdit}
        onOpenPromptSelector={proxy.openPromptSelector}
        keyboardHeight={keyboardHeight}
        isCreating={proxy.isCreatingProxy}
      />

      <PromptSelectorModal
        visible={proxy.promptSelectorVisible}
        prompts={prompts}
        setPrompts={setPrompts}
        selectedPromptId={proxy.editForm.prompt_id}
        onSelect={(id) => proxy.setEditForm((f) => ({ ...f, prompt_id: id }))}
        onClose={proxy.closePromptSelector}
        showAlert={showAlert}
        dismissAlert={dismissAlert}
      />

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        onDismiss={dismissAlert}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  skelScroll: {
    flex: 1,
    padding: 16,
  },
  skelCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  skelLabelBar: {
    width: 90,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
    marginBottom: 10,
  },
  skelBtnPair: {
    flexDirection: "row",
    gap: 8,
  },
  skelBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  skelBtnActive: {
    backgroundColor: colors.accentSoft,
  },
  skelSection: {
    marginBottom: 16,
  },
  skelSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  skelSectionTitle: {
    width: 130,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  skelChevron: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  skelSectionBody: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.border,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  skelSlider: {
    marginBottom: 20,
  },
  skelLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  skelSliderLabel: {
    width: 80,
    height: 11,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  skelValueChip: {
    width: 40,
    height: 18,
    borderRadius: 6,
    backgroundColor: colors.accentSoft,
  },
  skelTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  skelSaveBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    marginTop: 8,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },
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
});
