import { useState, useCallback, useEffect, useMemo } from "react";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { uploadFile } from "../../../api/profile";
import {
  getTags,
  getCharacterDetail,
  createCharacter,
  updateCharacter,
} from "../../../api/characters";
import { storage } from "../../../utils/storage";
import type { CreateStackParamList } from "../../../navigation/types";
import type {
  CreateCharacterRequest,
  CharacterResponse,
  CharacterTag,
} from "../../../types/api";
import type {
  AlertButton,
} from "../../../components/common/CustomAlert";
import { useKeyboardHeight } from "../../../hooks/useKeyboardHeight";
import {
  type BotFormState,
  type TagEntry,
  EMPTY_FORM,
  persistForm,
  clearPersistedForm,
} from "./botFormState";

type Route = RouteProp<CreateStackParamList, "CreateBot">;
type Nav = NativeStackNavigationProp<CreateStackParamList, "CreateBot">;

export function useCreateBotForm() {
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

  const showAlert = useCallback(
    (title: string, message: string, buttons: AlertButton[]) => {
      setAlertTitle(title);
      setAlertMessage(message);
      setAlertButtons(buttons);
      setAlertVisible(true);
    },
    [],
  );

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
      showAlert("Permission needed", "Allow access to photos to upload a bot avatar.", [
        { text: "OK", onPress: () => setAlertVisible(false) },
      ]);
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
      const [manipResult, upload] = await Promise.all([
        ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 256, height: 256 } }],
          { format: ImageManipulator.SaveFormat.WEBP, compress: 0.85 },
        ),
        uploadFile("webp", "bot"),
      ]);

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
      showAlert("Error", "Failed to upload avatar", [
        { text: "OK", onPress: () => setAlertVisible(false) },
      ]);
    } finally {
      setUploading(false);
    }
  }, [showAlert]);

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
      showAlert("Error", "Name is required", [
        { text: "OK", onPress: () => setAlertVisible(false) },
      ]);
      return;
    }
    if (form.first_messages.filter((m) => m.trim()).length === 0) {
      showAlert("Error", "At least one first message is required", [
        { text: "OK", onPress: () => setAlertVisible(false) },
      ]);
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
      showAlert("Error", err?.message || "Failed to save character", [
        { text: "OK", onPress: () => setAlertVisible(false) },
      ]);
    } finally {
      setSaving(false);
    }
  }, [form, isEditMode, characterId, buildRequest, navigate, showAlert]);

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
