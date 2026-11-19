import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import { SUPABASE_ANON_KEY } from "../utils/constants";
import {
    enableFallback,
    getAuthBaseUrl,
    isNetworkFailure,
    isUsingFallback,
} from "../utils/baseUrl";
import type { LoginRequest, LoginResponse } from "../types/api";
import { getUserAgent } from "../utils/userAgent";

const authAxios = axios.create({
    baseURL: getAuthBaseUrl(),
    headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    timeout: 30000,
});

authAxios.interceptors.request.use((config) => {
    config.baseURL = getAuthBaseUrl();
    const ua = getUserAgent();
    if (ua) {
        config.headers["User-Agent"] = ua;
    }
    return config;
});

authAxios.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        if (isNetworkFailure(error) && !isUsingFallback()) {
            enableFallback();
            const config = error.config as
                | (AxiosRequestConfig & { _fallbackRetried?: boolean })
                | undefined;
            if (config && !config._fallbackRetried) {
                config._fallbackRetried = true;
                return authAxios.request(config);
            }
        }
        return Promise.reject(error);
    },
);

async function authRequest<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await authAxios.request<T>(config);
    return response.data;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
    return authRequest<LoginResponse>({
        method: "POST",
        url: "/auth/v1/token?grant_type=password",
        data,
    });
}

export async function register(data: LoginRequest): Promise<LoginResponse> {
    return authRequest<LoginResponse>({
        method: "POST",
        url: "/auth/v1/token?grant_type=signup",
        data,
    });
}

export async function refreshToken(
    refreshTokenStr: string,
): Promise<LoginResponse> {
    return authRequest<LoginResponse>({
        method: "POST",
        url: "/auth/v1/token?grant_type=refresh_token",
        data: { refresh_token: refreshTokenStr },
    });
}
