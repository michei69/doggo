import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "./constants";

interface ChatLocalData {
    local_mode: boolean;
    personality: string;
    scenario: string;
}

export function createBooleanPref(key: string, defaultValue: boolean) {
    return {
        async set(value: boolean): Promise<void> {
            await AsyncStorage.setItem(key, String(value));
        },
        async get(): Promise<boolean> {
            const v = await AsyncStorage.getItem(key);
            return v === null ? defaultValue : v === "true";
        },
    };
}

export function createStringPref(key: string, defaultValue: string | null) {
    return {
        async set(value: string): Promise<void> {
            await AsyncStorage.setItem(key, value);
        },
        async get(): Promise<string | null> {
            const v = await AsyncStorage.getItem(key);
            return v ?? defaultValue;
        },
    };
}

export function createJsonPref<T>(key: string, defaultValue: T | null) {
    return {
        async set(value: T): Promise<void> {
            await AsyncStorage.setItem(key, JSON.stringify(value));
        },
        async get<U = T>(): Promise<U | null> {
            const data = await AsyncStorage.getItem(key);
            return data ? (JSON.parse(data) as U) : (defaultValue as U | null);
        },
    };
}

export const chatLayoutPref = createStringPref(STORAGE_KEYS.CHAT_LAYOUT, null);
export const showTimestampsPref = createBooleanPref(
    STORAGE_KEYS.SHOW_TIMESTAMPS,
    false,
);
export const autoFormatEnabledPref = createBooleanPref(
    STORAGE_KEYS.AUTO_FORMAT_ENABLED,
    false,
);
export const narrationWrapperPref = createStringPref(
    STORAGE_KEYS.NARRATION_WRAPPER,
    "*",
);
export const chatCenteredPref = createBooleanPref(
    STORAGE_KEYS.CHAT_CENTERED,
    false,
);
export const reviewReactionsPref = createBooleanPref(
    STORAGE_KEYS.REVIEW_REACTIONS_ENABLED,
    false,
);
export const fullResImagesPref = createBooleanPref(
    STORAGE_KEYS.FULL_RES_IMAGES,
    false,
);
export const privacyModePref = createBooleanPref(
    STORAGE_KEYS.PRIVACY_MODE,
    false,
);
export const discoverFiltersPref = createJsonPref<object>(
    STORAGE_KEYS.DISCOVER_FILTERS,
    null,
);
export const createBotStatePref = createJsonPref<object>(
    STORAGE_KEYS.CREATE_BOT_STATE,
    null,
);
export const editBotStatePref = createJsonPref<object>(
    STORAGE_KEYS.EDIT_BOT_STATE,
    null,
);

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

    setDiscoverFilters: discoverFiltersPref.set,
    getDiscoverFilters: discoverFiltersPref.get,

    setChatLayout: chatLayoutPref.set,
    getChatLayout: chatLayoutPref.get,

    setShowTimestamps: showTimestampsPref.set,
    getShowTimestamps: showTimestampsPref.get,

    setAutoFormatEnabled: autoFormatEnabledPref.set,
    getAutoFormatEnabled: autoFormatEnabledPref.get,

    setNarrationWrapper: narrationWrapperPref.set,
    getNarrationWrapper: async (): Promise<string> =>
        (await narrationWrapperPref.get()) ?? "*",
    setCreateBotState: createBotStatePref.set,
    getCreateBotState: createBotStatePref.get,

    async removeCreateBotState(): Promise<void> {
        await AsyncStorage.removeItem(STORAGE_KEYS.CREATE_BOT_STATE);
    },

    setChatCentered: chatCenteredPref.set,
    getChatCentered: chatCenteredPref.get,

    setEditBotState: editBotStatePref.set,
    getEditBotState: editBotStatePref.get,

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

    setReviewReactionsEnabled: reviewReactionsPref.set,
    getReviewReactionsEnabled: reviewReactionsPref.get,

    setFullResImages: fullResImagesPref.set,
    getFullResImages: fullResImagesPref.get,

    setPrivacyMode: privacyModePref.set,
    getPrivacyMode: privacyModePref.get,

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
