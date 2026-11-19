import axios from "axios";
import {
    enableFallback,
    getApiBaseUrl,
    isNetworkFailure,
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
        if (isNetworkFailure(error)) {
            enableFallback();
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
