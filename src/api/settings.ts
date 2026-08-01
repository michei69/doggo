import { apiClient } from "./client";
import type {
    ApiSettingsResponse,
    ApiSettingsSettings,
    ApiProxyConfig,
    PromptLibraryItem,
} from "../types/api";

export async function getApiSettings(): Promise<ApiSettingsResponse> {
    const response = await apiClient.get<ApiSettingsResponse>("/api-settings");
    return response.data;
}

export async function updateApiSettings(
    patch: Partial<ApiSettingsSettings>,
): Promise<Omit<ApiSettingsResponse, "prompts">> {
    const response = await apiClient.patch<Omit<ApiSettingsResponse, "prompts">>(
        "/api-settings",
        patch,
    );
    return response.data;
}

export async function createProxyConfig(data: {
    api_key: string;
    api_url: string;
    client_id: string;
    model: string;
    name: string;
    prompt_id: string | null;
}): Promise<ApiProxyConfig> {
    const response = await apiClient.post<ApiProxyConfig>(
        "/api-settings/proxy-configs",
        data,
    );
    return response.data;
}

export async function updateProxyConfig(
    id: string,
    data: {
        api_key: string;
        api_url: string;
        model: string;
        name: string;
        prompt_id: string | null;
    },
): Promise<ApiProxyConfig> {
    const response = await apiClient.patch<ApiProxyConfig>(
        `/api-settings/proxy-configs/${id}`,
        data,
    );
    return response.data;
}

export async function deleteProxyConfig(id: string): Promise<void> {
    await apiClient.delete(`/api-settings/proxy-configs/${id}`);
}

export async function createPrompt(data: {
    content: string;
    kind: "system";
    name: string;
}): Promise<PromptLibraryItem> {
    const response = await apiClient.post<PromptLibraryItem>(
        "/prompt-library",
        data,
    );
    return response.data;
}

export async function updatePrompt(
    id: string,
    data: { content: string; name: string },
): Promise<PromptLibraryItem> {
    const response = await apiClient.patch<PromptLibraryItem>(
        `/prompt-library/${id}`,
        data,
    );
    return response.data;
}

export async function deletePrompt(id: string): Promise<{
    cleared_live_slot: boolean;
    cleared_preset_ids: unknown[];
    deleted: boolean;
}> {
    const response = await apiClient.delete<{
        cleared_live_slot: boolean;
        cleared_preset_ids: unknown[];
        deleted: boolean;
    }>(`/prompt-library/${id}`);
    return response.data;
}
