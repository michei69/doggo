import { create } from "zustand";

const PRIMARY_HOST = "janitorai.com";
const FALLBACK_HOST = "jani.com";

interface FallbackState {
    useFallback: boolean;
    enableFallback: () => void;
}

// Deliberately in-memory only: never persist this flag. A fresh app launch
// resets it to false so janitorai.com is always tried again first.
export const useFallbackStore = create<FallbackState>((set, get) => ({
    useFallback: false,
    enableFallback: () => {
        if (get().useFallback) return;
        set({ useFallback: true });
    },
}));

export function isUsingFallback(): boolean {
    return useFallbackStore.getState().useFallback;
}

function currentHost(): string {
    return isUsingFallback() ? FALLBACK_HOST : PRIMARY_HOST;
}

export function getSiteUrl(): string {
    return `https://${currentHost()}`;
}

export function getApiBaseUrl(): string {
    return `${getSiteUrl()}/hampter`;
}

export function getAuthBaseUrl(): string {
    return `https://auth.${currentHost()}`;
}

export function getGenerateAlphaUrl(): string {
    return `${getSiteUrl()}/generateAlpha`;
}

export function getGenerateAlphaCancelUrl(): string {
    return `${getSiteUrl()}/generateAlpha/cancel`;
}

export function getEllaBase(): string {
    return `https://ella.${currentHost()}`;
}

function isHost(hostname: string, host: string): boolean {
    return hostname === host || hostname.endsWith(`.${host}`);
}

export function isJanitorHost(hostname: string): boolean {
    return isHost(hostname, PRIMARY_HOST) || isHost(hostname, FALLBACK_HOST);
}

export function isJanitorUrl(url: string): boolean {
    try {
        return isJanitorHost(new URL(url).hostname);
    } catch {
        return false;
    }
}

/**
 * A failure with no HTTP response at all (DNS failure, connection refused,
 * timeout, etc.). Any real status code (2xx/3xx/4xx/5xx) means the host was
 * reachable, so only a missing response should trigger the fallback.
 */
export function isNetworkFailure(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const err = error as { response?: { status?: number }; code?: string };
    if (err.response && err.response.status !== 0) return false;
    if (err.code === "ERR_CANCELED") return false;
    return true;
}
