import { create } from "zustand";
import type { AuthUser } from "../types/api";
import { storage } from "../utils/storage";
import * as authApi from "../api/auth";
import { setUserAgent } from "../utils/userAgent";

interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    user: AuthUser | null;
    cfClearance: string | null;
    cfBm: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    turnstileToken: string | null;

    initialize: () => Promise<void>;
    login: (
        email: string,
        password: string,
        captchaToken: string,
    ) => Promise<void>;
    register: (
        email: string,
        password: string,
        captchaToken: string,
    ) => Promise<void>;
    logout: () => Promise<void>;
    setCfClearance: (token: string) => void;
    setCfBm: (token: string) => void;
    setTurnstileToken: (token: string) => void;
    updateProfile: (user: Partial<AuthUser>) => void;
}

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function clearRefreshTimer() {
    if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
    }
}

async function scheduleRefresh(
    expiresAt: number,
    refreshFn: () => Promise<void>,
) {
    clearRefreshTimer();
    const delay = Math.max(
        0,
        expiresAt * 1000 - Date.now() - REFRESH_MARGIN_MS,
    );
    refreshTimer = setTimeout(async () => {
        try {
            await refreshFn();
        } catch {
            const state = useAuthStore.getState();
            const now = Date.now();
            const fallbackDelay = Math.max(60000, now - REFRESH_MARGIN_MS);
            if (state.refreshToken) {
                refreshTimer = setTimeout(
                    () => refreshFn().catch(() => {}),
                    fallbackDelay,
                );
            }
        }
    }, delay);
}

async function performRefresh(
    get: () => AuthState,
    set: (partial: Partial<AuthState>) => void,
) {
    const state = get();
    if (!state.refreshToken) throw new Error("No refresh token");
    const response = await authApi.refreshToken(state.refreshToken);
    await Promise.all([
        storage.setAccessToken(response.access_token),
        storage.setRefreshToken(response.refresh_token),
        storage.setUser(response.user),
        storage.setTokenExpiresAt(response.expires_at),
    ]);
    set({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        user: response.user,
    });
    if (response.expires_at) {
        scheduleRefresh(response.expires_at, () => performRefresh(get, set));
    }
}

export const useAuthStore = create<AuthState>((set, get) => ({
    accessToken: null,
    refreshToken: null,
    user: null,
    cfClearance: null,
    cfBm: null,
    isAuthenticated: false,
    isLoading: true,
    turnstileToken: null,

    initialize: async () => {
        try {
            const [
                accessToken,
                refreshToken,
                user,
                cfClearance,
                cfBm,
                expiresAt,
                ua,
            ] = await Promise.all([
                storage.getAccessToken(),
                storage.getRefreshToken(),
                storage.getUser<AuthUser>(),
                storage.getCfClearance(),
                storage.getCfBm(),
                storage.getTokenExpiresAt(),
                storage.getUserAgent(),
            ]);
            if (ua) setUserAgent(ua);
            if (accessToken && user) {
                set({
                    accessToken,
                    refreshToken,
                    user,
                    cfClearance,
                    cfBm,
                    isAuthenticated: true,
                    isLoading: false,
                });
                if (expiresAt) {
                    const now = Date.now();
                    if (expiresAt * 1000 <= now) {
                        try {
                            await performRefresh(get, set);
                        } catch {
                            await storage.clearAll();
                            set({ isLoading: false });
                            return;
                        }
                    } else if (refreshToken) {
                        scheduleRefresh(expiresAt, () =>
                            performRefresh(get, set),
                        );
                    }
                } else if (refreshToken) {
                    performRefresh(get, set).catch(() => {});
                }
            } else {
                set({ isLoading: false });
            }
        } catch {
            set({ isLoading: false });
        }
    },

    login: async (email, password, captchaToken) => {
        try {
            const response = await authApi.login({
                email,
                password,
                gotrue_meta_security: { captcha_token: captchaToken },
            });
            await Promise.all([
                storage.setAccessToken(response.access_token),
                storage.setRefreshToken(response.refresh_token),
                storage.setUser(response.user),
                storage.setTokenExpiresAt(response.expires_at),
            ]);
            set({
                accessToken: response.access_token,
                refreshToken: response.refresh_token,
                user: response.user,
                isAuthenticated: true,
            });
            scheduleRefresh(response.expires_at, () =>
                performRefresh(get, set),
            );
        } catch (err: any) {
            throw err;
        }
    },

    register: async (email, password, captchaToken) => {
        const response = await authApi.register({
            email,
            password,
            gotrue_meta_security: { captcha_token: captchaToken },
        });
        await Promise.all([
            storage.setAccessToken(response.access_token),
            storage.setRefreshToken(response.refresh_token),
            storage.setUser(response.user),
            storage.setTokenExpiresAt(response.expires_at),
        ]);
        set({
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            user: response.user,
            isAuthenticated: true,
        });
        scheduleRefresh(response.expires_at, () => performRefresh(get, set));
    },

    logout: async () => {
        clearRefreshTimer();
        await storage.clearAll();
        set({
            accessToken: null,
            refreshToken: null,
            user: null,
            cfClearance: null,
            cfBm: null,
            isAuthenticated: false,
            turnstileToken: null,
        });
    },

    setCfClearance: (token) => {
        storage.setCfClearance(token);
        set({ cfClearance: token });
    },

    setCfBm: (token) => {
        storage.setCfBm(token);
        set({ cfBm: token });
    },

    setTurnstileToken: (token) => {
        set({ turnstileToken: token });
    },

    updateProfile: (user) => {
        const current = get().user;
        if (current) {
            const updated = { ...current, ...user };
            storage.setUser(updated);
            set({ user: updated });
        }
    },
}));
