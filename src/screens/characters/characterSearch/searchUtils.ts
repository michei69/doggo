import type {
    CompositeNavigationProp,
    RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { CharacterSearchParams } from "../../../api/characters";
import type { TagEntry } from "../../../components/discover/TagsModal";
import type {
    CharactersStackParamList,
    MainTabParamList,
    SwipeDiscoverParams,
} from "../../../navigation/types";
import type { TrendingCharacter } from "../../../types/api";
import {
    INITIAL_FILTERS,
    type FilterState,
} from "../../../utils/discover";

export type Nav = NativeStackNavigationProp<
    CharactersStackParamList,
    "CharacterSearch"
>;

export type SwipeNav = CompositeNavigationProp<
    NativeStackNavigationProp<CharactersStackParamList, "SwipeDiscover">,
    BottomTabNavigationProp<MainTabParamList>
>;

export type SearchRoute = RouteProp<CharactersStackParamList, "CharacterSearch">;

export interface DiscoverParamsLike {
    search?: string;
    tag_id?: string;
    custom_tags?: string;
    mode?: string;
    sort?: string;
    messages?: string;
    messages_mode?: string;
    tokens?: string;
    tokens_mode?: string;
    proxyenabled?: string;
    tag?: string;
}

export interface ListState {
    characters: TrendingCharacter[];
    page: number;
    loading: boolean;
    refreshing: boolean;
    total: number;
    error: string | null;
}

export type ListAction =
    | { type: "LOADING" }
    | { type: "REFRESHING" }
    | {
          type: "LOADED";
          payload: { data: TrendingCharacter[]; total: number; page: number };
      }
    | { type: "ERROR"; payload: string }
    | { type: "RESET" };

export function listReducer(state: ListState, action: ListAction): ListState {
    switch (action.type) {
        case "LOADING":
            return { ...state, loading: true, error: null };
        case "REFRESHING":
            return { ...state, refreshing: true, error: null };
        case "LOADED": {
            const { data, total, page } = action.payload;
            const existingIds = new Set(state.characters.map((c) => c.id));
            return {
                ...state,
                characters:
                    page === 1
                        ? data
                        : [...state.characters, ...data.filter((d) => !existingIds.has(d.id))],
                total,
                page,
                loading: false,
                refreshing: false,
                error: null,
            };
        }
        case "ERROR":
            return {
                ...state,
                loading: false,
                refreshing: false,
                error: action.payload,
            };
        case "RESET":
            return { ...state, characters: [], page: 1, loading: true, error: null };
        default:
            return state;
    }
}

export function buildParams(
    sortMode: string,
    searchText: string,
    selectedTagIds: Set<string>,
    filters: FilterState,
    page: number,
): CharacterSearchParams {
    const params: CharacterSearchParams = { page };

    params.sort = sortMode;

    if (searchText.trim()) {
        params.search = searchText.trim();
    }

    if (filters.messages && Number(filters.messages) > 0) {
        params.messages = Number(filters.messages);
        params.messages_mode = filters.messagesMode;
    }

    if (filters.tokens && Number(filters.tokens) > 0) {
        params.tokens = Number(filters.tokens);
        params.tokens_mode = filters.tokensMode;
    }

    if (filters.proxyOnly) {
        params.is_proxy_enabled = true;
    }

    params.mode = filters.limitlessMode ? "all" : "sfw";

    if (selectedTagIds.size > 0) {
        const normalIds: string[] = [];
        const customSlugs: string[] = [];
        for (const id of selectedTagIds) {
            if (id.startsWith("top_")) {
                customSlugs.push(id.slice(4));
            } else {
                normalIds.push(id);
            }
        }
        if (normalIds.length > 0) {
            params.tag_id = normalIds;
        }
        if (customSlugs.length > 0) {
            params.custom_tags = customSlugs;
        }
    }

    return params;
}

export function mergeTags(
    topCustomTags: TagEntry[],
    allTags: TagEntry[],
): TagEntry[] {
    const seen = new Set<string>();
    const result: TagEntry[] = [];
    for (const t of topCustomTags) {
        if (!seen.has(t.slug)) {
            seen.add(t.slug);
            result.push(t);
        }
    }
    for (const t of allTags) {
        if (!seen.has(t.slug)) {
            seen.add(t.slug);
            result.push(t);
        }
    }
    return result;
}

export function filterDisplayCharacters(
    characters: TrendingCharacter[],
    advancedKeywords: string[],
    advancedBlacklist: string[],
    keywordMatchMode: "any" | "all",
    hideDarkened: boolean,
    hiddenIds: Set<string>,
): TrendingCharacter[] {
    let result = characters;
    if (advancedKeywords.length > 0) {
        result = result.filter((c) => {
            const text =
                `${c.name} ${c.description || ""} ${(c.tags || []).map((t) => t.name).join(" ")} ${(c.custom_tags || []).join(" ")}`.toLowerCase();
            if (keywordMatchMode === "all") {
                return advancedKeywords.every((kw) =>
                    text.includes(kw.toLowerCase()),
                );
            }
            return advancedKeywords.some((kw) => text.includes(kw.toLowerCase()));
        });
    }
    if (advancedBlacklist.length > 0) {
        result = result.filter((c) => {
            const text =
                `${c.name} ${c.description || ""} ${(c.tags || []).map((t) => t.name).join(" ")} ${(c.custom_tags || []).join(" ")}`.toLowerCase();
            return !advancedBlacklist.some((kw) => text.includes(kw.toLowerCase()));
        });
    }
    if (hideDarkened) {
        result = result.filter((c) => !hiddenIds.has(c.id));
    }
    return result;
}

export function hasFilterOverrides(p?: DiscoverParamsLike): boolean {
    if (!p) return false;
    return (
        p.messages !== undefined ||
        p.messages_mode === "lte" ||
        p.messages_mode === "gte" ||
        p.tokens !== undefined ||
        p.tokens_mode === "lte" ||
        p.tokens_mode === "gte" ||
        p.mode === "sfw" ||
        p.mode === "all" ||
        p.proxyenabled === "true"
    );
}

export function initialTagsFromParams(
    p?: DiscoverParamsLike,
): Set<string> {
    const tags = new Set<string>();
    if (!p) return tags;
    if (p.tag) {
        tags.add(`top_${p.tag}`);
    }
    if (p.tag_id) {
        for (const id of p.tag_id.split(",").flatMap((s) => {
            const trimmed = s.trim();
            return trimmed ? [trimmed] : [];
        })) {
            tags.add(id);
        }
    }
    if (p.custom_tags) {
        for (const slug of p.custom_tags.split(",").flatMap((s) => {
            const trimmed = s.trim();
            return trimmed ? [trimmed] : [];
        })) {
            tags.add(`top_${slug}`);
        }
    }
    return tags;
}

export function initialFiltersFromParams(
    p?: DiscoverParamsLike,
): FilterState {
    if (!p) return INITIAL_FILTERS;
    const f = { ...INITIAL_FILTERS };
    if (p.messages !== undefined) f.messages = p.messages;
    if (p.messages_mode === "lte" || p.messages_mode === "gte") {
        f.messagesMode = p.messages_mode;
    }
    if (p.tokens !== undefined) f.tokens = p.tokens;
    if (p.tokens_mode === "lte" || p.tokens_mode === "gte") {
        f.tokensMode = p.tokens_mode;
    }
    if (p.mode === "sfw") {
        f.limitlessMode = false;
    } else if (p.mode === "all") {
        f.limitlessMode = true;
    }
    if (p.proxyenabled === "true") {
        f.proxyOnly = true;
    }
    return f;
}

export interface SwipeParamsInput {
    sort: string;
    search: string;
    tags: Set<string>;
    filters: FilterState;
    advancedKeywords: string[];
    advancedBlacklist: string[];
    keywordMatchMode: "any" | "all";
}

export function buildSwipeParams(input: SwipeParamsInput): SwipeDiscoverParams {
    const p: SwipeDiscoverParams = { sort: input.sort };
    if (input.search.trim()) {
        p.search = input.search.trim();
    }
    if (input.filters.messages && Number(input.filters.messages) > 0) {
        p.messages = String(input.filters.messages);
        p.messages_mode = input.filters.messagesMode;
    }
    if (input.filters.tokens && Number(input.filters.tokens) > 0) {
        p.tokens = String(input.filters.tokens);
        p.tokens_mode = input.filters.tokensMode;
    }
    if (input.filters.proxyOnly) {
        p.proxyenabled = "true";
    }
    p.mode = input.filters.limitlessMode ? "all" : "sfw";
    if (input.tags.size > 0) {
        const normalIds: string[] = [];
        const customSlugs: string[] = [];
        for (const id of input.tags) {
            if (id.startsWith("top_")) {
                customSlugs.push(id.slice(4));
            } else {
                normalIds.push(id);
            }
        }
        if (normalIds.length > 0) {
            p.tag_id = normalIds.join(",");
        }
        if (customSlugs.length > 0) {
            p.custom_tags = customSlugs.join(",");
        }
    }
    if (input.advancedKeywords.length > 0) {
        p.advancedKeywords = input.advancedKeywords.join("\n");
    }
    if (input.advancedBlacklist.length > 0) {
        p.advancedBlacklist = input.advancedBlacklist.join("\n");
    }
    p.keywordMatchMode = input.keywordMatchMode;
    return p;
}

export function parseSwipeParams(p?: SwipeDiscoverParams): {
    filters: FilterState;
    tags: Set<string>;
    search: string;
    sort: string;
    advancedKeywords: string[];
    advancedBlacklist: string[];
    keywordMatchMode: "any" | "all";
} {
    return {
        filters: initialFiltersFromParams(p),
        tags: initialTagsFromParams(p),
        search: p?.search ?? "",
        sort: p?.sort ?? "trending24",
        advancedKeywords: p?.advancedKeywords
            ? p.advancedKeywords.split("\n").filter(Boolean)
            : [],
        advancedBlacklist: p?.advancedBlacklist
            ? p.advancedBlacklist.split("\n").filter(Boolean)
            : [],
        keywordMatchMode: p?.keywordMatchMode ?? "any",
    };
}
