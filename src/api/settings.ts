import { request } from "./request";
import type {
    ApiSettingsResponse,
    ApiSettingsSettings,
    ApiProxyConfig,
    PromptLibraryItem,
    CreateProxyConfigBody,
    UpdateProxyConfigBody,
    PromptBody,
    DeletePromptResponse,
} from "../types/api";

export async function getApiSettings(): Promise<ApiSettingsResponse> {
    return request<ApiSettingsResponse>({
        method: "GET",
        url: "/api-settings",
    });
}

export async function updateApiSettings(
    patch: Partial<ApiSettingsSettings>,
): Promise<Omit<ApiSettingsResponse, "prompts">> {
    return request<Omit<ApiSettingsResponse, "prompts">>({
        method: "PATCH",
        url: "/api-settings",
        data: patch,
    });
}

export async function createProxyConfig(
    data: CreateProxyConfigBody,
): Promise<ApiProxyConfig> {
    return request<ApiProxyConfig>({
        method: "POST",
        url: "/api-settings/proxy-configs",
        data,
    });
}

export async function updateProxyConfig(
    id: string,
    data: UpdateProxyConfigBody,
): Promise<ApiProxyConfig> {
    return request<ApiProxyConfig>({
        method: "PATCH",
        url: `/api-settings/proxy-configs/${id}`,
        data,
    });
}

export async function deleteProxyConfig(id: string): Promise<void> {
    await request<void>({
        method: "DELETE",
        url: `/api-settings/proxy-configs/${id}`,
    });
}

export async function createPrompt(
    data: PromptBody & { kind: "system" },
): Promise<PromptLibraryItem> {
    return request<PromptLibraryItem>({
        method: "POST",
        url: "/prompt-library",
        data,
    });
}

export async function updatePrompt(
    id: string,
    data: PromptBody,
): Promise<PromptLibraryItem> {
    return request<PromptLibraryItem>({
        method: "PATCH",
        url: `/prompt-library/${id}`,
        data,
    });
}

export async function deletePrompt(id: string): Promise<DeletePromptResponse> {
    return request<DeletePromptResponse>({
        method: "DELETE",
        url: `/prompt-library/${id}`,
    });
}
