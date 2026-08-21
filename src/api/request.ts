import { apiClient } from "./client";
import type { AxiosRequestConfig } from "axios";

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.request<T>(config);
    return response.data;
}

export function cleanParams<T extends object>(params: T): Partial<T> {
    const cleaned: Partial<T> = {};
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") {
            Object.assign(cleaned, { [key]: value });
        }
    }
    return cleaned;
}
