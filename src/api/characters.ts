import { apiClient } from "./client";
import type {
    TrendingResponse,
    CharacterTag,
    CharacterDetail,
    CreateCharacterRequest,
    CharacterResponse,
} from "../types/api";

export interface CharacterSearchParams {
    page?: number;
    special_mode?: string;
    sort?: string;
    mode?: string;
    search?: string;
    messages?: number;
    messages_mode?: string;
    tokens?: number;
    tokens_mode?: string;
    is_proxy_enabled?: boolean;
    tag_id?: string[];
    custom_tags?: string[];
    user_id?: string[];
}

export async function getCharacters(
    params: CharacterSearchParams = {},
): Promise<TrendingResponse> {
    const filteredParams: Record<string, string | number | boolean | string[]> =
        {};
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "" && value !== null) {
            filteredParams[key] = value;
        }
    }
    const response = await apiClient.get<TrendingResponse>("/characters", {
        params: filteredParams,
    });
    return response.data;
}

export async function getTrendingCharacters(
    page: number = 1,
): Promise<TrendingResponse> {
    return getCharacters({ page, special_mode: "trending24", mode: "all" });
}

export async function getTags(): Promise<CharacterTag[]> {
    const response = await apiClient.get<CharacterTag[]>("/tags");
    return response.data;
}

export async function getCharacterDetail(
    characterId: string,
): Promise<CharacterDetail> {
    const response = await apiClient.get<CharacterDetail>(
        `/characters/${characterId}`,
    );
    return response.data;
}

export async function createCharacter(
    data: CreateCharacterRequest,
): Promise<CharacterResponse> {
    const response = await apiClient.post<CharacterResponse>(
        "/characters",
        data,
    );
    return response.data;
}

export async function updateCharacter(
    characterId: string,
    data: Partial<CreateCharacterRequest>,
): Promise<CharacterResponse> {
    const response = await apiClient.patch<CharacterResponse>(
        `/characters/${characterId}`,
        data,
    );
    return response.data;
}

export async function deleteCharacter(characterId: string): Promise<void> {
    await apiClient.delete(`/characters/${characterId}`);
}

export interface CharacterSettingsPatch {
    showdefinition?: boolean;
    allow_proxy?: boolean;
    allow_published_chats?: boolean;
}

export async function patchCharacterSettings(
    characterId: string,
    data: CharacterSettingsPatch,
): Promise<CharacterDetail> {
    const response = await apiClient.patch<CharacterDetail>(
        `/characters/${characterId}`,
        data,
    );
    return response.data;
}

export interface MyCharactersParams {
    page?: number;
    is_public?: boolean;
}

export interface TagSuggestionsResponse {
    suggestions: string[];
}

export async function getTagSuggestions(
    prefix: string,
): Promise<TagSuggestionsResponse> {
    const response = await apiClient.get<TagSuggestionsResponse>(
        "/characters/tags/suggest",
        { params: { prefix } },
    );
    return response.data;
}

export async function checkFavorite(
    characterId: string,
): Promise<boolean> {
    const response = await apiClient.get<boolean>(
        `/favorites/myfavorites/${characterId}`,
    );
    return response.data;
}

export async function favoriteCharacter(
    characterId: string,
): Promise<void> {
    await apiClient.post("/favorites/favorite", { characterId });
}

export async function unfavoriteCharacter(
    characterId: string,
): Promise<void> {
    await apiClient.post("/favorites/unfavorite", { characterId });
}

export async function getMyCharacters(
    params: MyCharactersParams = {},
): Promise<TrendingResponse> {
    const queryParams: Record<string, string | number> = {
        page: params.page ?? 1,
        privacyFilter: "all",
        search: "",
        sort: "latest",
    };
    if (params.is_public !== undefined) {
        queryParams.is_public = String(params.is_public);
    }
    const response = await apiClient.get<TrendingResponse>(
        "/characters/v2/mine",
        { params: queryParams },
    );
    return response.data;
}
