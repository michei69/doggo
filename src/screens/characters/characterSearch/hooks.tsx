import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { getCharacters, searchProfiles } from "../../../api/characters";
import { getBlockedContent, updateBlockedContent } from "../../../api/profile";
import CharacterCard from "../../../components/character/CharacterCard";
import type { AlertButton } from "../../../components/common/CustomAlert";
import type { SwipeDiscoverParams } from "../../../navigation/types";
import { toast } from "../../../utils/toast";
import type {
  ProfileSearchResponse,
  ProfileSearchResult,
  TagEntry,
  TrendingCharacter,
  TrendingResponse,
} from "../../../types/api";
import { INITIAL_FILTERS, type FilterState } from "../../../utils/discover";
import { storage } from "../../../utils/storage";
import { CreatorCard } from "./cards";
import {
  buildParams,
  filterDisplayCharacters,
  genericListReducer,
  hasFilterOverrides,
  initialFiltersFromParams,
  initialTagsFromParams,
  parseSwipeParams,
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

  const handleHideCharacter = useCallback((characterId: string) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.add(characterId);
      return next;
    });
  }, []);

  useEffect(() => {
    storage.setHiddenCharacters([...hiddenIds]);
  }, [hiddenIds]);

  return { hiddenIds, handleToggleHidden, handleHideCharacter };
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
  onBlocked?: (characterId: string) => void,
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
                try {
                  await Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success,
                  );
                } catch {}
                toast("Character blocked");
                onBlocked?.(character.id);
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
    [showAlert, dismissAlert, onBlocked],
  );
}

interface ListCurrentParams {
  sort: string;
  search: string;
  tags: Set<string>;
  filters: FilterState;
}

export function usePaginatedFetch<
  T extends { id: string },
  R extends { data: T[]; total: number },
  P = undefined,
>({
  fetchFn,
  dedupeAppend = true,
  autoInit = false,
  initialLoading = true,
  initParams,
  onLoaded,
}: {
  fetchFn: (pageNum: number, params: P) => Promise<R>;
  dedupeAppend?: boolean;
  autoInit?: boolean;
  initialLoading?: boolean;
  initParams?: P;
  onLoaded?: (result: R, pageNum: number) => void;
}) {
  const [state, dispatch] = useReducer(genericListReducer<T>, {
    characters: [],
    page: 1,
    loading: initialLoading,
    refreshing: false,
    total: 0,
    error: null,
  });
  const pageRef = useRef(1);
  const initialLoadRef = useRef(false);
  const loadingMoreRef = useRef(false);
  // Server `total` can overcount; 3 consecutive empty pages = real end.
  const emptyPagesRef = useRef(0);
  const reachedEndRef = useRef(false);

  const doFetch = useCallback(
    async (pageNum: number, params: P, isRefresh = false) => {
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
        const result = await fetchFn(pageNum, params);
        const data = result.data;
        dispatch({
          type: "LOADED",
          payload: {
            data,
            total: result.total,
            page: pageNum,
            ...(dedupeAppend ? {} : { dedupe: false }),
          },
        });
        pageRef.current = pageNum;

        if (data.length === 0) {
          emptyPagesRef.current += 1;
          if (emptyPagesRef.current >= 3) {
            reachedEndRef.current = true;
          }
        } else {
          emptyPagesRef.current = 0;
        }

        loadingMoreRef.current = false;
        onLoaded?.(result, pageNum);
      } catch (err: any) {
        loadingMoreRef.current = false;
        dispatch({ type: "ERROR", payload: err.message });
      }
    },
    [fetchFn, dedupeAppend, onLoaded],
  );

  useEffect(() => {
    if (!autoInit) return;
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    doFetch(1, initParams as P);
  }, [autoInit, doFetch, initParams]);

  const handleLoadMore = useCallback(
    (params: P) => {
      if (loadingMoreRef.current || reachedEndRef.current) return;
      if (!state.loading && state.characters.length < state.total) {
        loadingMoreRef.current = true;
        const nextPage = pageRef.current + 1;
        doFetch(nextPage, params);
      }
    },
    [state.loading, state.characters.length, state.total, doFetch],
  );

  return { state, doFetch, handleLoadMore };
}

export function useCreators() {
  const fetchCreators = useCallback(
    async (pageNum: number) =>
      searchProfiles({ page: pageNum, mode: "foryou" }),
    [],
  );

  const { state, doFetch, handleLoadMore } = usePaginatedFetch<
    ProfileSearchResult,
    ProfileSearchResponse,
    undefined
  >({
    fetchFn: fetchCreators,
    dedupeAppend: false,
    autoInit: false,
    initialLoading: false,
  });

  const doFetchCreators = useCallback(
    (pageNum: number, isRefresh = false) =>
      doFetch(pageNum, undefined, isRefresh),
    [doFetch],
  );

  const handleLoadMoreCreators = useCallback(
    () => handleLoadMore(undefined),
    [handleLoadMore],
  );

  const [removedCreatorIds, setRemovedCreatorIds] = useState<Set<string>>(
    new Set(),
  );

  const removeCreator = useCallback((id: string) => {
    setRemovedCreatorIds((prev) => new Set(prev).add(id));
  }, []);

  const creators = useMemo(
    () => state.characters.filter((c) => !removedCreatorIds.has(c.id)),
    [state.characters, removedCreatorIds],
  );

  return {
    creators,
    creatorsTotal: state.total,
    creatorsLoading: state.loading,
    creatorsRefreshing: state.refreshing,
    creatorsError: state.error,
    doFetchCreators,
    handleLoadMoreCreators,
    removeCreator,
  };
}

export function useLongPressActions(
  navigate: (name: string, params?: object) => void,
  characterScreenName = "CharacterScreen",
) {
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
    navigate(characterScreenName, {
      characterId: longPressCharacter.id,
      characterName: longPressCharacter.name,
    });
  }, [longPressCharacter, navigate, characterScreenName]);

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
  const [topCustomTags, setTopCustomTags] = useState<TagEntry[]>([]);

  const fetchCharacters = useCallback(
    async (pageNum: number, current: ListCurrentParams) => {
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
      return { ...response, data: filteredData };
    },
    [],
  );

  const handleTopCustomTags = useCallback((response: TrendingResponse) => {
    if (response.top_custom_tags && response.top_custom_tags.length > 0) {
      const custom: TagEntry[] = response.top_custom_tags.map(
        (slug, index) => ({
          id: -(index + 1),
          name: slug,
          slug,
        }),
      );
      setTopCustomTags(custom);
    }
  }, []);

  const { state, doFetch, handleLoadMore } = usePaginatedFetch<
    TrendingCharacter,
    TrendingResponse,
    ListCurrentParams
  >({
    fetchFn: fetchCharacters,
    dedupeAppend: true,
    autoInit: true,
    initParams: {
      sort: "",
      search: "",
      tags: new Set(),
      filters: INITIAL_FILTERS,
    },
    onLoaded: handleTopCustomTags,
  });

  return { state, doFetch, handleLoadMore, topCustomTags };
}

export function useSwipeDeck(
  params?: SwipeDiscoverParams,
  hiddenIds: Set<string> = new Set(),
) {
  const {
    filters,
    tags,
    search,
    sort,
    advancedKeywords,
    advancedBlacklist,
    keywordMatchMode,
  } = parseSwipeParams(params);
  const firstRenderRef = useRef(true);

  const current = useMemo(
    () => ({ sort, search, tags, filters }),
    [sort, search, tags, filters],
  );

  const fetchDeck = useCallback(
    async (pageNum: number) => {
      const apiParams = buildParams(
        current.sort,
        current.search,
        current.tags,
        current.filters,
        pageNum,
      );
      const response: TrendingResponse = await getCharacters(apiParams);
      let filteredData = response.data;
      if (current.filters.customAvatar) {
        filteredData = filteredData.filter(
          (c) =>
            c.avatar !== "placeholder-nsfw.webp" &&
            c.avatar !== "countdown.webp",
        );
      }
      return { ...response, data: filteredData };
    },
    [current],
  );

  const { state, doFetch, handleLoadMore } = usePaginatedFetch<
    TrendingCharacter,
    TrendingResponse
  >({
    fetchFn: fetchDeck,
    dedupeAppend: true,
    autoInit: true,
  });

  const deck = useMemo(
    () =>
      filterDisplayCharacters(
        state.characters,
        advancedKeywords,
        advancedBlacklist,
        keywordMatchMode,
        true,
        hiddenIds,
      ),
    [
      state.characters,
      advancedKeywords,
      advancedBlacklist,
      keywordMatchMode,
      hiddenIds,
    ],
  );

  const refresh = useCallback(() => {
    doFetch(1, undefined, true);
  }, [doFetch]);

  const loadMore = useCallback(() => {
    handleLoadMore(undefined);
  }, [handleLoadMore]);

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    if (deck.length < 5) {
      loadMore();
    }
  }, [deck.length, loadMore]);

  return {
    deck,
    loading: state.loading,
    refreshing: state.refreshing,
    error: state.error,
    refresh,
    loadMore,
  };
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
