import { create } from "zustand";

const PRIMARY_HOST = "janitorai.com";
const FALLBACK_HOST = "jani.com";
const FALLBACK_AUTH_URL = "https://mcmzxtzommpnxkynddbo.supabase.co";
const FALLBACK_ELLA_URL = "https://janitorsunite.b-cdn.net";

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

export function enableFallback(): void {
    useFallbackStore.getState().enableFallback();
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

// Auth is a Supabase backend, not part of the hampter API. It falls back to
// the project URL directly instead of a jani.com subdomain.
export function getAuthBaseUrl(): string {
    return isUsingFallback()
        ? FALLBACK_AUTH_URL
        : `https://auth.${PRIMARY_HOST}`;
}

export function getGenerateAlphaUrl(): string {
    return `${getSiteUrl()}/generateAlpha`;
}

export function getGenerateAlphaCancelUrl(): string {
    return `${getSiteUrl()}/generateAlpha/cancel`;
}

// Avatar/image CDN, not part of the hampter API.
export function getEllaBase(): string {
    return isUsingFallback()
        ? FALLBACK_ELLA_URL
        : `https://ella.${PRIMARY_HOST}`;
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

export function withFallbackHost(url: string): string {
    try {
        const parsed = new URL(url);
        if (isHost(parsed.hostname, PRIMARY_HOST)) {
            parsed.hostname = parsed.hostname.replace(
                PRIMARY_HOST,
                FALLBACK_HOST,
            );
        }
        return parsed.toString();
    } catch {
        return url;
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
