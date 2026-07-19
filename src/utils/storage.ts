import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "./constants";

export interface ChatLocalData {
    local_mode: boolean;
    personality: string;
    scenario: string;
}

export const storage = {
    async setAccessToken(token: string): Promise<void> {
        await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, token);
    },

    async getAccessToken(): Promise<string | null> {
        return SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    },

    async setRefreshToken(token: string): Promise<void> {
        await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, token);
    },

    async getRefreshToken(): Promise<string | null> {
        return SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    },

    async setUser(user: object): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    },

    async getUser<T>(): Promise<T | null> {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.USER);
        return data ? JSON.parse(data) : null;
    },

    async setCfClearance(token: string): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEYS.CF_CLEARANCE, token);
    },

    async getCfClearance(): Promise<string | null> {
        return AsyncStorage.getItem(STORAGE_KEYS.CF_CLEARANCE);
    },

    async setCfBm(token: string): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEYS.CF_BM, token);
    },

    async getCfBm(): Promise<string | null> {
        return AsyncStorage.getItem(STORAGE_KEYS.CF_BM);
    },

    async setTokenExpiresAt(ts: number): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, String(ts));
    },

    async getTokenExpiresAt(): Promise<number | null> {
        const v = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
        return v ? Number(v) : null;
    },

    async setUserAgent(ua: string): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_AGENT, ua);
    },

    async getUserAgent(): Promise<string | null> {
        return AsyncStorage.getItem(STORAGE_KEYS.USER_AGENT);
    },

    async setDiscoverFilters(filters: object): Promise<void> {
        await AsyncStorage.setItem(
            STORAGE_KEYS.DISCOVER_FILTERS,
            JSON.stringify(filters),
        );
    },

    async getDiscoverFilters<T>(): Promise<T | null> {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.DISCOVER_FILTERS);
        return data ? JSON.parse(data) : null;
    },

    async setChatLayout(layout: string): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEYS.CHAT_LAYOUT, layout);
    },

    async getChatLayout(): Promise<string | null> {
        return AsyncStorage.getItem(STORAGE_KEYS.CHAT_LAYOUT);
    },

    async setShowTimestamps(show: boolean): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEYS.SHOW_TIMESTAMPS, String(show));
    },

    async getShowTimestamps(): Promise<boolean> {
        const v = await AsyncStorage.getItem(STORAGE_KEYS.SHOW_TIMESTAMPS);
        return v === "true";
    },

    async setAutoFormatEnabled(enabled: boolean): Promise<void> {
        await AsyncStorage.setItem(
            STORAGE_KEYS.AUTO_FORMAT_ENABLED,
            String(enabled),
        );
    },

    async getAutoFormatEnabled(): Promise<boolean> {
        const v = await AsyncStorage.getItem(STORAGE_KEYS.AUTO_FORMAT_ENABLED);
        return v === "true";
    },

    async setNarrationWrapper(wrapper: string): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEYS.NARRATION_WRAPPER, wrapper);
    },

    async getNarrationWrapper(): Promise<string> {
        const v = await AsyncStorage.getItem(STORAGE_KEYS.NARRATION_WRAPPER);
        return v ?? "*";
    },

    async setCreateBotState(state: object): Promise<void> {
        await AsyncStorage.setItem(
            STORAGE_KEYS.CREATE_BOT_STATE,
            JSON.stringify(state),
        );
    },

    async getCreateBotState<T>(): Promise<T | null> {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.CREATE_BOT_STATE);
        return data ? JSON.parse(data) : null;
    },

    async removeCreateBotState(): Promise<void> {
        await AsyncStorage.removeItem(STORAGE_KEYS.CREATE_BOT_STATE);
    },

    async setChatCentered(centered: boolean): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.CHAT_CENTERED, String(centered));
  },

  async getChatCentered(): Promise<boolean> {
    const v = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_CENTERED);
    return v === "true";
  },

  async setEditBotState(state: object): Promise<void> {
        await AsyncStorage.setItem(
            STORAGE_KEYS.EDIT_BOT_STATE,
            JSON.stringify(state),
        );
    },

    async getEditBotState<T>(): Promise<T | null> {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.EDIT_BOT_STATE);
        return data ? JSON.parse(data) : null;
    },

    async removeEditBotState(): Promise<void> {
        await AsyncStorage.removeItem(STORAGE_KEYS.EDIT_BOT_STATE);
    },

    async setDateFormat(mode: "relative" | "absolute"): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEYS.DATE_FORMAT, mode);
    },

    async getDateFormat(): Promise<"relative" | "absolute"> {
        const v = await AsyncStorage.getItem(STORAGE_KEYS.DATE_FORMAT);
        return v === "absolute" ? "absolute" : "relative";
    },

    async getChatLocalData(chatId: number): Promise<ChatLocalData | null> {
        const key = `${STORAGE_KEYS.CHAT_LOCAL_DATA_PREFIX}${chatId}`;
        const data = await AsyncStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },

    async setChatLocalData(chatId: number, data: ChatLocalData): Promise<void> {
        const key = `${STORAGE_KEYS.CHAT_LOCAL_DATA_PREFIX}${chatId}`;
        await AsyncStorage.setItem(key, JSON.stringify(data));
    },

    async removeChatLocalData(chatId: number): Promise<void> {
        const key = `${STORAGE_KEYS.CHAT_LOCAL_DATA_PREFIX}${chatId}`;
        await AsyncStorage.removeItem(key);
    },

    async getHiddenCharacters(): Promise<string[]> {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.HIDDEN_CHARACTERS);
        return data ? JSON.parse(data) : [];
    },

    async setHiddenCharacters(ids: string[]): Promise<void> {
        await AsyncStorage.setItem(
            STORAGE_KEYS.HIDDEN_CHARACTERS,
            JSON.stringify(ids),
        );
    },

    async setReviewReactionsEnabled(enabled: boolean): Promise<void> {
        await AsyncStorage.setItem(
            STORAGE_KEYS.REVIEW_REACTIONS_ENABLED,
            String(enabled),
        );
    },

    async getReviewReactionsEnabled(): Promise<boolean> {
        const v = await AsyncStorage.getItem(STORAGE_KEYS.REVIEW_REACTIONS_ENABLED);
        return v === "true";
    },

    async setFullResImages(enabled: boolean): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEYS.FULL_RES_IMAGES, String(enabled));
    },
    async getFullResImages(): Promise<boolean> {
        const v = await AsyncStorage.getItem(STORAGE_KEYS.FULL_RES_IMAGES);
        return v === "true";
    },

    async clearAll(): Promise<void> {
        await Promise.all([
            SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
            SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
            AsyncStorage.removeItem(STORAGE_KEYS.USER),
            AsyncStorage.removeItem(STORAGE_KEYS.CF_CLEARANCE),
            AsyncStorage.removeItem(STORAGE_KEYS.CF_BM),
            AsyncStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES_AT),
            AsyncStorage.removeItem(STORAGE_KEYS.USER_AGENT),
        ]);
    },
};
