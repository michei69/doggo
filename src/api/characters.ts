import { cleanParams, request } from "./request";
import type {
    TrendingResponse,
    CharacterTag,
    CharacterDetail,
    CreateCharacterRequest,
    CharacterResponse,
    CharacterSearchParams,
    CharacterSettingsPatch,
    MyCharactersParams,
    TagSuggestionsResponse,
    FavoriteCountResponse,
    ProfileSearchResponse,
} from "../types/api";

export async function getCharacters(
    params: CharacterSearchParams = {},
): Promise<TrendingResponse> {
    return request<TrendingResponse>({
        method: "GET",
        url: "/characters",
        params: cleanParams(params),
    });
}

export async function getTags(): Promise<CharacterTag[]> {
    return request<CharacterTag[]>({ method: "GET", url: "/tags" });
}

export async function getCharacterDetail(
    characterId: string,
): Promise<CharacterDetail> {
    return request<CharacterDetail>({
        method: "GET",
        url: `/characters/${characterId}`,
    });
}

export async function createCharacter(
    data: CreateCharacterRequest,
): Promise<CharacterResponse> {
    return request<CharacterResponse>({
        method: "POST",
        url: "/characters",
        data,
    });
}

export async function updateCharacter(
    characterId: string,
    data: Partial<CreateCharacterRequest>,
): Promise<CharacterResponse> {
    return request<CharacterResponse>({
        method: "PATCH",
        url: `/characters/${characterId}`,
        data,
    });
}

export async function deleteCharacter(characterId: string): Promise<void> {
    await request<void>({
        method: "DELETE",
        url: `/characters/${characterId}`,
    });
}

export async function patchCharacterSettings(
    characterId: string,
    data: CharacterSettingsPatch,
): Promise<CharacterDetail> {
    return request<CharacterDetail>({
        method: "PATCH",
        url: `/characters/${characterId}`,
        data,
    });
}

export async function getTagSuggestions(
    prefix: string,
): Promise<TagSuggestionsResponse> {
    return request<TagSuggestionsResponse>({
        method: "GET",
        url: "/characters/tags/suggest",
        params: cleanParams({ prefix }),
    });
}

export async function checkFavorite(characterId: string): Promise<boolean> {
    return request<boolean>({
        method: "GET",
        url: `/favorites/myfavorites/${characterId}`,
    });
}

export async function favoriteCharacter(characterId: string): Promise<void> {
    await request<void>({
        method: "POST",
        url: "/favorites/favorite",
        data: { characterId },
    });
}

export async function unfavoriteCharacter(characterId: string): Promise<void> {
    await request<void>({
        method: "POST",
        url: "/favorites/unfavorite",
        data: { characterId },
    });
}

export async function getFavoriteCount(
    characterId: string,
): Promise<FavoriteCountResponse> {
    return request<FavoriteCountResponse>({
        method: "GET",
        url: `/favorites/character/${characterId}/count`,
    });
}

export async function searchProfiles(
    params: { page?: number; mode?: string } = {},
): Promise<ProfileSearchResponse> {
    return request<ProfileSearchResponse>({
        method: "GET",
        url: "/profiles/search",
        params: cleanParams(params),
    });
}

interface MyCharactersQueryParams {
    page: number;
    privacyFilter: string;
    search: string;
    sort: string;
    is_public?: string;
}

export async function getMyCharacters(
    params: MyCharactersParams = {},
): Promise<TrendingResponse> {
    const queryParams: MyCharactersQueryParams = {
        page: params.page ?? 1,
        privacyFilter: "all",
        search: "",
        sort: "latest",
    };
    if (params.is_public !== undefined) {
        queryParams.is_public = String(params.is_public);
    }
    return request<TrendingResponse>({
        method: "GET",
        url: "/characters/v2/mine",
        params: queryParams,
    });
}
