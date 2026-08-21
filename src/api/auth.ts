import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import { AUTH_BASE_URL, SUPABASE_ANON_KEY } from "../utils/constants";
import type { LoginRequest, LoginResponse } from "../types/api";
import { getUserAgent } from "../utils/userAgent";

const authAxios = axios.create({
    baseURL: AUTH_BASE_URL,
    headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    timeout: 30000,
});

authAxios.interceptors.request.use((config) => {
    const ua = getUserAgent();
    if (ua) {
        config.headers["User-Agent"] = ua;
    }
    return config;
});

async function authRequest<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await authAxios.request<T>(config);
    return response.data;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
    const response = await authRequest<LoginResponse>({
        method: "POST",
        url: "/auth/v1/token?grant_type=password",
        data,
    });
    return response;
}

export async function register(data: LoginRequest): Promise<LoginResponse> {
    const response = await authRequest<LoginResponse>({
        method: "POST",
        url: "/auth/v1/token?grant_type=signup",
        data,
    });
    return response;
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
