import type {
    CompositeNavigationProp,
    RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { CharacterSearchParams } from "../../../types/api";
import type {
    CharactersStackParamList,
    DiscoverParamsLike,
    MainTabParamList,
    SwipeDiscoverParams,
} from "../../../navigation/types";
import type {
    CharacterTag,
    TagEntry,
    TrendingCharacter,
} from "../../../types/api";
import { INITIAL_FILTERS, type FilterState } from "../../../utils/discover";

export type Nav = NativeStackNavigationProp<
    CharactersStackParamList,
    "CharacterSearch"
>;

export type SwipeNav = CompositeNavigationProp<
    NativeStackNavigationProp<CharactersStackParamList, "SwipeDiscover">,
    BottomTabNavigationProp<MainTabParamList>
>;

export type SearchRoute = RouteProp<
    CharactersStackParamList,
    "CharacterSearch"
>;

export type DiscoveryMode = "characters" | "creators";

interface ListState<T> {
    characters: T[];
    page: number;
    loading: boolean;
    refreshing: boolean;
    total: number;
    error: string | null;
}

export interface LoadedPayload<T> {
    data: T[];
    total: number;
    page: number;
    dedupe?: boolean;
}

type ListAction<T> =
    | { type: "LOADING" }
    | { type: "REFRESHING" }
    | { type: "LOADED"; payload: LoadedPayload<T> }
    | { type: "ERROR"; payload: string }
    | { type: "RESET" };

export function genericListReducer<T extends { id: string }>(
    state: ListState<T>,
    action: ListAction<T>,
): ListState<T> {
    switch (action.type) {
        case "LOADING":
            return { ...state, loading: true, error: null };
        case "REFRESHING":
            return { ...state, refreshing: true, error: null };
        case "LOADED": {
            const { data, total, page, dedupe = true } = action.payload;
            const existingIds = new Set(state.characters.map((c) => c.id));
            return {
                ...state,
                characters:
                    page === 1
                        ? data
                        : dedupe
                          ? [
                                ...state.characters,
                                ...data.filter((d) => !existingIds.has(d.id)),
                            ]
                          : [...state.characters, ...data],
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
            return {
                ...state,
                characters: [],
                page: 1,
                loading: true,
                error: null,
            };
        default:
            return state;
    }
}

export function tagsToTagEntries(tags: CharacterTag[]): TagEntry[] {
    return tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug }));
}

function splitTagIds(tags: Set<string>) {
    const normalIds: string[] = [];
    const customSlugs: string[] = [];
    for (const id of tags) {
        if (id.startsWith("top_")) {
            customSlugs.push(id.slice(4));
        } else {
            normalIds.push(id);
        }
    }
    return { normalIds, customSlugs };
}

function messagesFilterParams(filters: FilterState): {
    messages: number;
    messages_mode: FilterState["messagesMode"];
} | null {
    if (filters.messages && Number(filters.messages) > 0) {
        return {
            messages: Number(filters.messages),
            messages_mode: filters.messagesMode,
        };
    }
    return null;
}

function tokensFilterParams(filters: FilterState): {
    tokens: number;
    tokens_mode: FilterState["tokensMode"];
} | null {
    if (filters.tokens && Number(filters.tokens) > 0) {
        return {
            tokens: Number(filters.tokens),
            tokens_mode: filters.tokensMode,
        };
    }
    return null;
}

function splitCommaList(value: string): string[] {
    return value.split(",").flatMap((s) => {
        const trimmed = s.trim();
        return trimmed ? [trimmed] : [];
    });
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

    const messages = messagesFilterParams(filters);
    if (messages) {
        params.messages = messages.messages;
        params.messages_mode = messages.messages_mode;
    }

    const tokens = tokensFilterParams(filters);
    if (tokens) {
        params.tokens = tokens.tokens;
        params.tokens_mode = tokens.tokens_mode;
    }

    if (filters.proxyOnly) {
        params.is_proxy_enabled = true;
    }

    params.mode = filters.limitlessMode ? "all" : "sfw";

    if (selectedTagIds.size > 0) {
        const { normalIds, customSlugs } = splitTagIds(selectedTagIds);
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
    const searchText = (c: TrendingCharacter) =>
        `${c.name} ${c.description || ""} ${(c.tags || []).map((t) => t.name).join(" ")} ${(c.custom_tags || []).join(" ")}`.toLowerCase();
    let result = characters;
    if (advancedKeywords.length > 0 || advancedBlacklist.length > 0) {
        result = result.filter((c) => {
            const text = searchText(c);
            if (advancedKeywords.length > 0) {
                const matches =
                    keywordMatchMode === "all"
                        ? advancedKeywords.every((kw) =>
                              text.includes(kw.toLowerCase()),
                          )
                        : advancedKeywords.some((kw) =>
                              text.includes(kw.toLowerCase()),
                          );
                if (!matches) return false;
            }
            return !advancedBlacklist.some((kw) =>
                text.includes(kw.toLowerCase()),
            );
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

export function initialTagsFromParams(p?: DiscoverParamsLike): Set<string> {
    const tags = new Set<string>();
    if (!p) return tags;
    if (p.tag) {
        tags.add(`top_${p.tag}`);
    }
    if (p.tag_id) {
        for (const id of splitCommaList(p.tag_id)) {
            tags.add(id);
        }
    }
    if (p.custom_tags) {
        for (const slug of splitCommaList(p.custom_tags)) {
            tags.add(`top_${slug}`);
        }
    }
    return tags;
}

export function initialFiltersFromParams(p?: DiscoverParamsLike): FilterState {
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

interface SwipeParamsInput {
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
    const messages = messagesFilterParams(input.filters);
    if (messages) {
        p.messages = String(messages.messages);
        p.messages_mode = messages.messages_mode;
    }
    const tokens = tokensFilterParams(input.filters);
    if (tokens) {
        p.tokens = String(tokens.tokens);
        p.tokens_mode = tokens.tokens_mode;
    }
    if (input.filters.proxyOnly) {
        p.proxyenabled = "true";
    }
    p.mode = input.filters.limitlessMode ? "all" : "sfw";
    if (input.tags.size > 0) {
        const { normalIds, customSlugs } = splitTagIds(input.tags);
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

export function parseSwipeParams(p?: SwipeDiscoverParams) {
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
