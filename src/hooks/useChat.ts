import { useCallback, useRef } from "react";
import { useChatStore } from "../stores/chatStore";
import { useAuthStore } from "../stores/authStore";
import * as chatsApi from "../api/chats";
import { sseClient, type SSECallbacks } from "../api/sse";
import { getMyProfile } from "../api/profile";
import type { CreateMessageRequest } from "../types/api";
import { useTurnstile } from "../components/turnstile/TurnstileProvider";
import { groupMessages } from "../components/chat/MessageList";
import { processText } from "../utils/processText";
import { TURNSTILE_LOGIN_SITE_KEY } from "../utils/turnstile";

const TOKEN_BUFFER_MS = 150;

export function createTokenBuffer(onFlush: (accumulated: string) => void) {
    let buffer = "";
    let timer: ReturnType<typeof setTimeout> | null = null;

    function flush() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        if (buffer.length > 0) {
            onFlush(buffer);
            buffer = "";
        }
    }

    function add(token: string) {
        buffer += token;
        if (!timer) {
            timer = setTimeout(flush, TOKEN_BUFFER_MS);
        }
    }

    return { add, flush };
}

export async function withChallengeRetry<T>(
    call: () => Promise<T>,
    showChallenge: (html: string) => Promise<string>,
    showTurnstile: (siteKey: string) => Promise<string>,
): Promise<T> {
    try {
        return await call();
    } catch (err: any) {
        if (err.challengeHtml && err.needsCloudflareChallenge) {
            console.log(
                "[API] showing Cloudflare challenge, retrying after solve",
            );
            await showChallenge(err.challengeHtml);
            return await call();
        }
        if (err.response?.status === 401) {
            console.log(
                "[API] 401 detected, showing Turnstile for new clearance",
            );
            const token = await showTurnstile(TURNSTILE_LOGIN_SITE_KEY);
            useAuthStore.getState().setCfClearance(token);
            return await call();
        }
        throw err;
    }
}

export function useChat() {
    const chats = useChatStore((s) => s.chats);
    const activeChatId = useChatStore((s) => s.activeChatId);
    const activeChatDetail = useChatStore((s) => s.activeChatDetail);
    const messages = useChatStore((s) => s.messages);
    const isLoadingChats = useChatStore((s) => s.isLoadingChats);
    const isLoadingMessages = useChatStore((s) => s.isLoadingMessages);
    const isSending = useChatStore((s) => s.isSending);
    const isGenerating = useChatStore((s) => s.isGenerating);
    const error = useChatStore((s) => s.error);
    const hasMoreChats = useChatStore((s) => s.hasMoreChats);
    const chatsPage = useChatStore((s) => s.chatsPage);

    const activeThinking = useChatStore((s) => s.activeThinking);
    const enableThinking = useChatStore((s) => s.enableThinking);
    const userConfig = useChatStore((s) => s.userConfig);

    const loadChatsStore = useChatStore((s) => s.loadChats);
    const loadChatMessagesStore = useChatStore((s) => s.loadChatMessages);
    const storeCreateChat = useChatStore((s) => s.createChat);
    const storeRemoveChat = useChatStore((s) => s.removeChat);
    const storeAddMessage = useChatStore((s) => s.addMessage);
    const storeUpdateMessage = useChatStore((s) => s.updateMessage);
    const storeRemoveMessages = useChatStore((s) => s.removeMessages);
    const storeSetSending = useChatStore((s) => s.setSending);
    const storeSetGenerating = useChatStore((s) => s.setGenerating);
    const storeUpdateOptimistically = useChatStore(
        (s) => s.updateMessageOptimistically,
    );
    const storeSetActiveChat = useChatStore((s) => s.setActiveChat);
    const storeClearMessages = useChatStore((s) => s.clearMessages);
    const storeSetActiveThinking = useChatStore((s) => s.setActiveThinking);
    const storeSetEnableThinking = useChatStore((s) => s.setEnableThinking);
    const storeSetUserConfig = useChatStore((s) => s.setUserConfig);

    const genAbortRef = useRef<AbortController | null>(null);

    const { showChallenge, showTurnstile } = useTurnstile();

    const loadChats = useCallback(
        async (page = 1) => {
            await withChallengeRetry(
                () => loadChatsStore(page),
                showChallenge,
                showTurnstile,
            );
        },
        [loadChatsStore, showChallenge, showTurnstile],
    );

    const loadMessages = useCallback(
        async (chatId: number) => {
            await withChallengeRetry(
                () => loadChatMessagesStore(chatId),
                showChallenge,
                showTurnstile,
            );
        },
        [loadChatMessagesStore, showChallenge, showTurnstile],
    );

    const sendMessage = useCallback(
        async (
            content: string,
            characterId: string,
            chatId: number,
            personaId: string | null = null,
            personaName: string = "",
            personaAvatar: string = "",
            isBot: boolean = false,
            isMain: boolean = true,
        ) => {
            const request: CreateMessageRequest = {
                is_bot: isBot,
                is_main: isMain && !isBot,
                message: content,
                metadata: {
                    persona_id: personaId,
                    persona_name: personaName,
                    persona_avatar: personaAvatar,
                },
                character_id: characterId,
                chat_id: chatId,
            };
            storeSetSending(true);
            try {
                const rawResponse: any = await withChallengeRetry(
                    () => chatsApi.createMessage(request),
                    showChallenge,
                    showTurnstile,
                );
                const message = rawResponse?.data ?? rawResponse;
                storeAddMessage(message[0]);
                storeSetSending(false);
                return message[0];
            } catch (err) {
                storeSetSending(false);
                throw err;
            }
        },
        [storeAddMessage, storeSetSending, showChallenge, showTurnstile],
    );

    const editMsg = useCallback(
        async (chatId: number, messageId: number, content: string) => {
            storeSetActiveThinking("");
            await withChallengeRetry(
                () =>
                    chatsApi.editMessage(chatId, messageId, {
                        message: content,
                    }),
                showChallenge,
                showTurnstile,
            );
            storeUpdateMessage(messageId, content);
        },
        [
            storeUpdateMessage,
            showChallenge,
            showTurnstile,
            storeSetActiveThinking,
        ],
    );

    const deleteMsg = useCallback(
        async (chatId: number, messageIds: number[]) => {
            storeSetActiveThinking("");
            await withChallengeRetry(
                () => chatsApi.deleteMessages(chatId, messageIds),
                showChallenge,
                showTurnstile,
            );
            storeRemoveMessages(messageIds);
        },
        [
            storeRemoveMessages,
            showChallenge,
            showTurnstile,
            storeSetActiveThinking,
        ],
    );

    const startNewChat = useCallback(
        async (characterId: string, personaId?: string) => {
            return await withChallengeRetry(
                () => storeCreateChat(characterId, personaId),
                showChallenge,
                showTurnstile,
            );
        },
        [storeCreateChat, showChallenge, showTurnstile],
    );

    const deleteChat = useCallback(
        async (chatId: number) => {
            await withChallengeRetry(
                () => chatsApi.deleteChat(chatId),
                showChallenge,
                showTurnstile,
            );
            storeRemoveChat(chatId);
        },
        [storeRemoveChat, showChallenge, showTurnstile],
    );

    const generateBotResponse = useCallback(
        async (
            chatId: number,
            characterId: string,
            personaId: string | null,
            generateMode: string = "NEW",
        ) => {
            const detail = useChatStore.getState().activeChatDetail;
            if (!detail) return;

            // Mark last bot message(s) as main before generating
            const allMsgs = useChatStore.getState().messages;
            const grouped = groupMessages(allMsgs);
            for (let i = grouped.length - 1; i >= 0; i--) {
                if (grouped[i].isBot) {
                    const botMsgs = grouped[i].messages.filter((m) => m.id > 0);
                    let chosenId: number | undefined;
                    if (botMsgs.length === 1) {
                        chosenId = botMsgs[0].id;
                        chatsApi.setMessageMain(chatId, botMsgs[0].id).catch(() => {});
                    } else if (botMsgs.length > 1) {
                        const chosenIds = useChatStore.getState().chosenVariantIds;
                        const chosen = botMsgs.find((m) => chosenIds.has(m.id));
                        if (chosen) {
                            chosenId = chosen.id;
                            chatsApi.setMessageMain(chatId, chosen.id).catch(() => {});
                        }
                    }
                    if (chosenId !== undefined) {
                        useChatStore.setState((s) => ({
                            messages: s.messages.map((m) =>
                                m.id === chosenId ? { ...m, is_main: true } : { ...m, is_main: m.is_bot ? false : m.is_main },
                            ),
                        }));
                    }
                    break;
                }
            }

            storeSetGenerating(true);
            storeSetActiveThinking("");

            const abort = new AbortController();
            genAbortRef.current = abort;

            const tempMessage = {
                chat_id: chatId,
                created_at: new Date().toISOString(),
                id: -Date.now(),
                is_bot: true,
                is_main: false,
                message: "",
                metadata: null,
                rating: null,
            };
            storeAddMessage(tempMessage);

            let thinkingBuf = "";
            let thinkingTimer: ReturnType<typeof setTimeout> | null = null;

            const flushThinking = () => {
                if (thinkingTimer) {
                    clearTimeout(thinkingTimer);
                    thinkingTimer = null;
                }
                if (thinkingBuf) {
                    storeSetActiveThinking(thinkingBuf);
                    thinkingBuf = "";
                }
            };

            const addThinking = (t: string) => {
                thinkingBuf = t;
                if (!thinkingTimer) {
                    thinkingTimer = setTimeout(flushThinking, TOKEN_BUFFER_MS);
                }
            };

            try {
                const profile = await getMyProfile();
                storeSetUserConfig(profile.config);
                const selectedProxy = profile.config.proxyConfigurations.find(
                    (p) => p.id === profile.config.selectedProxyConfigId,
                );

                const enableThinking =
                    profile.config.generation_settings.enable_thinking ?? false;
                storeSetEnableThinking(enableThinking);

                const privacyMode =
                    profile.config.generation_settings.privacy_mode ?? false;

                const userConfig = {
                    ...profile.config,
                    reverseProxyKey: selectedProxy?.apiKey ?? "",
                    openAiModel:
                        selectedProxy?.model ??
                        profile.config.openAiModel ??
                        "",
                    open_ai_jailbreak_prompt:
                        selectedProxy?.jailbreakPrompt ??
                        profile.config.open_ai_jailbreak_prompt ??
                        "",
                };

                if (privacyMode) {
                    userConfig.open_ai_reverse_proxy = "http://doggy.privacy/";
                    userConfig.reverseProxyKey = "redacted";
                    userConfig.openAiModel = "doggy-privacy";
                }

                const storeMessages = useChatStore.getState().messages;
                const chosenIds = useChatStore.getState().chosenVariantIds;
                const grouped = groupMessages(storeMessages);
                // Exclude the last group if it's a bot group — those are the
                // variants being regenerated (plus the temp placeholder).
                const end =
                    grouped.length > 0 && grouped[grouped.length - 1].isBot
                        ? grouped.length - 1
                        : grouped.length;
                const filteredMessages: typeof storeMessages = [];
                for (let i = 0; i < end; i++) {
                    const g = grouped[i];
                    if (g.isBot) {
                        const chosen = g.messages.find((m) =>
                            chosenIds.has(m.id),
                        );
                        filteredMessages.push(
                            chosen ?? g.messages[g.messages.length - 1],
                        );
                    } else {
                        filteredMessages.push(g.messages[0]);
                    }
                }

                const chatMessages = filteredMessages;
                const body = {
                    chat: {
                        character_id: detail.chat.character_id,
                        id: detail.chat.id,
                        persona_id: detail.chat.persona_id || personaId,
                        summary: detail.chat.summary,
                        user_id: detail.chat.user_id,
                    },
                    chatMessages: chatMessages.map(m => ({
                        chat_id: m.chat_id,
                        created_at: m.created_at,
                        id: m.id,
                        is_bot: m.is_bot,
                        is_main: m.is_main,
                        message: m.message,
                        character_id: m.is_bot ? detail.chat.character_id : undefined,
                        persona_id: m.is_bot ? undefined : detail.chat.persona_id || personaId
                    })),
                    clientPlatform: "web",
                    forcedPromptGenerationCacheRefetch: {
                        character: false,
                        chat: false,
                        profile: false,
                        script: false,
                    },
                    generateMode,
                    generateType: "CHAT",
                    personas: detail.personas,
                    profile: {
                        id: profile.id,
                        name: profile.name,
                        user_name: profile.user_name,
                    },
                    profiles: detail.personas.map((p) => ({
                        appearance: p.appearance,
                        id: p.id,
                        name: p.name,
                        type: "persona",
                    })),
                    userConfig: {
                        ...userConfig,
                        proxyConfigurations: undefined,
                        openAIKey: null,
                        selectedProxyConfigId: undefined,
                        bio_preview_images: undefined,
                        claudeApiKey: null
                    },
                };

                const msgBuffer = createTokenBuffer((accumulated) => {
                    const msgs = useChatStore.getState().messages;
                    const last = msgs[msgs.length - 1];
                    if (last && last.id === tempMessage.id) {
                        storeUpdateOptimistically(tempMessage.id, {
                            message: last.message + accumulated,
                        });
                    }
                });

                await chatsApi.generateAlpha(
                    body,
                    abort.signal,
                    {
                        onToken: (token: string) => {
                            const msgs = useChatStore.getState().messages;
                            const last = msgs[msgs.length - 1];
                            if (last && last.id === tempMessage.id) {
                                msgBuffer.add(token);
                            }
                        },
                        onThinking: (thinking: string) => {
                            if (enableThinking) {
                                addThinking(thinking);
                            }
                        },
                        onComplete: async (fullMessage: string) => {
                            msgBuffer.flush();
                            flushThinking();
                            storeSetGenerating(false);
                            genAbortRef.current = null;
                            if (fullMessage) {
                                const state = useChatStore.getState();
                                const message = state.autoFormatEnabled
                                    ? processText(fullMessage, {
                                          wrapper: state.narrationWrapper,
                                          removeTags: true,
                                      })
                                    : fullMessage;
                                try {
                                    const rawResponse: any = await withChallengeRetry(
                                        () =>
                                            chatsApi.createMessage({
                                                is_bot: true,
                                                is_main: false,
                                                message,
                                                character_id: characterId,
                                                chat_id: chatId,
                                                created_at: new Date(),
                                                rating: null
                                            }),
                                        showChallenge,
                                        showTurnstile,
                                    );
                                    const savedMsg = rawResponse?.data ?? rawResponse;
                                    storeRemoveMessages([tempMessage.id]);
                                    if (Array.isArray(savedMsg)) {
                                        storeAddMessage(savedMsg[0]);
                                    }
                                } catch {}
                            }
                        },
                        onError: (err: Error) => {
                            flushThinking();
                            storeSetGenerating(false);
                            storeSetActiveThinking("");
                            genAbortRef.current = null;
                            storeUpdateOptimistically(tempMessage.id, {
                                message: `Error: ${err.message}`,
                            });
                        },
                    },
                    selectedProxy?.apiUrl,
                    selectedProxy?.apiKey,
                    selectedProxy?.model,
                );
            } catch (err: any) {
                storeSetGenerating(false);
                genAbortRef.current = null;
                if (
                    !(
                        err.name === "AbortError" ||
                        err.message?.includes("cancel")
                    )
                ) {
                    storeSetActiveThinking("");
                    storeUpdateOptimistically(tempMessage.id, {
                        message:
                            "Error: " + (err.message || "Generation failed"),
                    });
                } else {
                    storeRemoveMessages([tempMessage.id]);
                }
            }
        },
        [
            storeAddMessage,
            storeSetGenerating,
            storeUpdateOptimistically,
            showChallenge,
            showTurnstile,
            storeRemoveMessages,
            storeSetActiveThinking,
            storeSetEnableThinking,
            storeSetUserConfig,
        ],
    );

    const cancelGeneration = useCallback(async () => {
        genAbortRef.current?.abort();
        genAbortRef.current = null;

        const msgs = useChatStore.getState().messages;
        const last = msgs[msgs.length - 1];
        if (last && last.id < 0 && last.is_bot) {
            const detail = useChatStore.getState().activeChatDetail;
            const partialContent = last.message;
            if (partialContent && detail) {
                try {
                    const rawResponse: any = await withChallengeRetry(
                        () =>
                            chatsApi.createMessage({
                                is_bot: true,
                                is_main: false,
                                message: partialContent,
                                metadata: {
                                    persona_id: detail.chat.persona_id,
                                    persona_name: "",
                                    persona_avatar: "",
                                },
                                character_id: detail.chat.character_id,
                                chat_id: detail.chat.id,
                            }),
                        showChallenge,
                        showTurnstile,
                    );
                    const savedMsg = rawResponse?.data ?? rawResponse;
                    storeRemoveMessages([last.id]);
                    if (Array.isArray(savedMsg)) {
                        storeAddMessage(savedMsg[0]);
                    } else if (savedMsg?.id) {
                        storeAddMessage(savedMsg);
                    }
                } catch {
                    storeRemoveMessages([last.id]);
                }
            } else {
                storeRemoveMessages([last.id]);
            }
        }
        storeSetGenerating(false);
        try {
            await chatsApi.cancelGeneration();
        } catch {}
    }, [
        storeSetGenerating,
        storeRemoveMessages,
        storeAddMessage,
        showChallenge,
        showTurnstile,
    ]);

    const loadUserConfig = useCallback(async () => {
        try {
            const profile = await getMyProfile();
            storeSetUserConfig(profile.config);
        } catch {}
    }, [storeSetUserConfig]);

    const streamAIResponse = useCallback(
        (
            apiUrl: string,
            apiKey: string,
            model: string,
            msgArr: Array<{ role: string; content: string }>,
            chatId: number,
            characterId: string,
            personaId: string | null = null,
        ) => {
            storeSetSending(true);

            const tempMessage = {
                chat_id: chatId,
                created_at: new Date().toISOString(),
                id: -Date.now(),
                is_bot: true,
                is_main: false,
                message: "",
                metadata: null,
                rating: null,
            };
            storeAddMessage(tempMessage);

            let thinkingAccum = "";

            const msgBuffer = createTokenBuffer((accumulated) => {
                const currentMessages = useChatStore.getState().messages;
                const lastMsg = currentMessages[currentMessages.length - 1];
                if (lastMsg && lastMsg.id === tempMessage.id) {
                    storeUpdateOptimistically(tempMessage.id, {
                        message: lastMsg.message + accumulated,
                    });
                }
            });

            let thinkingBuf = "";
            let thinkingTimer: ReturnType<typeof setTimeout> | null = null;

            const flushThinking = () => {
                if (thinkingTimer) {
                    clearTimeout(thinkingTimer);
                    thinkingTimer = null;
                }
                if (thinkingBuf) {
                    thinkingAccum = thinkingBuf;
                    const state = useChatStore.getState();
                    if (state.enableThinking) {
                        storeSetActiveThinking(thinkingAccum);
                    }
                    thinkingBuf = "";
                }
            };

            const addThinking = (t: string) => {
                thinkingBuf = t;
                if (!thinkingTimer) {
                    thinkingTimer = setTimeout(flushThinking, TOKEN_BUFFER_MS);
                }
            };

            const callbacks: SSECallbacks = {
                onToken: (token) => {
                    msgBuffer.add(token);
                },
                onThinking: (thinking) => {
                    addThinking(thinking);
                },
                onComplete: async (fullMessage) => {
                    msgBuffer.flush();
                    flushThinking();
                    storeSetSending(false);
                    try {
                        const rawResponse: any = await withChallengeRetry(
                            () =>
                                chatsApi.createMessage({
                                    is_bot: true,
                                    is_main: false,
                                    message: fullMessage,
                                    metadata: {
                                        persona_id: personaId,
                                        persona_name: "",
                                        persona_avatar: "",
                                    },
                                    character_id: characterId,
                                    chat_id: chatId,
                                }),
                            showChallenge,
                            showTurnstile,
                        );
                        const savedMsg = rawResponse?.data ?? rawResponse;
                        storeRemoveMessages([tempMessage.id]);
                        if (Array.isArray(savedMsg)) {
                            storeAddMessage(savedMsg[0]);
                        }
                    } catch {}
                },
                onError: (err) => {
                    storeSetSending(false);
                    storeSetActiveThinking("");
                    storeUpdateOptimistically(tempMessage.id, {
                        message: `Error: ${err.message}`,
                    });
                },
            };

            sseClient.streamChat(apiUrl, apiKey, model, msgArr, callbacks);
        },
        [
            storeSetSending,
            storeAddMessage,
            storeUpdateOptimistically,
            showChallenge,
            showTurnstile,
            storeSetActiveThinking,
        ],
    );

    const abortStream = useCallback(() => {
        sseClient.abort();
        storeSetSending(false);
    }, [storeSetSending]);

    return {
        chats,
        activeChatId,
        activeChatDetail,
        messages,
        isLoadingChats,
        isLoadingMessages,
        isSending,
        isGenerating,
        error,
        hasMoreChats,
        chatsPage,
        activeThinking,
        enableThinking,
        loadChats,
        loadMessages,
        sendMessage,
        editMsg,
        deleteMsg,
        startNewChat,
        deleteChat,
        streamAIResponse,
        abortStream,
        generateBotResponse,
        cancelGeneration,
        loadUserConfig,
        setActiveChat: storeSetActiveChat,
        clearMessages: storeClearMessages,
        userConfig,
    };
}
