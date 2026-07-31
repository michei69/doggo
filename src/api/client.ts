import axios from "axios";
import { API_BASE_URL } from "../utils/constants";
import { storage } from "../utils/storage";
import { getUserAgent } from "../utils/userAgent";

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
    timeout: 30000,
});

apiClient.interceptors.request.use(async (config) => {
    const [token, cfClearance, cfBm] = await Promise.all([
        storage.getAccessToken(),
        storage.getCfClearance(),
        storage.getCfBm(),
    ]);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    const cookies: string[] = [];
    if (cfClearance) cookies.push(`cf_clearance=${cfClearance}`);
    if (cfBm) cookies.push(`__cf_bm=${cfBm}`);
    if (cookies.length > 0) {
        config.headers.Cookie = cookies.join("; ");
    }
    const ua = getUserAgent();
    if (ua) {
        config.headers["User-Agent"] = ua;
    }
    console.log(
        "[API] REQ",
        config.method?.toUpperCase(),
        config.url?.replace(API_BASE_URL, ""),
        config.params,
        {
            hasAuth: !!token,
            hasCfClearance: !!cfClearance,
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
