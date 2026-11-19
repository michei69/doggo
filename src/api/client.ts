import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import {
    enableFallback,
    getApiBaseUrl,
    isNetworkFailure,
    isUsingFallback,
} from "../utils/baseUrl";
import { buildAuthHeaders } from "../utils/authHeaders";
import { isString } from "../utils/json";

export const apiClient = axios.create({
    baseURL: getApiBaseUrl(),
    headers: { "Content-Type": "application/json" },
    timeout: 30000,
});

apiClient.interceptors.request.use(async (config) => {
    config.baseURL = getApiBaseUrl();
    const authHeaders = await buildAuthHeaders();
    Object.assign(config.headers, authHeaders);
    return config;
});

apiClient.interceptors.response.use(
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
                return apiClient.request(config);
            }
        }

        const headers = error.response?.headers || {};
        const contentType = headers["content-type"] || "";

        if (
            error.response?.status === 403 &&
            isString(error.response.data) &&
            contentType.includes("text/html")
        ) {
            Object.assign(error, {
                challengeHtml: error.response.data,
                needsCloudflareChallenge: true,
            });
        }

        return Promise.reject(error);
    },
);
