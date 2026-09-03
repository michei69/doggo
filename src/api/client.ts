import axios from "axios";
import { API_BASE_URL } from "../utils/constants";
import { buildAuthHeaders } from "../utils/authHeaders";

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
    timeout: 30000,
});

apiClient.interceptors.request.use(async (config) => {
    const authHeaders = await buildAuthHeaders();
    Object.assign(config.headers, authHeaders);
    return config;
});

apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const headers = error.response?.headers || {};
        const contentType = headers["content-type"] || "";

        if (
            error.response?.status === 403 &&
            typeof error.response.data === "string" &&
            contentType.includes("text/html")
        ) {
            (error as any).challengeHtml = error.response.data;
            (error as any).needsCloudflareChallenge = true;
        }

        return Promise.reject(error);
    },
);
