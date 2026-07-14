import {
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
import type { ChatMessage } from "../../types/api";
import type { ChatListItem } from "../../types/api";
import { avatarUrl, botAvatarUrl } from "../../utils/assets";
import CustomAlert, {
  type AlertButton,
} from "../../components/common/CustomAlert";
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

export default function ChatScreen() {
  const route = useRoute<Route>();
  const { goBack, setOptions, navigate, replace } = useNavigation<Nav>();
  const { chatId, characterName, characterId } = route.params;
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [actionsTarget, setActionsTarget] = useState<{
    message: ChatMessage;
    isUser: boolean;
  } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const [deleteAlertButtons, setDeleteAlertButtons] = useState<AlertButton[]>(
    [],
  );
  const [deleteAlertTitle, setDeleteAlertTitle] = useState("");
  const [deleteAlertMessage, setDeleteAlertMessage] = useState("");
  const [newChatPickerVisible, setNewChatPickerVisible] = useState(false);
  const [switchPersonaPickerVisible, setSwitchPersonaPickerVisible] =
    useState(false);
  const [allChatsVisible, setAllChatsVisible] = useState(false);
  const [allChats, setAllChats] = useState<ChatListItem[]>([]);
  const [allChatsLoading, setAllChatsLoading] = useState(false);
  const [systemPromptVisible, setSystemPromptVisible] = useState(false);
  const [systemPromptContent, setSystemPromptContent] = useState("");
  const [botPersonalityContent, setBotPersonalityContent] = useState("");
  const [scenarioContent, setScenarioContent] = useState("");
  const [systemPromptLoading, setSystemPromptLoading] = useState(false);
  const [systemPromptError, setSystemPromptError] = useState<string | null>(
    null,
  );
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
  const storeReplaceMessages = useChatStore((s) => s.replaceMessages);
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
    const loadLocalMode = async () => {
      const data = await storage.getChatLocalData(chatId);
      setLocalMode(data?.local_mode ?? false);
      setLocalModeBannerDismissed(false);
    };
    loadLocalMode();
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
    setSystemPromptVisible(true);
    setSystemPromptLoading(true);
    setSystemPromptError(null);
    setSystemPromptContent("");
    setBotPersonalityContent("");
    setScenarioContent("");
    const detail = useChatStore.getState().activeChatDetail;
    if (!detail) {
      setSystemPromptError("Chat not loaded");
      setSystemPromptLoading(false);
      return;
    }
    const fetchPrompt = async () => {
      try {
        const prompt = await fetchSystemPrompt(detail);
        setSystemPromptContent(prompt);
        const characterName =
          detail.character.chat_name || detail.character.name;

        const { personality, scenario } = processSystemMessage(
          prompt,
          characterName,
        );
        setBotPersonalityContent(generify(cleanTags(personality ?? "", `${characterName}'s Persona`), characterName));
        setScenarioContent(generify(cleanTags(scenario ?? "", "Scenario"), characterName));
      } catch (err: any) {
        setSystemPromptError(err.message || "Failed to load system prompt");
      } finally {
        setSystemPromptLoading(false);
      }
    };
    fetchPrompt();
  }, []);

  const handleAttemptViewSystemPrompt = useCallback(() => {
    setDeleteAlertTitle("Extract System Prompt");
    setDeleteAlertMessage(
      "This will attempt to extract the system prompt by having the AI reproduce it. " +
        "It may take a while and the extracted content may be incomplete or incorrect. Continue?",
    );
    setDeleteAlertButtons([
      {
        text: "Continue",
        onPress: () => {
          setDeleteAlertVisible(false);

          const detail = useChatStore.getState().activeChatDetail;
          if (!detail) {
            setSystemPromptError("Chat not loaded");
            setSystemPromptVisible(true);
            return;
          }

          setSystemPromptVisible(true);
          setSystemPromptLoading(true);
          setSystemPromptError(null);
          setSystemPromptContent("");
          setBotPersonalityContent("");
          setScenarioContent("");

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
              setBotPersonalityContent(
                generify(cleanTags(personaResult, personaTag), characterName),
              );
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
                setScenarioContent(
                  generify(
                    cleanTags(scenarioResult, "Scenario"),
                    characterName,
                  ),
                );
              } catch (err: any) {
                if (!abortController.signal.aborted) {
                  extractionError = `Scenario: ${err.message}`;
                }
              }
            }

            if (extractionError) {
              setSystemPromptError(extractionError);
            }
            setSystemPromptLoading(false);
            attemptAbortRef.current = null;
          };
          doExtraction();
        },
      },
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => setDeleteAlertVisible(false),
      },
    ]);
    setDeleteAlertVisible(true);
  }, []);

  const handleSystemPromptClose = useCallback(() => {
    attemptAbortRef.current?.abort();
    setSystemPromptVisible(false);
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
      setDeleteAlertTitle("Export Messages");
      setDeleteAlertMessage("No messages to export.");
      setDeleteAlertButtons([
        { text: "OK", onPress: () => setDeleteAlertVisible(false) },
      ]);
      setDeleteAlertVisible(true);
      return;
    }
    setDeleteAlertVisible(false);
    setDeleteAlertTitle("Export as");
    setDeleteAlertMessage("Copy the JSON to clipboard or save as a file?");
    setDeleteAlertButtons([
      {
        text: "Copy",
        onPress: async () => {
          setDeleteAlertVisible(false);
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
          setDeleteAlertVisible(false);
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
    setDeleteAlertVisible(true);
  }, [chatId]);

  const handleImport = useCallback(() => {
    const importMessagesToServer = async (messages: ChatMessage[]) => {
      try {
        // Delete existing server messages first
        const currentIds = useChatStore
          .getState()
          .messages.filter(
            (m) => m.id > 0 && m.id <= 99000000000 && Number.isInteger(m.id),
          )
          .map((m) => m.id);
        for (let i = 0; i < currentIds.length; i += 256) {
          const batch = currentIds.slice(i, i + 256);
          await apiClient.delete(`/chats/${chatId}/messages`, {
            data: { message_ids: batch },
          });
        }
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
        for (let i = 0; i < body.length; i += 10) {
          const batch = body.slice(i, i + 10).reverse();
          await apiClient.post(`/chats/${chatId}/messages`, batch);
        }
        await loadMessages(chatId);
        toast("Messages imported successfully");
      } catch {
        toast("Failed to import messages", "error");
      }
    };

    setDeleteAlertTitle("Import Messages");
    setDeleteAlertMessage(
      "This will replace all current messages with the imported ones. Continue?",
    );
    setDeleteAlertButtons([
      {
        text: "Import",
        style: "destructive",
        onPress: () => {
          setDeleteAlertVisible(false);
          setDeleteAlertTitle("Import from");
          setDeleteAlertMessage("Read JSON from clipboard or pick a file?");
          setDeleteAlertButtons([
            {
              text: "Clipboard",
              onPress: async () => {
                setDeleteAlertVisible(false);
                try {
                  const Clipboard = require("expo-clipboard");
                  const text = await Clipboard.getStringAsync();
                  if (!text || text.trim().length === 0) {
                    setDeleteAlertTitle("Import Failed");
                    setDeleteAlertMessage("Clipboard is empty.");
                    setDeleteAlertButtons([
                      {
                        text: "OK",
                        onPress: () => setDeleteAlertVisible(false),
                      },
                    ]);
                    setDeleteAlertVisible(true);
                    return;
                  }
                  const result = validateMessagesImport(text);
                  if (!result.valid) {
                    setDeleteAlertTitle("Import Failed");
                    setDeleteAlertMessage(result.error);
                    setDeleteAlertButtons([
                      {
                        text: "OK",
                        onPress: () => setDeleteAlertVisible(false),
                      },
                    ]);
                    setDeleteAlertVisible(true);
                    return;
                  }
                  await importMessagesToServer(result.messages);
                } catch {}
              },
            },
            {
              text: "File",
              onPress: async () => {
                setDeleteAlertVisible(false);
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
                    setDeleteAlertTitle("Import Failed");
                    setDeleteAlertMessage(result.error);
                    setDeleteAlertButtons([
                      {
                        text: "OK",
                        onPress: () => setDeleteAlertVisible(false),
                      },
                    ]);
                    setDeleteAlertVisible(true);
                    return;
                  }
                  await importMessagesToServer(result.messages);
                } catch {}
              },
            },
          ]);
          setDeleteAlertVisible(true);
        },
      },
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => setDeleteAlertVisible(false),
      },
    ]);
    setDeleteAlertVisible(true);
  }, [storeReplaceMessages]);

  const handleReset = useCallback(() => {
    if (!activeChatDetail) return;
    setDeleteAlertTitle("Reset Messages");
    setDeleteAlertMessage(
      "Reset this conversation to the first messages? All current messages will be permanently deleted.",
    );
    setDeleteAlertButtons([
      {
        text: "Reset",
        style: "destructive",
        onPress: async () => {
          setDeleteAlertVisible(false);
          try {
            const ids = activeChatDetail.chatMessages.map((m) => m.id);
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
        onPress: () => setDeleteAlertVisible(false),
      },
    ]);
    setDeleteAlertVisible(true);
  }, [chatId, activeChatDetail, loadMessages]);

  const handleDeleteChatFromCog = useCallback(() => {
    setDeleteAlertTitle("Delete Chat");
    setDeleteAlertMessage(
      `Delete conversation with ${characterName}? This cannot be undone.`,
    );
    setDeleteAlertButtons([
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleteAlertVisible(false);
          try {
            await deleteChat(chatId);
            goBack();
          } catch {}
        },
      },
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => setDeleteAlertVisible(false),
      },
    ]);
    setDeleteAlertVisible(true);
  }, [chatId, characterName, deleteChat, goBack]);

  const handleSettingsClose = useCallback(() => setSettingsVisible(false), []);

  const handleNewChatPickerClose = useCallback(
    () => setNewChatPickerVisible(false),
    [],
  );
  const handleAllChatsClose = useCallback(() => setAllChatsVisible(false), []);
  const handleAlertDismiss = useCallback(
    () => setDeleteAlertVisible(false),
    [],
  );
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
      setDeleteAlertVisible(false);
    };

    if (hasAfter) {
      const afterCount = messages.length - 1 - idx;
      setDeleteAlertTitle("Delete Message");
      setDeleteAlertMessage(
        `Delete just this message, or this message and the ${afterCount} message${afterCount > 1 ? "s" : ""} after it?`,
      );
      setDeleteAlertButtons([
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
            setDeleteAlertVisible(false);
          },
        },
      ]);
      setDeleteAlertVisible(true);
    } else {
      doDelete([actionsTarget.message.id]);
    }
  }, [actionsTarget, messages, handleDelete, storeRemoveMessages]);

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
    setDeleteAlertTitle("Switch Persona");
    setDeleteAlertMessage(
      "This action is irreversible. All messages will be transferred to the new persona. Continue?",
    );
    setDeleteAlertButtons([
      {
        text: "Continue",
        onPress: () => {
          setDeleteAlertVisible(false);
          setSwitchPersonaPickerVisible(true);
        },
      },
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => setDeleteAlertVisible(false),
      },
    ]);
    setDeleteAlertVisible(true);
  }, []);

  const handleSwitchPersonaSelect = useCallback(
    async (
      persona: { id: string; name: string; avatar: string } | null,
    ) => {
      setSwitchPersonaPickerVisible(false);
      if (!activeChatDetail) return;

      let profile = null
      if (!persona) profile = await getMyProfile();
      const currentMessages = useChatStore.getState().messages;
      const serverIds = currentMessages
        .filter((m) => m.id > 0)
        .map((m) => m.id);

      try {
        // Delete all server messages
        const validIds = serverIds.filter(
          (id) => id > 0 && id <= 99000000000 && Number.isInteger(id),
        );
        for (let i = 0; i < validIds.length; i += 256) {
          const batch = validIds.slice(i, i + 256);
          await apiClient.delete(`/chats/${chatId}/messages`, {
            data: { message_ids: batch },
          });
        }

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

        for (let i = 0; i < msgBodies.length; i += 10) {
          const batch = msgBodies.slice(i, i + 10).reverse();
          await apiClient.post(`/chats/${chatId}/messages`, batch);
        }

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

  const chatContent = (
    <>
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={() => loadMessages(chatId)}
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
          isLoading={isLoadingMessages}
          currentUserId={user?.id}
          chatId={chatId}
          onEdit={handleEdit}
          onDelete={handleDeleteBubble}
          onMessageLongPress={handleMessageLongPress}
          editingMessageId={editingMessageId}
          onEditingDone={handleEditingDone}
          personaName={personaName}
          characterChatName={characterChatName}
          personaPronouns={persona?.pronouns}
          characterAvatar={characterAvatar}
          personaAvatar={personaAvatar}
          activeThinking={activeThinking}
          enableThinking={enableThinking}
          onReroll={handleSwipeReroll}
        />
      )}
      <ChatInput
        onSend={handleSend}
        isSending={isSending}
        isGenerating={isGenerating}
        onCancel={cancelGeneration}
        disabled={proxyBlocked}
      />
    </>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={characterName}
        onBack={handleGoBack}
        rightElement={
          <Pressable onPress={handleOpenSettings} style={styles.backBtn}>
            <Settings size={22} color={colors.accent} />
          </Pressable>
        }
      />

      {proxyBlocked && (
        <View style={styles.proxyWarningBanner}>
          <Text style={styles.proxyWarningText}>
            This character does not support proxies.
          </Text>
        </View>
      )}
      {localMode && !localModeBannerDismissed && (
        <View style={styles.localModeBanner}>
          <Text style={styles.localModeBannerText}>
            Local mode enabled.
          </Text>
          <Pressable
            onPress={() => setLocalModeBannerDismissed(true)}
            style={styles.localModeBannerClose}
          >
            <Text style={styles.localModeBannerCloseText}>{"\u2715"}</Text>
          </Pressable>
        </View>
      )}
      {Platform.OS === "ios" ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          <View style={isTablet && chatCentered ? styles.chatCentered : { flex: 1 }}>
            {chatContent}
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
          <View style={isTablet && chatCentered ? styles.chatCentered : { flex: 1 }}>
            {chatContent}
          </View>
        </View>
      )}

      <ChatSettingsOverlay
        visible={settingsVisible}
        onClose={handleSettingsClose}
        characterName={characterName}
        characterId={characterId}
        chatId={chatId}
        creatorId={activeChatDetail?.character.creator_id}
        creatorName={activeChatDetail?.character.creator_name}
        allowProxy={activeChatDetail?.character.allow_proxy}
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

      <MessageActions
        visible={actionsTarget !== null}
        onClose={handleActionsClose}
        onEdit={handleActionsEdit}
        onDelete={handleActionsDelete}
        onReroll={handleReroll}
        onCopy={handleCopyMessage}
        onFork={handleFork}
        onRerollMessage={handleRerollMessage}
        onReformat={handleReformat}
        canEdit={actionsTarget ? actionsTarget.message.id > 0 : false}
        canDelete={true}
        canReroll={actionsTarget ? !actionsTarget.isUser : false}
        canFork={actionsTarget ? actionsTarget.message.id > 0 : false}
        canRerollMessage={
          actionsTarget
            ? actionsTarget.isUser &&
              isLastMessage &&
              actionsTarget.message.id > 0
            : false
        }
        canReformat={
          actionsTarget
            ? !actionsTarget.isUser && actionsTarget.message.id > 0
            : false
        }
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
        visible={deleteAlertVisible}
        title={deleteAlertTitle}
        message={deleteAlertMessage}
        buttons={deleteAlertButtons}
        onDismiss={handleAlertDismiss}
      />

      <CustomBottomSheet
        visible={allChatsVisible}
        onClose={handleAllChatsClose}
      >
        <View style={styles.allChatsContent}>
          <View style={styles.allChatsTitleRow}>
            <Pressable
              onPress={handleAllChatsBack}
              style={styles.allChatsBackBtn}
            >
              <Text style={styles.allChatsBackText}>{"\u2190"}</Text>
            </Pressable>
            <Text style={styles.allChatsTitle}>{characterName}</Text>
            <View style={styles.allChatsBackBtn} />
          </View>
          {allChatsLoading ? (
            <ActivityIndicator
              color={colors.accent}
              style={{ paddingVertical: 24 }}
            />
          ) : allChats.length === 0 ? (
            <Text style={styles.allChatsEmpty}>
              No chats with this character
            </Text>
          ) : (
            <ScrollView style={styles.allChatsList}>
              {allChats.map((chat) => (
                <Pressable
                  key={chat.id}
                  style={({ pressed }) => [
                    styles.allChatsRow,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => {
                    setAllChatsVisible(false);
                    navigate("ChatScreen", {
                      chatId: chat.id,
                      characterName: chat.character.name || characterName,
                      characterId: chat.character_id,
                    });
                  }}
                >
                  <Avatar
                    uri={botAvatarUrl(chat.character.avatar)}
                    name={chat.character.name}
                    size={36}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.allChatsRowName} numberOfLines={1}>
                      {chat.character.name}
                    </Text>
                    <Text style={styles.allChatsRowMeta}>
                      {chat.chat_count} messages
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </CustomBottomSheet>

      <Modal
        visible={systemPromptVisible}
        transparent
        animationType="fade"
        onRequestClose={handleSystemPromptClose}
      >
        <View style={styles.sysPromptOverlay}>
          <View style={styles.sysPromptModal}>
            <View style={styles.sysPromptHeader}>
              <Text style={styles.sysPromptTitle}>System Prompt</Text>
              <Pressable onPress={handleSystemPromptClose}>
                <Text style={styles.sysPromptClose}>{"\u2715"}</Text>
              </Pressable>
            </View>
            {systemPromptError ? (
              <Text style={styles.sysPromptError}>{systemPromptError}</Text>
            ) : systemPromptLoading &&
              !systemPromptContent &&
              !botPersonalityContent &&
              !scenarioContent ? (
              <ActivityIndicator
                color={colors.accent}
                style={{ paddingVertical: 24 }}
              />
            ) : (
              <ScrollView style={styles.sysPromptScroll}>
                {systemPromptLoading && (
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
                {systemPromptContent.length > 0 && (
                  <CollapsibleSection title="System Prompt">
                    <TextInput
                      multiline
                      label="Raw System Prompt"
                      style={styles.sysPromptTextInput}
                      editable={!systemPromptLoading}
                    >
                      {systemPromptContent}
                    </TextInput>
                    <Pressable
                      style={styles.sysPromptCopyBtn}
                      onPress={() => {
                        try {
                          const Clipboard = require("expo-clipboard");
                          Clipboard.setStringAsync(systemPromptContent);
                        } catch {}
                      }}
                    >
                      <Text style={styles.sysPromptCopyText}>Copy</Text>
                    </Pressable>
                  </CollapsibleSection>
                )}
                {botPersonalityContent.length > 0 && (
                  <CollapsibleSection title="Personality">
                    <TextInput
                      multiline
                      label="Bot Personality"
                      style={styles.sysPromptTextInput}
                      editable={!systemPromptLoading}
                    >
                      {botPersonalityContent}
                    </TextInput>

                    <Pressable
                      style={styles.sysPromptCopyBtn}
                      onPress={() => {
                        try {
                          const Clipboard = require("expo-clipboard");
                          Clipboard.setStringAsync(botPersonalityContent);
                        } catch {}
                      }}
                    >
                      <Text style={styles.sysPromptCopyText}>Copy</Text>
                    </Pressable>
                  </CollapsibleSection>
                )}
                {scenarioContent.length > 0 && (
                  <CollapsibleSection title="Scenario">
                    <TextInput
                      multiline
                      label="Scenario"
                      style={styles.sysPromptTextInput}
                      editable={!systemPromptLoading}
                    >
                      {scenarioContent}
                    </TextInput>

                    <Pressable
                      style={styles.sysPromptCopyBtn}
                      onPress={() => {
                        try {
                          const Clipboard = require("expo-clipboard");
                          Clipboard.setStringAsync(scenarioContent);
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
