import React, {
  useEffect,
  useCallback,
  useMemo,
  useState,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import {
  type RouteProp,
  useRoute,
  useNavigation,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { FlashList } from "@shopify/flash-list";
import MessageList from "../../components/chat/MessageList";
import ChatInput from "../../components/chat/ChatInput";
import ChatSettingsOverlay from "../../components/chat/ChatSettingsOverlay";
import MessageActions from "../../components/chat/MessageActions";
import MessagesActionsSheet from "../../components/chat/MessagesActionsSheet";
import { useChat } from "../../hooks/useChat";
import { useAuthStore } from "../../stores/authStore";
import { useChatStore } from "../../stores/chatStore";
import type { ChatsStackParamList } from "../../navigation/types";
import { Settings } from "lucide-react-native";
import type { ChatMessage, ChatListItem, Pronouns } from "../../types/api";
import { avatarUrl, botAvatarUrl } from "../../utils/assets";
import CustomAlert from "../../components/common/CustomAlert";
import { useAlert } from "../../hooks/useAlert";
import CustomBottomSheet from "../../components/common/CustomBottomSheet";
import Avatar from "../../components/common/Avatar";
import PersonaPicker from "../../components/chat/PersonaPicker";
import {
  clearAndResetMessages,
  getCharacterChats,
  fetchSystemPrompt,
  forkChat,
  attemptExtractSystemPrompt,
} from "../../api/chats";
import { apiClient } from "../../api/client";
import ScreenHeader from "../../components/common/ScreenHeader";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";
import { useIsTablet } from "../../hooks/useIsTablet";
import { colors } from "../../utils/colors";
import { processSystemMessage, processText } from "../../utils/processText";
import TextInput from "../../components/common/TextInput";
import CollapsibleSection from "../../components/common/CollapsibleSection";
import { File as ExpoFile } from "expo-file-system";
import {
  StorageAccessFramework,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import { toast } from "../../utils/toast";
import { cleanTags, generify } from "../../utils/markdown";
import { storage } from "../../utils/storage";
import { getMyProfile } from "../../api/profile";

type Route = RouteProp<ChatsStackParamList, "ChatScreen">;
type Nav = NativeStackNavigationProp<ChatsStackParamList, "ChatScreen">;

interface MessageBatchBody {
  is_bot: boolean;
  is_main: boolean;
  message: string;
  metadata: unknown;
  character_id: string;
  chat_id: number;
  created_at: string;
}

async function postMessageBatches(
  chatId: number,
  bodies: MessageBatchBody[],
): Promise<void> {
  const batches: MessageBatchBody[][] = [];
  for (let i = 0; i < bodies.length; i += 10) {
    batches.push(bodies.slice(i, i + 10).reverse());
  }
  await batches.reduce(
    (prev, batch) =>
      prev.then(() => apiClient.post(`/chats/${chatId}/messages`, batch)),
    Promise.resolve(),
  );
}

function validateMessagesImport(
  raw: string,
): { valid: true; messages: ChatMessage[] } | { valid: false; error: string } {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { valid: false, error: "Invalid JSON: could not parse the input." };
  }
  if (!Array.isArray(data)) {
    return { valid: false, error: "Invalid format: expected a JSON array." };
  }
  const messages: ChatMessage[] = [];
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (typeof item !== "object" || item === null) {
      return {
        valid: false,
        error: `Item ${i}: expected an object, got ${typeof item}.`,
      };
    }
    if (typeof item.is_bot !== "boolean") {
      return {
        valid: false,
        error: `Item ${i}: "is_bot" must be a boolean.`,
      };
    }
    if (typeof item.is_main !== "boolean") {
      return {
        valid: false,
        error: `Item ${i}: "is_main" must be a boolean.`,
      };
    }
    if (typeof item.message !== "string") {
      return {
        valid: false,
        error: `Item ${i}: "message" must be a string.`,
      };
    }
    messages.push({
      id: -(i + 1),
      chat_id: 0,
      created_at: new Date().toISOString(),
      is_bot: item.is_bot,
      is_main: item.is_main,
      message: item.message,
      metadata: "metadata" in item ? item.metadata : null,
      rating: null,
    });
  }
  return { valid: true, messages };
}

function useChatScreen() {
  const route = useRoute<Route>();
  const { goBack, setOptions, navigate, replace } = useNavigation<Nav>();
  const { chatId, characterName, characterId } = route.params;
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [actionsTarget, setActionsTarget] = useState<{
    message: ChatMessage;
    isUser: boolean;
  } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const { alert: deleteAlert, showAlert, dismissAlert } = useAlert();
  const [newChatPickerVisible, setNewChatPickerVisible] = useState(false);
  const [switchPersonaPickerVisible, setSwitchPersonaPickerVisible] =
    useState(false);
  const [allChatsVisible, setAllChatsVisible] = useState(false);
  const [allChats, setAllChats] = useState<ChatListItem[]>([]);
  const [allChatsLoading, setAllChatsLoading] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState({
    visible: false,
    content: "",
    botPersonality: "",
    scenario: "",
    loading: false,
    error: null as string | null,
  });
  const [messagesActionsVisible, setMessagesActionsVisible] = useState(false);
  const [localMode, setLocalMode] = useState(false);
  const [localModeBannerDismissed, setLocalModeBannerDismissed] = useState(false);
  const {
    activeChatDetail,
    messages,
    isLoadingMessages,
    isSending,
    isGenerating,
    error,
    activeThinking,
    enableThinking,
    loadMessages,
    sendMessage,
    generateBotResponse,
    cancelGeneration,
    editMsg,
    deleteMsg,
    startNewChat,
    deleteChat,
    userConfig,
    loadUserConfig,
  } = useChat();
  const user = useAuthStore((s) => s.user);
  const storeRemoveMessages = useChatStore((s) => s.removeMessages);
  const isTablet = useIsTablet();
  const chatCentered = useChatStore((s) => s.chatCentered);

  const persona = useMemo(() => {
    const detail = activeChatDetail;
    if (!detail) return null;
    if (
      detail.chat.persona_id !== null &&
      detail.chat.persona_id !== undefined
    ) {
      return (
        detail.personas.find((p) => p.id === detail.chat.persona_id) ?? null
      );
    }
    return detail.personas[0] ?? null;
  }, [activeChatDetail]);

  const personaName = persona?.name ?? "user";
  const characterChatName =
    activeChatDetail?.character.chat_name ||
    activeChatDetail?.character.name ||
    characterName;
  const characterAvatar = activeChatDetail?.character.avatar
    ? botAvatarUrl(activeChatDetail.character.avatar)
    : "";
  const personaAvatar = persona?.avatar ? avatarUrl(persona.avatar) : "";
  const keyboardHeight = useKeyboardHeight();
  const lastLoadedChatRef = useRef<number | null>(null);
  const attemptAbortRef = useRef<AbortController | null>(null);

  const proxyBlocked = useMemo(() => {
    if (localMode) return false;
    if (!activeChatDetail || !userConfig) return false;
    return (
      !activeChatDetail.character.allow_proxy &&
      userConfig.api === "openai" &&
      userConfig.open_ai_mode === "proxy"
    );
  }, [activeChatDetail, userConfig, localMode]);

  useEffect(() => {
    if (lastLoadedChatRef.current === chatId) return;
    lastLoadedChatRef.current = chatId;
    loadMessages(chatId);
  }, [chatId, loadMessages]);

  useEffect(() => {
    let cancelled = false;
    const loadLocalMode = async () => {
      const data = await storage.getChatLocalData(chatId);
      if (cancelled) return;
      setLocalMode(data?.local_mode ?? false);
      setLocalModeBannerDismissed(false);
    };
    loadLocalMode();
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  useEffect(() => {
    loadUserConfig();
  }, [loadUserConfig]);

  useEffect(() => {
    setOptions({ headerTitle: characterName });
  }, [setOptions, characterName]);

  const handleSend = useCallback(
    async (content: string) => {
      try {
        await sendMessage(
          content,
          characterId,
          chatId,
          persona?.id ?? null,
          personaName,
          personaAvatar,
        );
        await generateBotResponse(chatId, characterId, persona?.id ?? null);
      } catch {}
    },
    [
      sendMessage,
      generateBotResponse,
      characterId,
      chatId,
      persona?.id,
      personaName,
      personaAvatar,
    ],
  );

  const handleNewChatFromCog = useCallback(() => {
    setNewChatPickerVisible(true);
  }, []);

  const handleAllChats = useCallback(async () => {
    setAllChatsVisible(true);
    setAllChatsLoading(true);
    try {
      const chats = await getCharacterChats(characterId);
      setAllChats(chats);
    } catch {
    } finally {
      setAllChatsLoading(false);
    }
  }, [characterId]);

  const handleViewSystemPrompt = useCallback(() => {
    setSystemPrompt((p) => ({ ...p, visible: true }));
    setSystemPrompt((p) => ({ ...p, loading: true }));
    setSystemPrompt((p) => ({ ...p, error: null }));
    setSystemPrompt((p) => ({ ...p, content: "" }));
    setSystemPrompt((p) => ({ ...p, botPersonality: "" }));
    setSystemPrompt((p) => ({ ...p, scenario: "" }));
    const detail = useChatStore.getState().activeChatDetail;
    if (!detail) {
      setSystemPrompt((p) => ({ ...p, error: "Chat not loaded" }));
      setSystemPrompt((p) => ({ ...p, loading: false }));
      return;
    }
    const fetchPrompt = async () => {
      try {
        const prompt = await fetchSystemPrompt(detail);
        setSystemPrompt((p) => ({ ...p, content: prompt }));
        const characterName =
          detail.character.chat_name || detail.character.name;

        const { personality, scenario } = processSystemMessage(
          prompt,
          characterName,
        );
        setSystemPrompt((p) => ({ ...p, botPersonality: generify(cleanTags(personality ?? "", `${characterName}'s Persona`), characterName) }));
        setSystemPrompt((p) => ({ ...p, scenario: generify(cleanTags(scenario ?? "", "Scenario"), characterName) }));
      } catch (err: any) {
        setSystemPrompt((p) => ({ ...p, error: err.message || "Failed to load system prompt" }));
      } finally {
        setSystemPrompt((p) => ({ ...p, loading: false }));
      }
    };
    fetchPrompt();
  }, []);

  const handleAttemptViewSystemPrompt = useCallback(() => {
    showAlert("Extract System Prompt", 
      "This will attempt to extract the system prompt by having the AI reproduce it. " +
        "It may take a while and the extracted content may be incomplete or incorrect. Continue?",
    [
      {
        text: "Continue",
        onPress: () => {
          dismissAlert();

          const detail = useChatStore.getState().activeChatDetail;
          if (!detail) {
            setSystemPrompt((p) => ({ ...p, error: "Chat not loaded" }));
            setSystemPrompt((p) => ({ ...p, visible: true }));
            return;
          }

          setSystemPrompt((p) => ({ ...p, visible: true }));
          setSystemPrompt((p) => ({ ...p, loading: true }));
          setSystemPrompt((p) => ({ ...p, error: null }));
          setSystemPrompt((p) => ({ ...p, content: "" }));
          setSystemPrompt((p) => ({ ...p, botPersonality: "" }));
          setSystemPrompt((p) => ({ ...p, scenario: "" }));

          const abortController = new AbortController();
          attemptAbortRef.current = abortController;

          const { character_id } = detail.chat;
          const characterName =
            detail.character.chat_name || detail.character.name;

          const doExtraction = async () => {
            console.log("extracting");
            let extractionError: string | null = null;
            const personaTag = `${characterName}'s Persona`;

            try {
              const personaResult = await attemptExtractSystemPrompt(
                character_id,
                personaTag,
                abortController.signal,
              );
              setSystemPrompt((p) => ({
                ...p,
                botPersonality: generify(
                  cleanTags(personaResult, personaTag),
                  characterName,
                ),
              }));
            } catch (err: any) {
              if (!abortController.signal.aborted) {
                extractionError = `Persona: ${err.message}`;
              }
            }

            if (!extractionError) {
              try {
                const scenarioResult = await attemptExtractSystemPrompt(
                  character_id,
                  "Scenario",
                  abortController.signal,
                );
                setSystemPrompt((p) => ({
                  ...p,
                  scenario: generify(
                    cleanTags(scenarioResult, "Scenario"),
                    characterName,
                  ),
                }));
              } catch (err: any) {
                if (!abortController.signal.aborted) {
                  extractionError = `Scenario: ${err.message}`;
                }
              }
            }

            if (extractionError) {
              setSystemPrompt((p) => ({ ...p, error: extractionError }));
            }
            setSystemPrompt((p) => ({ ...p, loading: false }));
            attemptAbortRef.current = null;
          };
          doExtraction();
        },
      },
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => dismissAlert(),
      },
    ]);
  }, [showAlert, dismissAlert]);

  const handleSystemPromptClose = useCallback(() => {
    attemptAbortRef.current?.abort();
    setSystemPrompt((p) => ({ ...p, visible: false }));
  }, []);

  const handleNewChatPersonaSelect = useCallback(
    async (persona: { id: string; name: string; avatar: string } | null) => {
      try {
        const newChatId = await startNewChat(characterId, persona?.id);
        navigate("ChatScreen", {
          chatId: newChatId,
          characterName,
          characterId,
        });
      } catch {}
    },
    [startNewChat, characterId, characterName, navigate],
  );

  const handleMessagesActionsOpen = useCallback(() => {
    setMessagesActionsVisible(true);
  }, []);

  const handleMessagesActionsClose = useCallback(() => {
    setMessagesActionsVisible(false);
  }, []);

  const handleExport = useCallback(() => {
    const currentMessages = useChatStore.getState().messages;
    if (currentMessages.length === 0) {
      showAlert("Export Messages", "No messages to export.", [
        { text: "OK", onPress: dismissAlert },
      ]);
      return;
    }
    dismissAlert();
    showAlert("Export as", "Copy the JSON to clipboard or save as a file?", [
      {
        text: "Copy",
        onPress: async () => {
          dismissAlert();
          try {
            const json = JSON.stringify(
              currentMessages.map((m) => ({
                is_bot: m.is_bot,
                is_main: m.is_main,
                message: m.message,
                metadata: m.metadata,
              })),
              null,
              2,
            );
            const Clipboard = require("expo-clipboard");
            await Clipboard.setStringAsync(json);
            toast("Copied to clipboard");
          } catch {}
        },
      },
      {
        text: "Save as File",
        onPress: async () => {
          dismissAlert();
          try {
            const json = JSON.stringify(
              currentMessages.map((m) => ({
                is_bot: m.is_bot,
                is_main: m.is_main,
                message: m.message,
                metadata: m.metadata,
              })),
              null,
              2,
            );
            const filename = `chat_${chatId}_messages.json`;
            const perm =
              await StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (!perm.granted) {
              toast("Save cancelled", "error");
              return;
            }
            const fileUri = await StorageAccessFramework.createFileAsync(
              perm.directoryUri,
              filename,
              "application/json",
            );
            await writeAsStringAsync(fileUri, json, {
              encoding: "utf8" as any,
            });
            toast(`Saved ${filename}`);
          } catch {}
        },
      },
    ]);
  }, [chatId, showAlert, dismissAlert]);

  const handleImport = useCallback(() => {
    const importMessagesToServer = async (messages: ChatMessage[]) => {
      try {
        // Delete existing server messages first
        const currentIds = useChatStore.getState().messages.reduce<number[]>(
          (acc, m) => {
            if (
              m.id > 0 &&
              m.id <= 99000000000 &&
              Number.isInteger(m.id)
            ) {
              acc.push(m.id);
            }
            return acc;
          },
          [],
        );
        await Promise.all(
          (() => {
            const requests: Promise<unknown>[] = [];
            for (let i = 0; i < currentIds.length; i += 256) {
              const batch = currentIds.slice(i, i + 256);
              requests.push(
                apiClient.delete(`/chats/${chatId}/messages`, {
                  data: { message_ids: batch },
                }),
              );
            }
            return requests;
          })(),
        );
        // Post imported messages in batches of 25
        const body = messages.map((m) => ({
          is_bot: m.is_bot,
          is_main: m.is_main,
          message: m.message,
          metadata: m.metadata,
          character_id: characterId,
          chat_id: chatId,
          created_at: m.created_at,
        }));
        await postMessageBatches(chatId, body);
        await loadMessages(chatId);
        toast("Messages imported successfully");
      } catch {
        toast("Failed to import messages", "error");
      }
    };

    showAlert(
      "Import Messages",
      "This will replace all current messages with the imported ones. Continue?",
      [
        {
          text: "Import",
          style: "destructive",
          onPress: () => {
            dismissAlert();
            showAlert("Import from", "Read JSON from clipboard or pick a file?", [
              {
                text: "Clipboard",
                onPress: async () => {
                  dismissAlert();
                  try {
                    const Clipboard = require("expo-clipboard");
                    const text = await Clipboard.getStringAsync();
                    if (!text || text.trim().length === 0) {
                      showAlert("Import Failed", "Clipboard is empty.", [
                        {
                          text: "OK",
                          onPress: dismissAlert,
                        },
                      ]);
                      return;
                    }
                    const result = validateMessagesImport(text);
                    if (!result.valid) {
                      showAlert("Import Failed", result.error, [
                        {
                          text: "OK",
                          onPress: dismissAlert,
                        },
                      ]);
                      return;
                    }
                    await importMessagesToServer(result.messages);
                  } catch {}
                },
              },
              {
                text: "File",
                onPress: async () => {
                  dismissAlert();
                  try {
                    const pickResult = await ExpoFile.pickFileAsync({
                      mimeTypes: "application/json",
                    });
                    if (pickResult.canceled || !pickResult.result) return;
                    const pickedFile = Array.isArray(pickResult.result)
                      ? pickResult.result[0]
                      : pickResult.result;
                    const text = await pickedFile.text();
                    const result = validateMessagesImport(text);
                    if (!result.valid) {
                      showAlert("Import Failed", result.error, [
                        {
                          text: "OK",
                          onPress: dismissAlert,
                        },
                      ]);
                      return;
                    }
                    await importMessagesToServer(result.messages);
                  } catch {}
                },
              },
            ]);
          },
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: dismissAlert,
        },
      ],
    );
  }, [chatId, characterId, loadMessages, showAlert, dismissAlert]);

  const handleReset = useCallback(() => {
    if (!activeChatDetail) return;
    showAlert("Reset Messages", 
      "Reset this conversation to the first messages? All current messages will be permanently deleted.",
    [
      {
        text: "Reset",
        style: "destructive",
        onPress: async () => {
          dismissAlert();
          try {
            const ids = activeChatDetail.chatMessages.map((m) => m.id);
            useChatStore.getState().clearMessages();
            await clearAndResetMessages(
              chatId,
              ids,
              activeChatDetail.character.first_messages,
            );
            await loadMessages(chatId);
          } catch {}
        },
      },
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => dismissAlert(),
      },
    ]);
  }, [chatId, activeChatDetail, loadMessages, showAlert, dismissAlert]);

  const handleDeleteChatFromCog = useCallback(() => {
    showAlert("Delete Chat", 
      `Delete conversation with ${characterName}? This cannot be undone.`,
    [
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          dismissAlert();
          try {
            await deleteChat(chatId);
            goBack();
          } catch {}
        },
      },
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => dismissAlert(),
      },
    ]);
  }, [chatId, characterName, deleteChat, goBack, showAlert, dismissAlert]);

  const handleSettingsClose = useCallback(() => setSettingsVisible(false), []);

  const handleNewChatPickerClose = useCallback(
    () => setNewChatPickerVisible(false),
    [],
  );
  const handleAllChatsClose = useCallback(() => setAllChatsVisible(false), []);
  const handleAllChatsBack = useCallback(() => {
    setAllChatsVisible(false);
    setSettingsVisible(true);
  }, []);

  const handleGoBack = useCallback(() => goBack(), [goBack]);
  const handleOpenSettings = useCallback(() => setSettingsVisible(true), []);

  const handleDelete = useCallback(
    async (messageIds: number[]) => {
      try {
        await deleteMsg(chatId, messageIds);
      } catch {}
    },
    [deleteMsg, chatId],
  );

  const handleDeleteBubble = useCallback(
    (messageId: number) => {
      return handleDelete([messageId]);
    },
    [handleDelete],
  );

  const handleEdit = useCallback(
    async (messageId: number, newContent: string) => {
      try {
        await editMsg(chatId, messageId, newContent);
      } catch {}
    },
    [editMsg, chatId],
  );

  const handleFork = useCallback(async () => {
    if (!actionsTarget || actionsTarget.message.id <= 0) return;
    try {
      const newChat = await forkChat(chatId, actionsTarget.message.id);
      const name = characterChatName || characterName;
      replace("ChatScreen", {
        chatId: newChat.id,
        characterName: name,
        characterId,
      });
    } catch {}
  }, [
    actionsTarget,
    chatId,
    characterId,
    characterName,
    characterChatName,
    replace,
  ]);

  const handleMessageLongPress = useCallback((message: ChatMessage) => {
    setActionsTarget({ message, isUser: !message.is_bot });
  }, []);

  const handleActionsClose = useCallback(() => {
    setActionsTarget(null);
  }, []);

  const handleActionsEdit = useCallback(() => {
    if (actionsTarget && actionsTarget.message.id > 0) {
      setEditingMessageId(actionsTarget.message.id);
      setActionsTarget(null);
    }
  }, [actionsTarget]);

  const handleActionsDelete = useCallback(() => {
    if (!actionsTarget) return;
    const idx = messages.findIndex((m) => m.id === actionsTarget.message.id);
    const hasAfter = idx !== -1 && idx < messages.length - 1;

    const doDelete = (ids: number[]) => {
      const serverIds = ids.filter((id) => id > 0);
      const tempIds = ids.filter((id) => id < 0);
      if (serverIds.length > 0) handleDelete(serverIds);
      if (tempIds.length > 0) storeRemoveMessages(tempIds);
      setActionsTarget(null);
      dismissAlert();
    };

    if (hasAfter) {
      const afterCount = messages.length - 1 - idx;
      showAlert("Delete Message", 
        `Delete just this message, or this message and the ${afterCount} message${afterCount > 1 ? "s" : ""} after it?`,
      [
        {
          text: "Just this",
          onPress: () => doDelete([actionsTarget.message.id]),
        },
        {
          text: "All after",
          style: "destructive",
          onPress: () => doDelete(messages.slice(idx).map((m) => m.id)),
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            setActionsTarget(null);
            dismissAlert();
          },
        },
      ]);
    } else {
      doDelete([actionsTarget.message.id]);
    }
  }, [actionsTarget, messages, handleDelete, storeRemoveMessages, showAlert, dismissAlert]);

  const handleEditingDone = useCallback(() => {
    setEditingMessageId(null);
  }, []);

  const handleReroll = useCallback(() => {
    if (!actionsTarget) return;
    setActionsTarget(null);
    generateBotResponse(chatId, characterId, persona?.id ?? null);
  }, [actionsTarget, generateBotResponse, chatId, characterId, persona?.id]);

  const handleSwipeReroll = useCallback(() => {
    generateBotResponse(chatId, characterId, persona?.id ?? null);
  }, [generateBotResponse, chatId, characterId, persona?.id]);

  const handleRerollMessage = useCallback(() => {
    if (!actionsTarget) return;
    setActionsTarget(null);
    generateBotResponse(chatId, characterId, persona?.id ?? null);
  }, [actionsTarget, generateBotResponse, chatId, characterId, persona?.id]);

  const isLastMessage = actionsTarget
    ? actionsTarget.message.id === messages[messages.length - 1]?.id
    : false;

  const handleCopyMessage = useCallback(() => {
    if (!actionsTarget) return;
    try {
      const Clipboard = require("expo-clipboard");
      Clipboard.setStringAsync(actionsTarget.message.message);
    } catch {}
    setActionsTarget(null);
  }, [actionsTarget]);

  const handleReformat = useCallback(() => {
    if (!actionsTarget || actionsTarget.message.id <= 0) return;
    const wrapper = useChatStore.getState().narrationWrapper;
    const formatted = processText(actionsTarget.message.message, {
      wrapper,
      removeTags: true,
    });
    if (formatted !== actionsTarget.message.message) {
      editMsg(chatId, actionsTarget.message.id, formatted);
    }
    setActionsTarget(null);
  }, [actionsTarget, chatId, editMsg]);

  const handleSwitchPersona = useCallback(() => {
    showAlert("Switch Persona", 
      "This action is irreversible. All messages will be transferred to the new persona. Continue?",
    [
      {
        text: "Continue",
        onPress: () => {
          dismissAlert();
          setSwitchPersonaPickerVisible(true);
        },
      },
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => dismissAlert(),
      },
    ]);
  }, [showAlert, dismissAlert]);

  const handleSwitchPersonaSelect = useCallback(
    async (
      persona: { id: string; name: string; avatar: string } | null,
    ) => {
      setSwitchPersonaPickerVisible(false);
      if (!activeChatDetail) return;

      let profile = null
      if (!persona) profile = await getMyProfile();
      const currentMessages = useChatStore.getState().messages;
      const serverIds = currentMessages.reduce<number[]>((acc, m) => {
        if (m.id > 0) acc.push(m.id);
        return acc;
      }, []);

      try {
        // Delete all server messages
        const validIds = serverIds.filter(
          (id) => id > 0 && id <= 99000000000 && Number.isInteger(id),
        );
        await Promise.all(
          (() => {
            const requests: Promise<unknown>[] = [];
            for (let i = 0; i < validIds.length; i += 256) {
              const batch = validIds.slice(i, i + 256);
              requests.push(
                apiClient.delete(`/chats/${chatId}/messages`, {
                  data: { message_ids: batch },
                }),
              );
            }
            return requests;
          })(),
        );

        // Re-create all messages with new persona metadata, batches of 10
        const newPersonaId = persona?.id ?? null;
        const newPersonaName = persona?.name ?? profile?.name ?? "user";
        const newPersonaAvatar = persona?.avatar ?? "";

        const msgBodies = currentMessages.map((m) => ({
          is_bot: m.is_bot,
          is_main: m.is_main,
          message: m.message.replaceAll(personaName, newPersonaName),
          metadata: {
            persona_id: newPersonaId,
            persona_name: newPersonaName,
            persona_avatar: newPersonaAvatar,
          },
          character_id: characterId,
          chat_id: chatId,
          created_at: m.created_at,
        }));

        await postMessageBatches(chatId, msgBodies);

        await loadMessages(chatId);
        toast("Persona switched successfully");
      } catch {
        toast("Failed to switch persona", "error");
      }
    },
    [chatId, characterId, activeChatDetail, loadMessages, personaName],
  );

  const handleSwitchPersonaPickerClose = useCallback(
    () => setSwitchPersonaPickerVisible(false),
    [],
  );

  const handleRetry = useCallback(() => loadMessages(chatId), [
    loadMessages,
    chatId,
  ]);

  const handleLocalModeBannerDismiss = useCallback(() => {
    setLocalModeBannerDismissed(true);
  }, []);

  const handleAllChatSelect = useCallback(
    (item: ChatListItem) => {
      setAllChatsVisible(false);
      navigate("ChatScreen", {
        chatId: item.id,
        characterName: item.character.name || characterName,
        characterId: item.character_id,
      });
    },
    [navigate, characterName],
  );

  return {
    chatId,
    characterName,
    characterId,
    user,
    handleGoBack,
    handleOpenSettings,
    proxyBlocked,
    localMode,
    localModeBannerDismissed,
    handleLocalModeBannerDismiss,
    error,
    handleRetry,
    messages,
    isLoadingMessages,
    handleEdit,
    handleDeleteBubble,
    handleMessageLongPress,
    editingMessageId,
    handleEditingDone,
    personaName,
    characterChatName,
    personaPronouns: persona?.pronouns,
    characterAvatar,
    personaAvatar,
    activeThinking,
    enableThinking,
    handleSwipeReroll,
    handleSend,
    isSending,
    isGenerating,
    cancelGeneration,
    isTablet,
    chatCentered,
    keyboardHeight,
    settingsVisible,
    handleSettingsClose,
    creatorId: activeChatDetail?.character.creator_id,
    creatorName: activeChatDetail?.character.creator_name,
    allowProxy: activeChatDetail?.character.allow_proxy,
    handleNewChatFromCog,
    handleAllChats,
    handleMessagesActionsOpen,
    handleDeleteChatFromCog,
    handleViewSystemPrompt,
    handleAttemptViewSystemPrompt,
    messagesActionsVisible,
    handleMessagesActionsClose,
    handleExport,
    handleImport,
    handleReset,
    handleSwitchPersona,
    actionsTarget,
    isLastMessage,
    handleActionsClose,
    handleCopyMessage,
    handleActionsEdit,
    handleReformat,
    handleRerollMessage,
    handleFork,
    handleReroll,
    handleActionsDelete,
    newChatPickerVisible,
    handleNewChatPickerClose,
    handleNewChatPersonaSelect,
    switchPersonaPickerVisible,
    handleSwitchPersonaPickerClose,
    handleSwitchPersonaSelect,
    deleteAlert,
    dismissAlert,
    allChatsVisible,
    handleAllChatsClose,
    handleAllChatsBack,
    allChatsLoading,
    allChats,
    handleAllChatSelect,
    systemPrompt,
    handleSystemPromptClose,
  };
}

const ChatScreenHeader = React.memo(
  function ChatScreenHeader({
    title,
    onBack,
    onOpenSettings,
  }: {
    title: string;
    onBack: () => void;
    onOpenSettings: () => void;
  }) {
    return (
      <ScreenHeader
        title={title}
        onBack={onBack}
        rightElement={
          <Pressable onPress={onOpenSettings} style={styles.backBtn}>
            <Settings size={22} color={colors.accent} />
          </Pressable>
        }
      />
    );
  },
);

const ProxyBanner = React.memo(function ProxyBanner() {
  return (
    <View style={styles.proxyWarningBanner}>
      <Text style={styles.proxyWarningText}>
        This character does not support proxies.
      </Text>
    </View>
  );
});

const LocalModeBanner = React.memo(
  function LocalModeBanner({ onDismiss }: { onDismiss: () => void }) {
    return (
      <View style={styles.localModeBanner}>
        <Text style={styles.localModeBannerText}>Local mode enabled.</Text>
        <Pressable onPress={onDismiss} style={styles.localModeBannerClose}>
          <Text style={styles.localModeBannerCloseText}>{"\u2715"}</Text>
        </Pressable>
      </View>
    );
  },
);

const ChatBodyArea = React.memo(
  function ChatBodyArea({
    flags,
    error,
    onRetry,
    chatId,
    messages,
    currentUserId,
    onEdit,
    onDelete,
    onMessageLongPress,
    editingMessageId,
    onEditingDone,
    personaName,
    characterChatName,
    personaPronouns,
    characterAvatar,
    personaAvatar,
    activeThinking,
    onReroll,
    onSend,
    onCancel,
    keyboardHeight,
  }: {
    flags: {
      isLoading: boolean;
      isSending: boolean;
      isGenerating: boolean;
      disabled: boolean;
      isTablet: boolean;
      chatCentered: boolean;
      enableThinking: boolean;
    };
    error: string | null;
    onRetry: () => void;
    chatId: number;
    messages: ChatMessage[];
    currentUserId: string | undefined;
    onEdit: (messageId: number, newContent: string) => void;
    onDelete: (messageId: number) => void;
    onMessageLongPress: (message: ChatMessage) => void;
    editingMessageId: number | null;
    onEditingDone: () => void;
    personaName: string;
    characterChatName: string;
    personaPronouns: Pronouns | null | undefined;
    characterAvatar: string;
    personaAvatar: string;
    activeThinking: string;
    onReroll: () => void;
    onSend: (content: string) => void;
    onCancel: () => void;
    keyboardHeight: number;
  }) {
    const {
      isLoading,
      isSending,
      isGenerating,
      disabled,
      isTablet,
      chatCentered,
      enableThinking,
    } = flags;
    const content = (
      <>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={onRetry}
              style={({ pressed }) => [
                styles.retryBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <MessageList
            messages={messages}
            isLoading={isLoading}
            currentUserId={currentUserId}
            chatId={chatId}
            onEdit={onEdit}
            onDelete={onDelete}
            onMessageLongPress={onMessageLongPress}
            editingMessageId={editingMessageId}
            onEditingDone={onEditingDone}
            personaName={personaName}
            characterChatName={characterChatName}
            personaPronouns={personaPronouns}
            characterAvatar={characterAvatar}
            personaAvatar={personaAvatar}
            activeThinking={activeThinking}
            enableThinking={enableThinking}
            onReroll={onReroll}
          />
        )}
        <ChatInput
          onSend={onSend}
          isSending={isSending}
          isGenerating={isGenerating}
          onCancel={onCancel}
          disabled={disabled}
        />
      </>
    );
    return Platform.OS === "ios" ? (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <View
          style={isTablet && chatCentered ? styles.chatCentered : { flex: 1 }}
        >
          {content}
        </View>
      </KeyboardAvoidingView>
    ) : (
      <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
        <View
          style={isTablet && chatCentered ? styles.chatCentered : { flex: 1 }}
        >
          {content}
        </View>
      </View>
    );
  },
);

const ChatMessageActions = React.memo(
  function ChatMessageActions({
    visible,
    actionsTarget,
    isLastMessage,
    onClose,
    onCopy,
    onEdit,
    onReformat,
    onRerollMessage,
    onFork,
    onReroll,
    onDelete,
  }: {
    visible: boolean;
    actionsTarget: { message: ChatMessage; isUser: boolean } | null;
    isLastMessage: boolean;
    onClose: () => void;
    onCopy: () => void;
    onEdit: () => void;
    onReformat: () => void;
    onRerollMessage: () => void;
    onFork: () => void;
    onReroll: () => void;
    onDelete: () => void;
  }) {
    return (
      <MessageActions
        visible={visible}
        onClose={onClose}
        actions={[
          ...(actionsTarget
            ? [
                {
                  label: "Copy Message",
                  onPress: onCopy,
                },
              ]
            : []),
          ...(actionsTarget && actionsTarget.message.id > 0
            ? [
                {
                  label: "Edit Message",
                  onPress: onEdit,
                },
              ]
            : []),
          ...(actionsTarget &&
          !actionsTarget.isUser &&
          actionsTarget.message.id > 0
            ? [
                {
                  label: "Reformat Markdown",
                  onPress: onReformat,
                },
              ]
            : []),
          ...(actionsTarget &&
          actionsTarget.isUser &&
          isLastMessage &&
          actionsTarget.message.id > 0
            ? [
                {
                  label: "Reroll message",
                  onPress: onRerollMessage,
                },
              ]
            : []),
          ...(actionsTarget && actionsTarget.message.id > 0
            ? [
                {
                  label: "Fork Chat",
                  onPress: onFork,
                },
              ]
            : []),
          ...(actionsTarget && !actionsTarget.isUser
            ? [
                {
                  label: "Reroll",
                  onPress: onReroll,
                },
              ]
            : []),
          {
            label: "Delete Message",
            destructive: true,
            onPress: onDelete,
          },
        ]}
      />
    );
  },
);

const AllChatsSheet = React.memo(
  function AllChatsSheet({
    visible,
    onClose,
    onBack,
    characterName,
    loading,
    chats,
    onSelectChat,
  }: {
    visible: boolean;
    onClose: () => void;
    onBack: () => void;
    characterName: string;
    loading: boolean;
    chats: ChatListItem[];
    onSelectChat: (item: ChatListItem) => void;
  }) {
    const renderRow = useCallback(
      ({ item }: { item: ChatListItem }) => (
        <Pressable
          style={({ pressed }) => [
            styles.allChatsRow,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => onSelectChat(item)}
        >
          <Avatar
            uri={botAvatarUrl(item.character.avatar)}
            name={item.character.name}
            size={36}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.allChatsRowName} numberOfLines={1}>
              {item.character.name}
            </Text>
            <Text style={styles.allChatsRowMeta}>
              {item.chat_count} messages
            </Text>
          </View>
        </Pressable>
      ),
      [onSelectChat],
    );
    return (
      <CustomBottomSheet visible={visible} onClose={onClose}>
        <View style={styles.allChatsContent}>
          <View style={styles.allChatsTitleRow}>
            <Pressable
              onPress={onBack}
              style={styles.allChatsBackBtn}
            >
              <Text style={styles.allChatsBackText}>{"\u2190"}</Text>
            </Pressable>
            <Text style={styles.allChatsTitle}>{characterName}</Text>
            <View style={styles.allChatsBackBtn} />
          </View>
          {loading ? (
            <ActivityIndicator
              color={colors.accent}
              style={{ paddingVertical: 24 }}
            />
          ) : chats.length === 0 ? (
            <Text style={styles.allChatsEmpty}>
              No chats with this character
            </Text>
          ) : (
            <FlashList
              data={chats}
              renderItem={renderRow}
              keyExtractor={(item) => item.id.toString()}
              style={styles.allChatsList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </CustomBottomSheet>
    );
  },
);

const SystemPromptModal = React.memo(
  function SystemPromptModal({
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
                    <ActivityIndicator
                      size="small"
                      color={colors.accent}
                    />
                    <Text style={styles.sysPromptLoadingText}>
                      Loading system prompt...
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
  },
);

export default function ChatScreen() {
  const {
    chatId,
    characterName,
    characterId,
    user,
    handleGoBack,
    handleOpenSettings,
    proxyBlocked,
    localMode,
    localModeBannerDismissed,
    handleLocalModeBannerDismiss,
    error,
    handleRetry,
    messages,
    isLoadingMessages,
    handleEdit,
    handleDeleteBubble,
    handleMessageLongPress,
    editingMessageId,
    handleEditingDone,
    personaName,
    characterChatName,
    personaPronouns,
    characterAvatar,
    personaAvatar,
    activeThinking,
    enableThinking,
    handleSwipeReroll,
    handleSend,
    isSending,
    isGenerating,
    cancelGeneration,
    isTablet,
    chatCentered,
    keyboardHeight,
    settingsVisible,
    handleSettingsClose,
    creatorId,
    creatorName,
    allowProxy,
    handleNewChatFromCog,
    handleAllChats,
    handleMessagesActionsOpen,
    handleDeleteChatFromCog,
    handleViewSystemPrompt,
    handleAttemptViewSystemPrompt,
    messagesActionsVisible,
    handleMessagesActionsClose,
    handleExport,
    handleImport,
    handleReset,
    handleSwitchPersona,
    actionsTarget,
    isLastMessage,
    handleActionsClose,
    handleCopyMessage,
    handleActionsEdit,
    handleReformat,
    handleRerollMessage,
    handleFork,
    handleReroll,
    handleActionsDelete,
    newChatPickerVisible,
    handleNewChatPickerClose,
    handleNewChatPersonaSelect,
    switchPersonaPickerVisible,
    handleSwitchPersonaPickerClose,
    handleSwitchPersonaSelect,
    deleteAlert,
    dismissAlert,
    allChatsVisible,
    handleAllChatsClose,
    handleAllChatsBack,
    allChatsLoading,
    allChats,
    handleAllChatSelect,
    systemPrompt,
    handleSystemPromptClose,
  } = useChatScreen();

  const bodyFlags = useMemo(
    () => ({
      isLoading: isLoadingMessages,
      isSending,
      isGenerating,
      disabled: proxyBlocked,
      isTablet,
      chatCentered,
      enableThinking,
    }),
    [
      isLoadingMessages,
      isSending,
      isGenerating,
      proxyBlocked,
      isTablet,
      chatCentered,
      enableThinking,
    ],
  );

  return (
    <View style={styles.container}>
      <ChatScreenHeader
        title={characterName}
        onBack={handleGoBack}
        onOpenSettings={handleOpenSettings}
      />
      {proxyBlocked && <ProxyBanner />}
      {localMode && !localModeBannerDismissed && (
        <LocalModeBanner onDismiss={handleLocalModeBannerDismiss} />
      )}
      <ChatBodyArea
        flags={bodyFlags}
        error={error}
        onRetry={handleRetry}
        chatId={chatId}
        messages={messages}
        currentUserId={user?.id}
        onEdit={handleEdit}
        onDelete={handleDeleteBubble}
        onMessageLongPress={handleMessageLongPress}
        editingMessageId={editingMessageId}
        onEditingDone={handleEditingDone}
        personaName={personaName}
        characterChatName={characterChatName}
        personaPronouns={personaPronouns}
        characterAvatar={characterAvatar}
        personaAvatar={personaAvatar}
        activeThinking={activeThinking}
        onReroll={handleSwipeReroll}
        onSend={handleSend}
        onCancel={cancelGeneration}
        keyboardHeight={keyboardHeight}
      />

      <ChatSettingsOverlay
        visible={settingsVisible}
        onClose={handleSettingsClose}
        characterName={characterName}
        characterId={characterId}
        chatId={chatId}
        creatorId={creatorId}
        creatorName={creatorName}
        allowProxy={allowProxy}
        onNewChat={handleNewChatFromCog}
        onAllChats={handleAllChats}
        onMessagesActions={handleMessagesActionsOpen}
        onDeleteChat={handleDeleteChatFromCog}
        onViewSystemPrompt={handleViewSystemPrompt}
        onAttemptViewSystemPrompt={handleAttemptViewSystemPrompt}
      />

      <MessagesActionsSheet
        visible={messagesActionsVisible}
        onClose={handleMessagesActionsClose}
        onExport={handleExport}
        onImport={handleImport}
        onReset={handleReset}
        onSwitchPersona={handleSwitchPersona}
      />

      <ChatMessageActions
        visible={actionsTarget !== null}
        actionsTarget={actionsTarget}
        isLastMessage={isLastMessage}
        onClose={handleActionsClose}
        onCopy={handleCopyMessage}
        onEdit={handleActionsEdit}
        onReformat={handleReformat}
        onRerollMessage={handleRerollMessage}
        onFork={handleFork}
        onReroll={handleReroll}
        onDelete={handleActionsDelete}
      />

      <PersonaPicker
        visible={newChatPickerVisible}
        onClose={handleNewChatPickerClose}
        onSelect={handleNewChatPersonaSelect}
        characterName={characterName}
      />

      <PersonaPicker
        visible={switchPersonaPickerVisible}
        onClose={handleSwitchPersonaPickerClose}
        onSelect={handleSwitchPersonaSelect}
        characterName={characterName}
        title="Switch Persona"
        subtitle="Messages will be transferred to the selected persona"
      />

      <CustomAlert
        visible={deleteAlert.visible}
        title={deleteAlert.title}
        message={deleteAlert.message}
        buttons={deleteAlert.buttons}
        onDismiss={dismissAlert}
      />

      <AllChatsSheet
        visible={allChatsVisible}
        onClose={handleAllChatsClose}
        onBack={handleAllChatsBack}
        characterName={characterName}
        loading={allChatsLoading}
        chats={allChats}
        onSelectChat={handleAllChatSelect}
      />

      <SystemPromptModal
        visible={systemPrompt.visible}
        content={systemPrompt.content}
        botPersonality={systemPrompt.botPersonality}
        scenario={systemPrompt.scenario}
        loading={systemPrompt.loading}
        error={systemPrompt.error}
        onClose={handleSystemPromptClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chatCentered: {
    flex: 1,
    width: "100%",
    maxWidth: 700,
    alignSelf: "center",
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
  backText: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: "600",
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
    verticalAlign: "middle",
  },
  headerTitlePressable: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
  },
  retryBtn: {
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  allChatsContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  allChatsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  allChatsBackBtn: {
    width: 40,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  allChatsBackText: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: "600",
  },
  allChatsTitle: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 12,
    flex: 1,
  },
  allChatsEmpty: {
    color: colors.textFaint,
    textAlign: "center",
    paddingVertical: 24,
    fontSize: 14,
  },
  allChatsList: {
    maxHeight: 300,
  },
  allChatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  allChatsRowName: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  allChatsRowMeta: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  proxyWarningBanner: {
    backgroundColor: colors.dangerLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.danger,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  proxyWarningText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  localModeBanner: {
    backgroundColor: `${colors.accent}25`,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  localModeBannerText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
    textAlign: "center",
  },
  localModeBannerClose: {
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  localModeBannerCloseText: {
    color: colors.accent,
    fontSize: 16,
    marginTop: -2,
    fontWeight: "600",
  },
  sysPromptOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
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
