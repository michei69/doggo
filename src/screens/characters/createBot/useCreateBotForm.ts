import { useState, useCallback, useEffect, useMemo } from "react";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { pickAndUploadAvatar } from "../../../api/uploads";
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
  TagEntry,
} from "../../../types/api";
import { useAlert } from "../../../hooks/useAlert";
import { useKeyboardHeight } from "../../../hooks/useKeyboardHeight";
import { tagsToTagEntries } from "../characterSearch/searchUtils";
import {
  type BotFormState,
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
  const { alert, showAlert, dismissAlert } = useAlert();

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
        setAllTags(tagsToTagEntries(tags));
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
    setUploading(true);
    try {
      const result = await pickAndUploadAvatar("bot", "bot.webp");
      if (result.status === "denied") {
        showAlert("Permission needed", "Allow access to photos to upload a bot avatar.", [
          { text: "OK", onPress: dismissAlert },
        ]);
        return;
      }
      if (result.status === "cancelled") return;
      setForm((f) => ({ ...f, avatar: result.filename }));
    } catch {
      showAlert("Error", "Failed to upload avatar", [
        { text: "OK", onPress: dismissAlert },
      ]);
    } finally {
      setUploading(false);
    }
  }, [showAlert, dismissAlert]);

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
    showAlert(
      "Delete Message",
      `Delete first message ${firstMsgIndex + 1}? This cannot be undone.`,
      [
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            dismissAlert();
            removeFirstMessage(firstMsgIndex);
          },
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: dismissAlert,
        },
      ],
    );
  }, [firstMsgIndex, removeFirstMessage, showAlert, dismissAlert]);

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
        { text: "OK", onPress: dismissAlert },
      ]);
      return;
    }
    if (form.first_messages.filter((m) => m.trim()).length === 0) {
      showAlert("Error", "At least one first message is required", [
        { text: "OK", onPress: dismissAlert },
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
        { text: "OK", onPress: dismissAlert },
      ]);
    } finally {
      setSaving(false);
    }
  }, [form, isEditMode, characterId, buildRequest, navigate, showAlert, dismissAlert]);

  const handleReset = useCallback(() => {
    showAlert(
      "Reset Form",
      "Clear all fields and start over? This cannot be undone.",
      [
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            dismissAlert();
            setForm(EMPTY_FORM);
            setFirstMsgIndex(0);
            setTagSearch("");
            clearPersistedForm(isEditMode);
          },
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: dismissAlert,
        },
      ],
    );
  }, [isEditMode, showAlert, dismissAlert]);

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
    alertButtons: alert.buttons,
    alertMessage: alert.message,
    alertTitle: alert.title,
    alertVisible: alert.visible,
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
    setAlertVisible: (_visible: boolean) => dismissAlert(),
    setField,
    setTagSearch,
    tagSearch,
    toggleTag,
    updateFirstMessage,
    uploading,
  };
}
