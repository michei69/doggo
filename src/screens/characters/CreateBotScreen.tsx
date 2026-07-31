import { useState, useCallback, useEffect, useMemo, memo } from "react";
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
  RefreshControl,
  Modal,
} from "react-native";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import ScreenHeader from "../../components/common/ScreenHeader";
import Button from "../../components/common/Button";
import Avatar from "../../components/common/Avatar";
import TextInput from "../../components/common/TextInput";
import { uploadFile } from "../../api/profile";
import {
  getTags,
  getCharacterDetail,
  createCharacter,
  updateCharacter,
} from "../../api/characters";
import { storage } from "../../utils/storage";
import { colors } from "../../utils/colors";
import type { CreateStackParamList } from "../../navigation/types";
import type {
  CreateCharacterRequest,
  CharacterResponse,
  CharacterTag,
} from "../../types/api";
import { botAvatarUrl } from "../../utils/assets";
import CustomAlert, {
  type AlertButton,
} from "../../components/common/CustomAlert";
import { EnrichedMarkdownText } from "react-native-enriched-markdown";
import { markdownStyle } from "../../utils/markdownStyle";
import { useNavigateToJanitorLink } from "../../utils/janitorLinks";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";

type Route = RouteProp<CreateStackParamList, "CreateBot">;
type Nav = NativeStackNavigationProp<CreateStackParamList, "CreateBot">;

interface BotFormState {
  avatar: string;
  name: string;
  chat_name: string;
  description: string;
  personality: string;
  scenario: string;
  example_dialogs: string;
  first_messages: string[];
  is_nsfw: boolean;
  tag_ids: number[];
  custom_tags: string[];
  editCharacterId?: string;
}

const EMPTY_FORM: BotFormState = {
  avatar: "",
  name: "",
  chat_name: "",
  description: "",
  personality: "",
  scenario: "",
  example_dialogs: "",
  first_messages: [""],
  is_nsfw: false,
  tag_ids: [],
  custom_tags: [],
};

interface TagEntry {
  id: number;
  name: string;
  slug: string;
}

function persistForm(form: BotFormState, isEditMode: boolean): void {
  if (isEditMode) {
    storage.setEditBotState(form);
  } else {
    storage.setCreateBotState(form);
  }
}

function clearPersistedForm(isEditMode: boolean): void {
  if (isEditMode) {
    storage.removeEditBotState();
  } else {
    storage.removeCreateBotState();
  }
}

function useCreateBotForm() {
  const route = useRoute<Route>();
  const { navigate, goBack } = useNavigation<Nav>();
  const characterId = route.params?.characterId;
  const isEditMode = !!characterId;

  const [form, setForm] = useState<BotFormState>(EMPTY_FORM);
  const [allTags, setAllTags] = useState<TagEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [firstMsgIndex, setFirstMsgIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertButtons, setAlertButtons] = useState<AlertButton[]>([]);
  const keyboardHeight = useKeyboardHeight();
  const [tagSearch, setTagSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadState = async () => {
      try {
        if (isEditMode && characterId) {
          const savedEdit = await storage.getEditBotState<BotFormState>();
          if (cancelled) return;
          if (savedEdit && savedEdit.editCharacterId === characterId) {
            setForm(savedEdit);
          } else {
            const char = await getCharacterDetail(characterId);
            if (cancelled) return;
            const editState: BotFormState = {
              avatar: char.avatar ?? "",
              name: char.name ?? "",
              chat_name: char.chat_name ?? "",
              description: char.description ?? "",
              personality: char.personality ?? "",
              scenario: char.scenario ?? "",
              example_dialogs: char.example_dialogs ?? "",
              first_messages:
                char.first_messages.length > 0 ? char.first_messages : [""],
              is_nsfw: char.is_nsfw,
              tag_ids: char.tags.map((t) => t.id),
              custom_tags: char.custom_tags ?? [],
              editCharacterId: characterId,
            };
            setForm(editState);
            storage.setEditBotState(editState);
          }
        } else {
          const saved = await storage.getCreateBotState<BotFormState>();
          if (cancelled) return;
          if (saved) {
            setForm(saved);
          }
        }
      } catch {
        // Failed to load persisted state — start fresh
      } finally {
        if (cancelled) return;
        setLoaded(true);
      }
    };
    loadState();
    return () => {
      cancelled = true;
    };
  }, [isEditMode, characterId]);

  useFocusEffect(
    useCallback(() => {
      if (isEditMode) return;
      const reloadCreateState = async () => {
        try {
          const saved = await storage.getCreateBotState<BotFormState>();
          if (saved) {
            setForm(saved);
            setFirstMsgIndex(0);
            setTagSearch("");
          }
        } catch {
          // Silently fail — keep current form
        }
      };
      reloadCreateState();
    }, [isEditMode]),
  );

  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      persistForm(form, isEditMode);
    }, 400);
    return () => clearTimeout(timer);
  }, [form, loaded, isEditMode]);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await getTags();
        setAllTags(
          tags.map((t: CharacterTag) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
          })),
        );
      } catch {
        // Tags are optional — fail silently
      }
    };
    fetchTags();
  }, []);

  useEffect(() => {
    setFirstMsgIndex((i) =>
      Math.min(i, Math.max(0, form.first_messages.length - 1)),
    );
  }, [form.first_messages.length]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (isEditMode && characterId) {
        const char = await getCharacterDetail(characterId);
        const editState: BotFormState = {
          avatar: char.avatar ?? "",
          name: char.name ?? "",
          chat_name: char.chat_name ?? "",
          description: char.description ?? "",
          personality: char.personality ?? "",
          scenario: char.scenario ?? "",
          example_dialogs: char.example_dialogs ?? "",
          first_messages:
            char.first_messages.length > 0 ? char.first_messages : [""],
          is_nsfw: char.is_nsfw,
          tag_ids: char.tags.map((t) => t.id),
          custom_tags: char.custom_tags ?? [],
          editCharacterId: characterId,
        };
        setForm(editState);
        storage.setEditBotState(editState);
      } else {
        const saved = await storage.getCreateBotState<BotFormState>();
        if (saved) {
          setForm(saved);
        }
      }
    } catch {
      // Silently fail on refresh
    } finally {
      setRefreshing(false);
    }
  }, [isEditMode, characterId]);

  const handlePickAndUploadAvatar = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Allow access to photos to upload a bot avatar.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 256, height: 256 } }],
        { format: ImageManipulator.SaveFormat.WEBP, compress: 0.85 },
      );

      const upload = await uploadFile("webp", "bot");

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", upload.url);
        xhr.setRequestHeader("Content-Type", "image/webp");
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`HTTP ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send({
          uri: manipResult.uri,
          type: "image/webp",
          name: "bot.webp",
        } as any);
      });
      setForm((f) => ({ ...f, avatar: upload.filename }));
    } catch {
      Alert.alert("Error", "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  }, []);

  const setField = useCallback(
    <K extends keyof BotFormState>(key: K, value: BotFormState[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
    },
    [],
  );

  const toggleTag = useCallback((tagId: number) => {
    setForm((f) => {
      const alreadySelected = f.tag_ids.includes(tagId);
      if (!alreadySelected && f.tag_ids.length + f.custom_tags.length >= 10) {
        return f;
      }
      const ids = alreadySelected
        ? f.tag_ids.filter((id) => id !== tagId)
        : [...f.tag_ids, tagId];
      return { ...f, tag_ids: ids };
    });
  }, []);

  const addCustomTag = useCallback(() => {
    const trimmed = tagSearch.trim();
    if (!trimmed) return;
    if (form.custom_tags.includes(trimmed)) {
      setTagSearch("");
      return;
    }
    if (form.custom_tags.length + form.tag_ids.length >= 10) return;
    setForm((f) => ({ ...f, custom_tags: [...f.custom_tags, trimmed] }));
    setTagSearch("");
  }, [tagSearch, form.custom_tags, form.tag_ids.length]);

  const removeCustomTag = useCallback((tag: string) => {
    setForm((f) => ({
      ...f,
      custom_tags: f.custom_tags.filter((t) => t !== tag),
    }));
  }, []);

  const updateFirstMessage = useCallback((index: number, value: string) => {
    setForm((f) => {
      const msgs = [...f.first_messages];
      msgs[index] = value;
      return { ...f, first_messages: msgs };
    });
  }, []);

  const addFirstMessage = useCallback(() => {
    setForm((f) => {
      if (f.first_messages.length >= 10) return f;
      return { ...f, first_messages: [...f.first_messages, ""] };
    });
    setFirstMsgIndex(form.first_messages.length);
  }, [form.first_messages.length]);

  const removeFirstMessage = useCallback(
    (index: number) => {
      setForm((f) => {
        const msgs = f.first_messages.filter((_, i) => i !== index);
        return { ...f, first_messages: msgs.length > 0 ? msgs : [""] };
      });
      setFirstMsgIndex((i) =>
        Math.min(i, Math.max(0, form.first_messages.length - 2)),
      );
    },
    [form.first_messages.length],
  );

  const handleDeleteFirstMessage = useCallback(() => {
    setAlertTitle("Delete Message");
    setAlertMessage(
      `Delete first message ${firstMsgIndex + 1}? This cannot be undone.`,
    );
    setAlertButtons([
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setAlertVisible(false);
          removeFirstMessage(firstMsgIndex);
        },
      },
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => setAlertVisible(false),
      },
    ]);
    setAlertVisible(true);
  }, [firstMsgIndex, removeFirstMessage]);

  const handlePreviewFirstMessage = useCallback(() => {
    setPreviewVisible(true);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewVisible(false);
  }, []);

  const goToPrevFirstMessage = useCallback(() => {
    setFirstMsgIndex((i) => Math.max(0, i - 1));
  }, []);

  const goToNextFirstMessage = useCallback(() => {
    setFirstMsgIndex((i) =>
      Math.min(form.first_messages.length - 1, i + 1),
    );
  }, [form.first_messages.length]);

  const selectLimited = useCallback(() => {
    setField("is_nsfw", false);
  }, [setField]);

  const selectLimitless = useCallback(() => {
    setField("is_nsfw", true);
  }, [setField]);

  const buildRequest = useCallback((): CreateCharacterRequest => {
    const nonEmptyMessages = form.first_messages.filter((m) => m.trim());
    return {
      avatar: form.avatar,
      chat_name: form.chat_name.trim() || null,
      custom_tags: form.custom_tags,
      description: form.description,
      example_dialogs: form.example_dialogs,
      first_message: "",
      first_messages: nonEmptyMessages,
      is_nsfw: form.is_nsfw,
      name: form.name,
      personality: form.personality,
      scenario: form.scenario,
      scheduled_publish_at: null,
      silent_publish: null,
      tag_ids: form.tag_ids,
      token_counts: {
        example_dialog_tokens: 0,
        first_message_tokens: 0,
        first_messages_tokens: nonEmptyMessages.map(() => 0),
        personality_tokens: 0,
        scenario_tokens: 0,
        total_tokens: 0,
      },
    };
  }, [form]);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }
    if (form.first_messages.filter((m) => m.trim()).length === 0) {
      Alert.alert("Error", "At least one first message is required");
      return;
    }

    setSaving(true);
    try {
      const request = buildRequest();
      let response: CharacterResponse;

      if (isEditMode && characterId) {
        response = await updateCharacter(characterId, request);
      } else {
        response = await createCharacter(request);
      }

      clearPersistedForm(isEditMode);
      setForm(EMPTY_FORM);
      setFirstMsgIndex(0);
      setTagSearch("");

      navigate("CreateCharacterScreen", {
        characterId: response.id,
        characterName: response.name,
      });
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save character");
    } finally {
      setSaving(false);
    }
  }, [form, isEditMode, characterId, buildRequest, navigate]);

  const handleReset = useCallback(() => {
    setAlertTitle("Reset Form");
    setAlertMessage(
      "Clear all fields and start over? This cannot be undone.",
    );
    setAlertButtons([
      {
        text: "Reset",
        style: "destructive",
        onPress: () => {
          setAlertVisible(false);
          setForm(EMPTY_FORM);
          setFirstMsgIndex(0);
          setTagSearch("");
          clearPersistedForm(isEditMode);
        },
      },
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => setAlertVisible(false),
      },
    ]);
    setAlertVisible(true);
  }, [isEditMode]);

  const filteredTags = useMemo(
    () =>
      allTags.filter(
        (t) =>
          !tagSearch ||
          t.name.toLowerCase().includes(tagSearch.toLowerCase()) ||
          t.slug.toLowerCase().includes(tagSearch.toLowerCase()),
      ),
    [allTags, tagSearch],
  );

  const selectedTagIdsSet = useMemo(
    () => new Set(form.tag_ids),
    [form.tag_ids],
  );

  return {
    addCustomTag,
    addFirstMessage,
    alertButtons,
    alertMessage,
    alertTitle,
    alertVisible,
    closePreview,
    firstMsgIndex,
    filteredTags,
    form,
    goBack,
    goToNextFirstMessage,
    goToPrevFirstMessage,
    handleDeleteFirstMessage,
    handlePickAndUploadAvatar,
    handlePreviewFirstMessage,
    handleRefresh,
    handleReset,
    handleSave,
    isEditMode,
    keyboardHeight,
    loaded,
    previewVisible,
    refreshing,
    removeCustomTag,
    saving,
    selectLimited,
    selectLimitless,
    selectedTagIdsSet,
    setAlertVisible,
    setField,
    setTagSearch,
    tagSearch,
    toggleTag,
    updateFirstMessage,
    uploading,
  };
}

function AvatarPicker({
  uri,
  name,
  uploading,
  onPress,
}: {
  uri: string;
  name: string;
  uploading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.avatarRow}>
      <View style={styles.avatarWrap}>
        <Avatar uri={uri} name={name} size={80} />
      </View>
      <View style={styles.avatarTextCol}>
        <Text style={styles.avatarLabel}>Avatar</Text>
        <Text style={styles.avatarHint}>
          {uploading ? "Uploading..." : "Tap to upload (256×256)"}
        </Text>
      </View>
      {uploading && <ActivityIndicator color={colors.accent} size="small" />}
    </Pressable>
  );
}

const AvatarPickerMemo = memo(AvatarPicker);

function MultilineField({
  label,
  value,
  placeholder,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDimAlt}
        multiline
        textAlignVertical="top"
        style={[styles.input, styles.multilineInput]}
      />
    </View>
  );
}

const MultilineFieldMemo = memo(MultilineField);

function FirstMessageEditor({
  value,
  index,
  count,
  onChange,
  onPreview,
  onAdd,
  onDelete,
  onPrev,
  onNext,
}: {
  value: string;
  index: number;
  count: number;
  onChange: (index: number, value: string) => void;
  onPreview: () => void;
  onAdd: () => void;
  onDelete: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.label}>
          First Messages ({index + 1}/{count})
        </Text>
        <View style={styles.firstMsgActions}>
          <Pressable onPress={onPreview} style={styles.previewBtn}>
            <Text style={styles.previewBtnText}>Preview</Text>
          </Pressable>
          {count < 10 && (
            <Pressable onPress={onAdd} style={styles.addBtn}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </Pressable>
          )}
          {count > 1 && (
            <Pressable onPress={onDelete} style={styles.removeBtn}>
              <Text style={styles.removeBtnText}>- Del</Text>
            </Pressable>
          )}
        </View>
      </View>
      <View style={styles.firstMsgRow}>
        <RNTextInput
          value={value}
          onChangeText={(v) => onChange(index, v)}
          placeholder={`Message ${index + 1}`}
          placeholderTextColor={colors.textDimAlt}
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.firstMsgInput]}
        />
      </View>
      {count > 1 && (
        <View style={styles.firstMsgNav}>
          <Pressable
            onPress={onPrev}
            disabled={index === 0}
            style={[styles.navBtn, index === 0 && styles.navBtnDisabled]}
          >
            <Text
              style={[
                styles.navBtnText,
                index === 0 && styles.navBtnTextDisabled,
              ]}
            >
              ← Prev
            </Text>
          </Pressable>
          <Pressable
            onPress={onNext}
            disabled={index >= count - 1}
            style={[
              styles.navBtn,
              index >= count - 1 && styles.navBtnDisabled,
            ]}
          >
            <Text
              style={[
                styles.navBtnText,
                index >= count - 1 && styles.navBtnTextDisabled,
              ]}
            >
              Next →
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const FirstMessageEditorMemo = memo(FirstMessageEditor);

function ContentRatingToggle({
  isNsfw,
  onSelectLimited,
  onSelectLimitless,
}: {
  isNsfw: boolean;
  onSelectLimited: () => void;
  onSelectLimitless: () => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>Content Rating</Text>
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleOption, !isNsfw && styles.toggleActive]}
          onPress={onSelectLimited}
        >
          <Text
            style={[styles.toggleText, !isNsfw && styles.toggleTextActive]}
          >
            Limited
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleOption, isNsfw && styles.toggleActive]}
          onPress={onSelectLimitless}
        >
          <Text style={[styles.toggleText, isNsfw && styles.toggleTextActive]}>
            Limitless
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const ContentRatingToggleMemo = memo(ContentRatingToggle);

function TagEditor({
  customTags,
  selectedCount,
  tagSearch,
  selectedTagIdsSet,
  filteredTags,
  onRemoveTag,
  onAddTag,
  onToggleTag,
  onSearchChange,
}: {
  customTags: string[];
  selectedCount: number;
  tagSearch: string;
  selectedTagIdsSet: Set<number>;
  filteredTags: TagEntry[];
  onRemoveTag: (tag: string) => void;
  onAddTag: () => void;
  onToggleTag: (tagId: number) => void;
  onSearchChange: (text: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>
        Tags ({customTags.length + selectedCount}/10)
      </Text>

      {customTags.length > 0 && (
        <View style={styles.chipRow}>
          {customTags.map((tag) => (
            <Pressable
              key={`custom-${tag}`}
              style={styles.chipSelected}
              onPress={() => onRemoveTag(tag)}
            >
              <Text style={styles.chipSelectedText}>{tag} ✕</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.customTagRow}>
        <RNTextInput
          value={tagSearch}
          onChangeText={onSearchChange}
          placeholder="Add custom tag..."
          placeholderTextColor={colors.textDimAlt}
          style={[styles.input, styles.customTagInput]}
          onSubmitEditing={onAddTag}
          returnKeyType="done"
        />
        <Pressable onPress={onAddTag} style={styles.addTagBtn}>
          <Text style={styles.addTagBtnText}>Add</Text>
        </Pressable>
      </View>

      {filteredTags.length > 0 && (
        <View style={styles.chipRow}>
          {filteredTags.map((tag) => {
            const selected = selectedTagIdsSet.has(tag.id);
            return (
              <Pressable
                key={tag.id}
                style={selected ? styles.chipSelected : styles.chip}
                onPress={() => onToggleTag(tag.id)}
              >
                <Text
                  style={
                    selected ? styles.chipSelectedText : styles.chipText
                  }
                >
                  {tag.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const TagEditorMemo = memo(TagEditor);

function SaveBar({
  isEditMode,
  saving,
  onSave,
  onReset,
}: {
  isEditMode: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <>
      <Button
        title={isEditMode ? "Save Changes" : "Create Bot"}
        onPress={onSave}
        loading={saving}
        style={styles.saveBtn}
      />
      <Button
        title="Reset"
        onPress={onReset}
        variant="outline"
        style={styles.resetBtn}
      />
    </>
  );
}

const SaveBarMemo = memo(SaveBar);

function PreviewModal({
  visible,
  message,
  index,
  onClose,
  onLinkPress,
}: {
  visible: boolean;
  message: string;
  index: number;
  onClose: () => void;
  onLinkPress: ({ url }: { url: string }) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.previewOverlay}>
        <View style={styles.previewModal}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>
              Preview — Message {index + 1}
            </Text>
            <Pressable onPress={onClose}>
              <Text style={styles.previewClose}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.previewScroll}>
            <View style={styles.previewBubble}>
              <EnrichedMarkdownText
                markdown={message}
                markdownStyle={markdownStyle}
                onLinkPress={onLinkPress}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const PreviewModalMemo = memo(PreviewModal);

export default function CreateBotScreen() {
  const onLinkPress = useNavigateToJanitorLink();

  const {
    addCustomTag,
    addFirstMessage,
    alertButtons,
    alertMessage,
    alertTitle,
    alertVisible,
    closePreview,
    firstMsgIndex,
    filteredTags,
    form,
    goBack,
    goToNextFirstMessage,
    goToPrevFirstMessage,
    handleDeleteFirstMessage,
    handlePickAndUploadAvatar,
    handlePreviewFirstMessage,
    handleRefresh,
    handleReset,
    handleSave,
    isEditMode,
    keyboardHeight,
    loaded,
    previewVisible,
    refreshing,
    removeCustomTag,
    saving,
    selectLimited,
    selectLimitless,
    selectedTagIdsSet,
    setAlertVisible,
    setField,
    setTagSearch,
    tagSearch,
    toggleTag,
    updateFirstMessage,
    uploading,
  } = useCreateBotForm();

  const onDescriptionChange = useCallback(
    (v: string) => setField("description", v),
    [setField],
  );
  const onPersonalityChange = useCallback(
    (v: string) => setField("personality", v),
    [setField],
  );
  const onScenarioChange = useCallback(
    (v: string) => setField("scenario", v),
    [setField],
  );
  const onExampleDialogsChange = useCallback(
    (v: string) => setField("example_dialogs", v),
    [setField],
  );

  if (!loaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={isEditMode ? "Edit Bot" : "Create Bot"}
        onBack={goBack}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            Platform.OS === "android" && { paddingBottom: keyboardHeight + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        >
          <AvatarPickerMemo
            uri={form.avatar ? botAvatarUrl(form.avatar) : ""}
            name={form.name}
            uploading={uploading}
            onPress={handlePickAndUploadAvatar}
          />
          <TextInput
            label="Name"
            value={form.name}
            onChangeText={(v) => setField("name", v)}
            placeholder="Character name"
          />
          <TextInput
            label="Chat Name (optional)"
            value={form.chat_name}
            onChangeText={(v) => setField("chat_name", v)}
            placeholder="Name shown in chat"
          />
          <MultilineFieldMemo
            label="Description"
            value={form.description}
            placeholder="Describe the character..."
            onChangeText={onDescriptionChange}
          />
          <MultilineFieldMemo
            label="Personality"
            value={form.personality}
            placeholder="Character personality traits..."
            onChangeText={onPersonalityChange}
          />
          <MultilineFieldMemo
            label="Scenario"
            value={form.scenario}
            placeholder="Roleplay scenario..."
            onChangeText={onScenarioChange}
          />
          <MultilineFieldMemo
            label="Example Dialogs"
            value={form.example_dialogs}
            placeholder="{{char}}: ...\n{{user}}: ..."
            onChangeText={onExampleDialogsChange}
          />
          <FirstMessageEditorMemo
            value={form.first_messages[firstMsgIndex] ?? ""}
            index={firstMsgIndex}
            count={form.first_messages.length}
            onChange={updateFirstMessage}
            onPreview={handlePreviewFirstMessage}
            onAdd={addFirstMessage}
            onDelete={handleDeleteFirstMessage}
            onPrev={goToPrevFirstMessage}
            onNext={goToNextFirstMessage}
          />
          <ContentRatingToggleMemo
            isNsfw={form.is_nsfw}
            onSelectLimited={selectLimited}
            onSelectLimitless={selectLimitless}
          />
          <TagEditorMemo
            customTags={form.custom_tags}
            selectedCount={form.tag_ids.length}
            tagSearch={tagSearch}
            selectedTagIdsSet={selectedTagIdsSet}
            filteredTags={filteredTags}
            onRemoveTag={removeCustomTag}
            onAddTag={addCustomTag}
            onToggleTag={toggleTag}
            onSearchChange={setTagSearch}
          />
          <SaveBarMemo
            isEditMode={isEditMode}
            saving={saving}
            onSave={handleSave}
            onReset={handleReset}
          />
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        buttons={alertButtons}
        onDismiss={() => setAlertVisible(false)}
      />

      <PreviewModalMemo
        visible={previewVisible}
        message={form.first_messages[firstMsgIndex] ?? ""}
        index={firstMsgIndex}
        onClose={closePreview}
        onLinkPress={onLinkPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  avatarWrap: {
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.accent,
    overflow: "hidden",
  },
  avatarTextCol: {
    flex: 1,
  },
  avatarLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  avatarHint: {
    color: colors.textMuted,
    fontSize: 13,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 6,
    fontWeight: "500",
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 100,
    paddingTop: 14,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  firstMsgActions: {
    flexDirection: "row",
    gap: 8,
  },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: colors.accentFaded,
    borderRadius: 8,
  },
  previewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  previewBtnText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  addBtnText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  firstMsgRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  firstMsgInput: {
    flex: 1,
    minHeight: 60,
    paddingTop: 10,
  },
  removeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: colors.dangerLight,
    borderRadius: 8,
  },
  removeBtnText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "700",
  },
  firstMsgNav: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
  },
  navBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  navBtnTextDisabled: {
    color: colors.textDimAlt,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewModal: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    width: "90%",
    maxHeight: "70%",
    padding: 20,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  previewTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  previewClose: {
    color: colors.textFaint,
    fontSize: 18,
    padding: 4,
  },
  previewScroll: {
    maxHeight: "100%",
  },
  previewBubble: {
    backgroundColor: colors.background,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  toggleActive: {
    backgroundColor: colors.accent,
  },
  toggleText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: "600",
  },
  toggleTextActive: {
    color: colors.text,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  chipSelected: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.accentFaded,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  chipSelectedText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  customTagRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  customTagInput: {
    flex: 1,
  },
  addTagBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.accent,
    borderRadius: 12,
    justifyContent: "center",
  },
  addTagBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  saveBtn: {
    marginTop: 12,
  },
  resetBtn: {
    marginTop: 12,
  },
  bottomSpacer: {
    height: 40,
  },
});
