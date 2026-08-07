import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useChat } from "../../../hooks/useChat";
import { useAuthStore } from "../../../stores/authStore";
import { useChatStore } from "../../../stores/chatStore";
import type { ChatsStackParamList } from "../../../navigation/types";
import type { ChatMessage, ChatListItem } from "../../../types/api";
import { avatarUrl, botAvatarUrl } from "../../../utils/assets";
import { useAlert } from "../../../hooks/useAlert";
import {
    clearAndResetMessages,
    getCharacterChats,
    fetchSystemPrompt,
    forkChat,
    attemptExtractSystemPrompt,
} from "../../../api/chats";
import { apiClient } from "../../../api/client";
import { useKeyboardHeight } from "../../../hooks/useKeyboardHeight";
import { useIsTablet } from "../../../hooks/useIsTablet";
import { processSystemMessage, processText } from "../../../utils/processText";
import { File as ExpoFile } from "expo-file-system";
import { StorageAccessFramework, writeAsStringAsync } from "expo-file-system/legacy";
import { toast } from "../../../utils/toast";
import { cleanTags, generify } from "../../../utils/markdown";
import { storage } from "../../../utils/storage";
import { validateMessagesImport } from "./importUtils";
import { useSheetStore } from "../../../stores/sheetStore";

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

export function useChatScreen() {
    const route = useRoute<Route>();
    const navigation = useNavigation<Nav>();
    const { goBack, setOptions, navigate, replace } = navigation;
    const { chatId, characterName, characterId } = route.params;
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [actionsTarget, setActionsTarget] = useState<{
        message: ChatMessage;
        isUser: boolean;
    } | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
    const { alert: deleteAlert, showAlert, dismissAlert } = useAlert();
    const [newChatPickerVisible, setNewChatPickerVisible] = useState(false);
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

    // When a bottom sheet is open, the navigation back gesture/button
    // should close the sheet instead of popping the screen. The sheets
    // render via a portal above the navigator, so without this the back
    // swipe acts like no sheet is open at all.
    useEffect(() => {
        const unsubscribe = navigation.addListener("beforeRemove", (e: any) => {
            const visibleSheets = useSheetStore
                .getState()
                .entries.filter((entry) => entry.visible);
            if (visibleSheets.length === 0) return;
            e.preventDefault();
            // Close the top-most visible sheet; repeat on next back press.
            visibleSheets[visibleSheets.length - 1].onClose();
        });
        return unsubscribe;
    }, [navigation]);

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
                            const currentMessages =
                                useChatStore.getState().messages;
                            const serverIds = currentMessages.reduce<
                                number[]
                            >((acc, m) => {
                                if (m.id > 0) acc.push(m.id);
                                return acc;
                            }, []);
                            useChatStore.getState().clearMessages();
                            await clearAndResetMessages(
                                chatId,
                                serverIds,
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
