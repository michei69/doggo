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
    console.log(
        "[API] REQ",
        config.method?.toUpperCase(),
        config.url?.replace(API_BASE_URL, ""),
        config.params,
        {
            hasAuth: !!authHeaders.Authorization,
            hasCfClearance: authHeaders.Cookie?.includes("cf_clearance") ?? false,
        },
    );
    return config;
});

apiClient.interceptors.response.use(
    (response) => {
        console.log(
            "[API] RES",
            response.status,
            response.config.url?.replace(API_BASE_URL, ""),
        );
        return response;
    },
    async (error) => {
        const url = error.config?.url?.replace(API_BASE_URL, "") || "unknown";
        const status = error.response?.status || "network";
        const headers = error.response?.headers || {};
        const contentType = headers["content-type"] || "";

        console.log(
            "[API] ERR",
            status,
            url,
            {
                "content-type": contentType,
                "cf-mitigated": headers["cf-mitigated"],
            },
            error.response.data,
        );

        if (
            error.response?.status === 403 &&
            typeof error.response.data === "string" &&
            contentType.includes("text/html")
        ) {
            console.log(
                "[API] Cloudflare challenge detected, HTML length:",
                error.response.data.length,
            );
            (error as any).challengeHtml = error.response.data;
            (error as any).needsCloudflareChallenge = true;
        }

        return Promise.reject(error);
    },
);
