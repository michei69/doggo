import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { getCharacters, searchProfiles } from "../../../api/characters";
import type { ProfileSearchResult } from "../../../api/characters";
import { getBlockedContent, updateBlockedContent } from "../../../api/profile";
import CharacterCard from "../../../components/character/CharacterCard";
import type { AlertButton } from "../../../components/common/CustomAlert";
import type { TagEntry } from "../../../components/discover/TagsModal";
import type { TrendingCharacter, TrendingResponse } from "../../../types/api";
import {
    INITIAL_FILTERS,
    type FilterState,
} from "../../../utils/discover";
import { storage } from "../../../utils/storage";
import { CreatorCard } from "./cards";
import {
    buildParams,
    hasFilterOverrides,
    initialFiltersFromParams,
    initialTagsFromParams,
    listReducer,
    type Nav,
    type SearchRoute,
} from "./searchUtils";

export function useHiddenCharacters() {
    const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
    const hiddenLoadedRef = useRef(false);

    useEffect(() => {
        if (hiddenLoadedRef.current) return;
        hiddenLoadedRef.current = true;
        storage.getHiddenCharacters().then((ids) => {
            setHiddenIds(new Set(ids));
        });
    }, []);

    const handleToggleHidden = useCallback((characterId: string) => {
        setHiddenIds((prev) => {
            const next = new Set(prev);
            if (next.has(characterId)) {
                next.delete(characterId);
            } else {
                next.add(characterId);
            }
            return next;
        });
    }, []);

    useEffect(() => {
        storage.setHiddenCharacters([...hiddenIds]);
    }, [hiddenIds]);

    return { hiddenIds, handleToggleHidden };
}

export function useDiscoverState(params: SearchRoute["params"]) {
    const [filters, setFilters] = useState<FilterState>(() =>
        initialFiltersFromParams(params),
    );
    const [searchText, setSearchText] = useState(params?.search ?? "");
    const [sortMode, setSortMode] = useState(params?.sort ?? "trending24");
    const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(() =>
        initialTagsFromParams(params),
    );
    const firstRenderRef = useRef(true);

    // Storage-loaded filters never override deep link filter params.
    useEffect(() => {
        if (hasFilterOverrides(params)) return;
        let cancelled = false;
        const loadFilters = async () => {
            try {
                const saved = await storage.getDiscoverFilters<FilterState>();
                if (saved && !cancelled) {
                    setFilters(saved);
                }
            } catch {}
        };
        loadFilters();
        return () => {
            cancelled = true;
        };
    }, [params]);

    useEffect(() => {
        if (firstRenderRef.current) {
            firstRenderRef.current = false;
            return;
        }
        storage.setDiscoverFilters(filters);
    }, [filters]);

    const toggleTag = useCallback((tagId: string) => {
        setSelectedTagIds((prev) => {
            const next = new Set(prev);
            if (next.has(tagId)) {
                next.delete(tagId);
            } else {
                next.add(tagId);
            }
            return next;
        });
    }, []);

    return {
        filters,
        setFilters,
        searchText,
        setSearchText,
        sortMode,
        setSortMode,
        selectedTagIds,
        setSelectedTagIds,
        toggleTag,
    };
}

export function useAdvancedSearch() {
    const [advancedKeywords, setAdvancedKeywords] = useState<string[]>([]);
    const [advancedBlacklist, setAdvancedBlacklist] = useState<string[]>([]);
    const [keywordMatchMode, setKeywordMatchMode] = useState<"any" | "all">(
        "any",
    );
    const [advancedSearchVisible, setAdvancedSearchVisible] = useState(false);
    const [hideDarkened, setHideDarkened] = useState(false);

    return {
        advancedKeywords,
        setAdvancedKeywords,
        advancedBlacklist,
        setAdvancedBlacklist,
        keywordMatchMode,
        setKeywordMatchMode,
        advancedSearchVisible,
        setAdvancedSearchVisible,
        hideDarkened,
        setHideDarkened,
    };
}

export function useBlockAlert(
    showAlert: (title: string, message: string, buttons: AlertButton[]) => void,
    dismissAlert: () => void,
) {
    return useCallback(
        (character: TrendingCharacter) => {
            showAlert(
                "Block Character",
                `Block "${character.name}"? Hidden characters won't appear in your discover feed.`,
                [
                    {
                        text: "Block",
                        style: "destructive",
                        onPress: async () => {
                            dismissAlert();
                            try {
                                const blocked = await getBlockedContent();
                                if (!blocked.bots.includes(character.id)) {
                                    blocked.bots.push(character.id);
                                }
                                await updateBlockedContent(blocked);
                            } catch {}
                        },
                    },
                    {
                        text: "Cancel",
                        style: "cancel",
                        onPress: dismissAlert,
                    },
                ],
            );
        },
        [showAlert, dismissAlert],
    );
}

export function useCreators() {
    const [creators, setCreators] = useState<ProfileSearchResult[]>([]);
    const [creatorsTotal, setCreatorsTotal] = useState(0);
    const [creatorsLoading, setCreatorsLoading] = useState(false);
    const [creatorsRefreshing, setCreatorsRefreshing] = useState(false);
    const creatorsPageRef = useRef(1);
    const loadingMoreCreatorsRef = useRef(false);
    const creatorsEmptyPagesRef = useRef(0);
    const creatorsReachedEndRef = useRef(false);

    const doFetchCreators = useCallback(
        async (pageNum: number, isRefresh = false) => {
            if (pageNum === 1) {
                creatorsEmptyPagesRef.current = 0;
                creatorsReachedEndRef.current = false;
            }
            if (isRefresh) {
                setCreatorsRefreshing(true);
            } else if (pageNum === 1) {
                setCreators([]);
                setCreatorsLoading(true);
            } else {
                setCreatorsLoading(true);
            }

            try {
                const response = await searchProfiles({ page: pageNum, mode: "foryou" });
                if (pageNum === 1) {
                    setCreators(response.data);
                } else {
                    setCreators((prev) => [...prev, ...response.data]);
                }
                setCreatorsTotal(response.total);
                creatorsPageRef.current = pageNum;
                if (response.data.length === 0) {
                    creatorsEmptyPagesRef.current += 1;
                    if (creatorsEmptyPagesRef.current >= 3) {
                        creatorsReachedEndRef.current = true;
                    }
                } else {
                    creatorsEmptyPagesRef.current = 0;
                }
                setCreatorsLoading(false);
                setCreatorsRefreshing(false);
                loadingMoreCreatorsRef.current = false;
            } catch {
                setCreatorsLoading(false);
                setCreatorsRefreshing(false);
                loadingMoreCreatorsRef.current = false;
            }
        },
        [],
    );

    const handleLoadMoreCreators = useCallback(() => {
        if (loadingMoreCreatorsRef.current || creatorsReachedEndRef.current) return;
        if (!creatorsLoading && creators.length < creatorsTotal) {
            loadingMoreCreatorsRef.current = true;
            const nextPage = creatorsPageRef.current + 1;
            doFetchCreators(nextPage);
        }
    }, [creatorsLoading, creators.length, creatorsTotal, doFetchCreators]);

    return {
        creators,
        creatorsTotal,
        creatorsLoading,
        creatorsRefreshing,
        doFetchCreators,
        handleLoadMoreCreators,
    };
}

export function useLongPressActions(navigate: Nav["navigate"]) {
    const [longPressCharacter, setLongPressCharacter] =
        useState<TrendingCharacter | null>(null);
    const [actionsVisible, setActionsVisible] = useState(false);
    const [reportVisible, setReportVisible] = useState(false);

    const handleLongPress = useCallback((item: TrendingCharacter) => {
        setLongPressCharacter(item);
        setActionsVisible(true);
    }, []);

    const handleViewCharacter = useCallback(() => {
        if (!longPressCharacter) return;
        navigate("CharacterScreen", {
            characterId: longPressCharacter.id,
            characterName: longPressCharacter.name,
        });
    }, [longPressCharacter, navigate]);

    const handleViewCreator = useCallback(() => {
        if (!longPressCharacter?.creator_id) return;
        navigate("CreatorScreen", {
            userId: longPressCharacter.creator_id,
            userName: longPressCharacter.creator_name || "Creator",
        });
    }, [longPressCharacter, navigate]);

    const handleReportCharacter = useCallback(() => {
        setActionsVisible(false);
        setReportVisible(true);
    }, []);

    const handleCloseReport = useCallback(() => {
        setReportVisible(false);
    }, []);

    const handleActionsClose = useCallback(() => {
        setActionsVisible(false);
    }, []);

    return {
        longPressCharacter,
        actionsVisible,
        reportVisible,
        handleLongPress,
        handleViewCharacter,
        handleViewCreator,
        handleReportCharacter,
        handleCloseReport,
        handleActionsClose,
    };
}

export function useCharactersList() {
    const [state, dispatch] = useReducer(listReducer, {
        characters: [],
        page: 1,
        loading: true,
        refreshing: false,
        total: 0,
        error: null,
    });
    const [topCustomTags, setTopCustomTags] = useState<TagEntry[]>([]);
    const pageRef = useRef(1);
    const initialLoadRef = useRef(false);
    const loadingMoreRef = useRef(false);
    // Server `total` can overcount; 3 consecutive empty pages = real end.
    const emptyPagesRef = useRef(0);
    const reachedEndRef = useRef(false);

    const doFetch = useCallback(
        async (
            pageNum: number,
            current: {
                sort: string;
                search: string;
                tags: Set<string>;
                filters: FilterState;
            },
            isRefresh = false,
        ) => {
            if (pageNum === 1) {
                emptyPagesRef.current = 0;
                reachedEndRef.current = false;
            }
            if (isRefresh) {
                dispatch({ type: "REFRESHING" });
            } else if (pageNum === 1) {
                dispatch({ type: "RESET" });
            } else {
                dispatch({ type: "LOADING" });
            }

            try {
                const params = buildParams(
                    current.sort,
                    current.search,
                    current.tags,
                    current.filters,
                    pageNum,
                );
                const response: TrendingResponse = await getCharacters(params);
                let filteredData = response.data;
                if (current.filters.customAvatar) {
                    filteredData = filteredData.filter(
                        (c) =>
                            c.avatar !== "placeholder-nsfw.webp" &&
                            c.avatar !== "countdown.webp",
                    );
                }
                dispatch({
                    type: "LOADED",
                    payload: { data: filteredData, total: response.total, page: pageNum },
                });
                pageRef.current = pageNum;

                if (filteredData.length === 0) {
                    emptyPagesRef.current += 1;
                    if (emptyPagesRef.current >= 3) {
                        reachedEndRef.current = true;
                    }
                } else {
                    emptyPagesRef.current = 0;
                }

                if (response.top_custom_tags && response.top_custom_tags.length > 0) {
                    const custom: TagEntry[] = response.top_custom_tags.map((slug) => ({
                        id: `top_${slug}`,
                        name: slug,
                        slug,
                    }));
                    setTopCustomTags(custom);
                }

                loadingMoreRef.current = false;
            } catch (err: any) {
                loadingMoreRef.current = false;
                dispatch({ type: "ERROR", payload: err.message });
            }
        },
        [setTopCustomTags],
    );

    useEffect(() => {
        if (initialLoadRef.current) return;
        initialLoadRef.current = true;
        doFetch(1, { sort: "", search: "", tags: new Set(), filters: INITIAL_FILTERS });
    }, [doFetch]);

    const handleLoadMore = useCallback(
        (
            current: {
                sort: string;
                search: string;
                tags: Set<string>;
                filters: FilterState;
            },
        ) => {
            if (loadingMoreRef.current || reachedEndRef.current) return;
            if (!state.loading && state.characters.length < state.total) {
                loadingMoreRef.current = true;
                const nextPage = pageRef.current + 1;
                doFetch(nextPage, current);
            }
        },
        [state.loading, state.characters.length, state.total, doFetch],
    );

    return { state, doFetch, handleLoadMore, topCustomTags };
}

export function useCharacterCardRenderer(
    navigate: Nav["navigate"],
    isTablet: boolean,
    handleLongPress: (item: TrendingCharacter) => void,
    hiddenIds: Set<string>,
    handleToggleHidden: (characterId: string) => void,
) {
    return useCallback(
        ({ item }: { item: TrendingCharacter }) => (
            <CharacterCard
                character={item}
                onPress={() =>
                    navigate("CharacterScreen", {
                        characterId: item.id,
                        characterName: item.name,
                    })
                }
                onLongPress={() => handleLongPress(item)}
                hidden={hiddenIds.has(item.id)}
                onToggleHidden={() => handleToggleHidden(item.id)}
                style={isTablet ? styles.cardTablet : undefined}
            />
        ),
        [navigate, isTablet, handleLongPress, hiddenIds, handleToggleHidden],
    );
}

export function useCreatorCardRenderer(navigate: Nav["navigate"]) {
    return useCallback(
        ({ item }: { item: ProfileSearchResult }) => (
            <CreatorCard
                item={item}
                onPress={() =>
                    navigate("CreatorScreen", {
                        userId: item.id,
                        userName: item.user_name,
                    })
                }
                onPressCharacter={(char) =>
                    navigate("CharacterScreen", {
                        characterId: char.id,
                        characterName: char.name,
                    })
                }
            />
        ),
        [navigate],
    );
}

const styles = StyleSheet.create({
    cardTablet: {
        flex: 1,
        marginHorizontal: 8,
    },
});
