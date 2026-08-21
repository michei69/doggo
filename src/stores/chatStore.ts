import { create } from "zustand";
import type {
    ChatListItem,
    ChatMessage,
    ChatDetail,
    UserProfile,
} from "../types/api";
import * as chatsApi from "../api/chats";
import {
    storage,
    chatLayoutPref,
    showTimestampsPref,
    autoFormatEnabledPref,
    narrationWrapperPref,
    chatCenteredPref,
} from "../utils/storage";
import type { LayoutOption } from "../utils/constants";

function formatError(err: any): string {
    if (err.message?.includes("Request failed")) {
        return "Connection error. Please check your internet and try again.";
    }
    return err.message || "Something went wrong";
}

interface ChatState {
    chats: ChatListItem[];
    activeChatId: number | null;
    activeChatDetail: ChatDetail | null;
    messages: ChatMessage[];
    isLoadingChats: boolean;
    isLoadingMessages: boolean;
    isSending: boolean;
    isGenerating: boolean;
    error: string | null;
    hasMoreChats: boolean;
    chatsPage: number;
    activeThinking: string;
    enableThinking: boolean;
    userConfig: UserProfile["config"] | null;
    chatLayout: LayoutOption;
    showTimestamps: boolean;
    chosenVariantIds: Set<number>;
    autoFormatEnabled: boolean;
    narrationWrapper: string;
    chatCentered: boolean;

    loadChats: (page?: number) => Promise<void>;
    loadChatMessages: (chatId: number) => Promise<void>;
    createChat: (characterId: string, personaId?: string) => Promise<number>;
    removeChat: (chatId: number) => void;
    addMessage: (message: ChatMessage) => void;
    updateMessage: (messageId: number, newContent: string) => void;
    removeMessages: (messageIds: number[]) => void;
    replaceMessages: (messages: ChatMessage[]) => void;
    setActiveChat: (chatId: number | null) => void;
    clearMessages: () => void;
    setSending: (sending: boolean) => void;
    setGenerating: (generating: boolean) => void;
    updateMessageOptimistically: (
        tempId: number,
        changes: Partial<ChatMessage>,
    ) => void;
    setActiveThinking: (thinking: string) => void;
    setEnableThinking: (enabled: boolean) => void;
    setUserConfig: (config: UserProfile["config"]) => void;
    setChatLayout: (layout: LayoutOption) => void;
    loadChatLayout: () => Promise<void>;
    setShowTimestamps: (show: boolean) => void;
    setChosenVariant: (groupIds: number[], chosenId: number) => void;
    setAutoFormatEnabled: (enabled: boolean) => void;
    setNarrationWrapper: (wrapper: string) => void;
    loadAutoFormatSettings: () => Promise<void>;
    setChatCentered: (centered: boolean) => void;
    loadChatCentered: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
    chats: [],
    activeChatId: null,
    activeChatDetail: null,
    messages: [],
    isLoadingChats: false,
    isLoadingMessages: false,
    isSending: false,
    isGenerating: false,
    error: null,
    hasMoreChats: true,
    chatsPage: 1,
    activeThinking: "",
    enableThinking: false,
    userConfig: null,
    chatLayout: "messaging",
    showTimestamps: true,
    chosenVariantIds: new Set<number>(),
    autoFormatEnabled: false,
    narrationWrapper: "*",
    chatCentered: false,

    loadChats: async (page = 1) => {
        const state = get();
        if (state.isLoadingChats) return;
        set({ isLoadingChats: true, error: null });
        try {
            const newChats = await chatsApi.getChats(page);
            const state = get();
            if (page === 1) {
                set({
                    chats: newChats,
                    chatsPage: 1,
                    hasMoreChats: newChats.length > 0,
                    isLoadingChats: false,
                });
            } else {
                set({
                    chats: [...state.chats, ...newChats],
                    chatsPage: page,
                    hasMoreChats: newChats.length > 0,
                    isLoadingChats: false,
                });
            }
        } catch (err: any) {
            set({ error: formatError(err), isLoadingChats: false });
            throw err;
        }
    },

    loadChatMessages: async (chatId) => {
        const state = get();
        if (state.isLoadingMessages && state.activeChatId === chatId) return;
        set({
            isLoadingMessages: true,
            error: null,
            activeChatId: chatId,
            activeThinking: "",
        });
        try {
            const detail = await chatsApi.getChatDetail(chatId);
            set({
                activeChatDetail: detail,
                messages: [...detail.chatMessages].reverse(),
                isLoadingMessages: false,
            });
        } catch (err: any) {
            set({ error: formatError(err), isLoadingMessages: false });
            throw err;
        }
    },

    createChat: async (characterId, personaId?) => {
        const response = await chatsApi.createChat(characterId, personaId);
        set((state) => ({
            chats: [
                {
                    character: {
                        avatar: "",
                        chat_name: "",
                        description: "",
                        is_image_nsfw: false,
                        is_public: false,
                        name: "",
                    },
                    character_id: characterId,
                    chat_count: 0,
                    created_at: response.created_at,
                    id: response.id,
                    is_public: false,
                    persona_id: null,
                    personas: [],
                    summary: "",
                    updated_at: response.updated_at,
                    user_id: response.user_id,
                },
                ...state.chats,
            ],
        }));
        return response.id;
    },

    removeChat: (chatId) => {
        storage.removeChatLocalData(chatId);
        set((state) => ({
            chats: state.chats.filter((c) => c.id !== chatId),
        }));
    },

    addMessage: (message) => {
        set((state) => ({
            messages: [...state.messages, message],
        }));
    },

    updateMessage: (messageId, newContent) => {
        set((state) => ({
            messages: state.messages.map((m) =>
                m.id === messageId ? { ...m, message: newContent } : m,
            ),
        }));
    },

    removeMessages: (messageIds) => {
        const ids = new Set(messageIds);
        set((state) => ({
            messages: state.messages.filter((m) => !ids.has(m.id)),
        }));
    },

    replaceMessages: (messages) => {
        set({ messages });
    },

    setActiveChat: (chatId) => {
        set({ activeChatId: chatId });
    },

    clearMessages: () => {
        set({ messages: [], activeChatId: null, activeChatDetail: null });
    },

    setSending: (sending) => {
        set({ isSending: sending });
    },

    setGenerating: (generating) => {
        set({ isGenerating: generating });
    },

    updateMessageOptimistically: (tempId, changes) => {
        set((state) => ({
            messages: state.messages.map((m) =>
                m.id === tempId ? { ...m, ...changes } : m,
            ),
        }));
    },

    setActiveThinking: (thinking) => {
        set({ activeThinking: thinking });
    },

    setEnableThinking: (enabled) => {
        set({ enableThinking: enabled });
    },

    setUserConfig: (config) => {
        set({ userConfig: config });
    },

    setChatLayout: (layout) => {
        chatLayoutPref.set(layout);
        set({ chatLayout: layout });
    },

    loadChatLayout: async () => {
        const [saved, showTs] = await Promise.all([
            chatLayoutPref.get(),
            showTimestampsPref.get(),
        ]);
        if (
            saved === "messaging" ||
            saved === "janitor" ||
            saved === "edgeToEdge"
        ) {
            set({ chatLayout: saved });
        }
        set({ showTimestamps: showTs });
    },

    setShowTimestamps: (show) => {
        showTimestampsPref.set(show);
        set({ showTimestamps: show });
    },

    setChosenVariant: (groupIds: number[], chosenId: number) => {
        set((state) => {
            const next = new Set(state.chosenVariantIds);
            for (const id of groupIds) {
                next.delete(id);
            }
            next.add(chosenId);
            return { chosenVariantIds: next };
        });
    },

    setAutoFormatEnabled: (enabled: boolean) => {
        autoFormatEnabledPref.set(enabled);
        set({ autoFormatEnabled: enabled });
    },

    setNarrationWrapper: (wrapper: string) => {
        narrationWrapperPref.set(wrapper);
        set({ narrationWrapper: wrapper });
    },

    loadAutoFormatSettings: async () => {
        const [enabled, wrapper] = await Promise.all([
            autoFormatEnabledPref.get(),
            narrationWrapperPref.get(),
        ]);
        set({ autoFormatEnabled: enabled, narrationWrapper: wrapper ?? "*" });
    },

    setChatCentered: (centered) => {
        chatCenteredPref.set(centered);
        set({ chatCentered: centered });
    },

    loadChatCentered: async () => {
        const centered = await chatCenteredPref.get();
        set({ chatCentered: centered });
    },
}));
