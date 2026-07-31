import React, {
  useEffect,
  useReducer,
  useRef,
  useCallback,
  useState,
  useMemo,
} from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  TextInput,
  Pressable,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { FlashList } from "@shopify/flash-list";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import CharacterCard from "../../components/character/CharacterCard";
import CharacterDiscoverActionsSheet from "../../components/character/CharacterDiscoverActionsSheet";
import CharacterReportModal from "../../components/character/CharacterReportModal";
import { getCharacters, getTags, searchProfiles } from "../../api/characters";
import { getBlockedContent, updateBlockedContent } from "../../api/profile";
import type { CharacterSearchParams } from "../../api/characters";
import type { CharacterAvatarPreview } from "../../api/characters";
import type { ProfileSearchResult } from "../../api/characters";
import type { TrendingCharacter, TrendingResponse } from "../../types/api";
import type { CharactersStackParamList } from "../../navigation/types";
import { storage } from "../../utils/storage";
import Avatar from "../../components/common/Avatar";
import SortModal, {
  type SortModalHandle,
} from "../../components/discover/SortModal";
import TagsModal, {
  type TagsModalHandle,
  type TagEntry,
} from "../../components/discover/TagsModal";
import FilterModal, {
  type FilterModalHandle,
} from "../../components/discover/FilterModal";
import { colors } from "../../utils/colors";
import { avatarUrl, botAvatarUrl } from "../../utils/assets";
import { SORT_OPTIONS, type FilterState, INITIAL_FILTERS } from "../../utils/discover";
import { useIsTablet } from "../../hooks/useIsTablet";
import { SlidersHorizontal, Filter } from "lucide-react-native";
import AdvancedSearchModal from "../../components/discover/AdvancedSearchModal";
import CustomAlert, {
  type AlertButton,
} from "../../components/common/CustomAlert";

type Nav = NativeStackNavigationProp<
  CharactersStackParamList,
  "CharacterSearch"
>;

type SearchRoute = RouteProp<CharactersStackParamList, "CharacterSearch">;

type DiscoveryMode = "characters" | "creators";

interface ListState {
  characters: TrendingCharacter[];
  page: number;
  loading: boolean;
  refreshing: boolean;
  total: number;
  error: string | null;
}

type ListAction =
  | { type: "LOADING" }
  | { type: "REFRESHING" }
  | {
      type: "LOADED";
      payload: { data: TrendingCharacter[]; total: number; page: number };
    }
  | { type: "ERROR"; payload: string }
  | { type: "RESET" };

function listReducer(state: ListState, action: ListAction): ListState {
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

function buildParams(
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

function mergeTags(
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

function filterDisplayCharacters(
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

function useHiddenCharacters() {
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

function hasFilterOverrides(p?: SearchRoute["params"]): boolean {
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

function initialTagsFromParams(p?: SearchRoute["params"]): Set<string> {
  const tags = new Set<string>();
  if (!p) return tags;
  if (p.tag) {
    tags.add(`top_${p.tag}`);
  }
  if (p.tag_id) {
    for (const id of p.tag_id.split(",").map((s) => s.trim()).filter(Boolean)) {
      tags.add(id);
    }
  }
  return tags;
}

function initialFiltersFromParams(p?: SearchRoute["params"]): FilterState {
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

function useDiscoverState(params: SearchRoute["params"]) {
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

function useAdvancedSearch() {
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

function useAlert() {
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertButtons, setAlertButtons] = useState<AlertButton[]>([]);

  const showBlockAlert = useCallback((character: TrendingCharacter) => {
    setAlertTitle("Block Character");
    setAlertMessage(
      `Block "${character.name}"? Hidden characters won't appear in your discover feed.`,
    );
    setAlertButtons([
      {
        text: "Block",
        style: "destructive",
        onPress: async () => {
          setAlertVisible(false);
          try {
            const blocked = await getBlockedContent();
            if (!blocked.bots.includes(character.id)) {
              blocked.bots.push(character.id);
            }
            await updateBlockedContent(blocked);
          } catch {}
        },
      },
      { text: "Cancel", style: "cancel", onPress: () => setAlertVisible(false) },
    ]);
    setAlertVisible(true);
  }, []);

  const handleAlertDismiss = useCallback(() => setAlertVisible(false), []);

  return {
    alertVisible,
    alertTitle,
    alertMessage,
    alertButtons,
    showBlockAlert,
    handleAlertDismiss,
  };
}

function useCreators() {
  const [creators, setCreators] = useState<ProfileSearchResult[]>([]);
  const [creatorsTotal, setCreatorsTotal] = useState(0);
  const [creatorsLoading, setCreatorsLoading] = useState(false);
  const [creatorsRefreshing, setCreatorsRefreshing] = useState(false);
  const creatorsPageRef = useRef(1);
  const loadingMoreCreatorsRef = useRef(false);

  const doFetchCreators = useCallback(
    async (pageNum: number, isRefresh = false) => {
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
    if (loadingMoreCreatorsRef.current) return;
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

function useLongPressActions(navigate: Nav["navigate"]) {
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


function useCharactersList() {
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
      if (loadingMoreRef.current) return;
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

function useCharacterCardRenderer(
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

function useCreatorCardRenderer(navigate: Nav["navigate"]) {
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

const SearchHeader = React.memo(function SearchHeader({
  discoveryMode,
  hasAdvancedFilters,
  displayCount,
  totalCount,
  creatorsTotal,
  onToggleMode,
}: {
  discoveryMode: "characters" | "creators";
  hasAdvancedFilters: boolean;
  displayCount: number;
  totalCount: number;
  creatorsTotal: number;
  onToggleMode: () => void;
}) {
  return (
    <>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Discover</Text>
        <Pressable style={styles.modeToggle} onPress={onToggleMode}>
          <Text style={styles.modeToggleText}>
            {discoveryMode === "characters" ? "Creators" : "Characters"}
          </Text>
        </Pressable>
      </View>
      {discoveryMode === "characters" && (
        <Text style={styles.subtitle}>
          {hasAdvancedFilters
            ? `${displayCount.toLocaleString()} / ${totalCount.toLocaleString()} characters`
            : `${totalCount.toLocaleString()} characters`}
        </Text>
      )}
      {discoveryMode === "creators" && (
        <Text style={styles.subtitle}>
          {creatorsTotal.toLocaleString()} creators
        </Text>
      )}
    </>
  );
});

const SearchInputRow = React.memo(function SearchInputRow({
  searchText,
  onSearchChange,
  onOpenAdvanced,
}: {
  searchText: string;
  onSearchChange: (text: string) => void;
  onOpenAdvanced: () => void;
}) {
  return (
    <View style={styles.searchRow}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search characters..."
        placeholderTextColor={colors.textDim}
        value={searchText}
        onChangeText={onSearchChange}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />
      <Pressable style={styles.advancedButton} onPress={onOpenAdvanced}>
        <SlidersHorizontal size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
});

const ControlsRow = React.memo(function ControlsRow({
  sortLabel,
  tagsLabel,
  onOpenSort,
  onOpenTags,
  onOpenFilters,
}: {
  sortLabel: string;
  tagsLabel: string;
  onOpenSort: () => void;
  onOpenTags: () => void;
  onOpenFilters: () => void;
}) {
  return (
    <View style={styles.controlsRow}>
      <Pressable style={styles.controlButton} onPress={onOpenSort}>
        <Text style={styles.controlButtonText}>{sortLabel}</Text>
      </Pressable>

      <Pressable style={styles.controlButton} onPress={onOpenTags}>
        <Text style={styles.controlButtonText}>{tagsLabel}</Text>
      </Pressable>

      <Pressable style={styles.controlButtonIcon} onPress={onOpenFilters}>
        <Filter size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
});

const CharacterList = React.memo(function CharacterList({
  data,
  renderItem,
  isTablet,
  refreshing,
  onRefresh,
  onEndReached,
  loading,
  error,
  hasMore,
}: {
  data: TrendingCharacter[];
  renderItem: ({
    item,
  }: {
    item: TrendingCharacter;
  }) => React.ReactElement;
  isTablet: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
}) {
  if (loading && data.length === 0) {
    return (
      <View style={styles.listLoader}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }
  if (error && data.length === 0) {
    return (
      <View style={styles.listLoader}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }
  return (
    <FlashList
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={isTablet ? 2 : 1}
      key={isTablet ? "tablet-2col" : "phone-1col"}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      drawDistance={800}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
        />
      }
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        !loading && !error ? (
          <View style={styles.listLoader}>
            <Text style={styles.emptyText}>No characters found</Text>
          </View>
        ) : null
      }
      ListFooterComponent={
        hasMore ? (
          <ActivityIndicator style={styles.footerLoader} color={colors.accent} />
        ) : null
      }
    />
  );
});

const CreatorList = React.memo(function CreatorList({
  data,
  renderItem,
  refreshing,
  onRefresh,
  onEndReached,
  loading,
  hasMore,
}: {
  data: ProfileSearchResult[];
  renderItem: ({
    item,
  }: {
    item: ProfileSearchResult;
  }) => React.ReactElement;
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  loading: boolean;
  hasMore: boolean;
}) {
  if (loading && data.length === 0) {
    return (
      <View style={styles.listLoader}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }
  return (
    <FlashList
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      drawDistance={800}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
        />
      }
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        !loading ? (
          <View style={styles.listLoader}>
            <Text style={styles.emptyText}>No creators found</Text>
          </View>
        ) : null
      }
      ListFooterComponent={
        hasMore ? (
          <ActivityIndicator style={styles.footerLoader} color={colors.accent} />
        ) : null
      }
    />
  );
});

const DiscoverModals = React.memo(function DiscoverModals({
  sortModalRef,
  currentSort,
  onSortSelect,
  tagsModalRef,
  mergedTags,
  selectedTagIds,
  onToggleTag,
  onApplyTags,
  filterModalRef,
  filters,
  onApplyFilters,
}: {
  sortModalRef: React.RefObject<SortModalHandle | null>;
  currentSort: string;
  onSortSelect: (value: string) => void;
  tagsModalRef: React.RefObject<TagsModalHandle | null>;
  mergedTags: TagEntry[];
  selectedTagIds: Set<string>;
  onToggleTag: (tagId: string) => void;
  onApplyTags: () => void;
  filterModalRef: React.RefObject<FilterModalHandle | null>;
  filters: FilterState;
  onApplyFilters: (filters: FilterState) => void;
}) {
  return (
    <>
      <SortModal
        ref={sortModalRef}
        currentSort={currentSort}
        onSelect={onSortSelect}
      />
      <TagsModal
        ref={tagsModalRef}
        mergedTags={mergedTags}
        selectedTagIds={selectedTagIds}
        onToggleTag={onToggleTag}
        onApply={onApplyTags}
      />
      <FilterModal
        ref={filterModalRef}
        filters={filters}
        onApply={onApplyFilters}
      />
    </>
  );
});

const ActionOverlays = React.memo(function ActionOverlays({
  advancedSearchVisible,
  advancedKeywords,
  onKeywordsChange,
  advancedBlacklist,
  onBlacklistedChange,
  keywordMatchMode,
  onMatchModeChange,
  hideDarkened,
  onHideDarkenedChange,
  onCloseAdvancedSearch,
  actionsVisible,
  characterName,
  hasCreator,
  onActionsClose,
  onViewCharacter,
  onViewCreator,
  onBlockCharacter,
  onReportCharacter,
  reportVisible,
  characterId,
  onCloseReport,
  alertVisible,
  alertTitle,
  alertMessage,
  alertButtons,
  onAlertDismiss,
}: {
  advancedSearchVisible: boolean;
  advancedKeywords: string[];
  onKeywordsChange: (value: string[]) => void;
  advancedBlacklist: string[];
  onBlacklistedChange: (value: string[]) => void;
  keywordMatchMode: "any" | "all";
  onMatchModeChange: (value: "any" | "all") => void;
  hideDarkened: boolean;
  onHideDarkenedChange: (value: boolean) => void;
  onCloseAdvancedSearch: () => void;
  actionsVisible: boolean;
  characterName: string;
  hasCreator: boolean;
  onActionsClose: () => void;
  onViewCharacter: () => void;
  onViewCreator: () => void;
  onBlockCharacter: () => void;
  onReportCharacter: () => void;
  reportVisible: boolean;
  characterId: string;
  onCloseReport: () => void;
  alertVisible: boolean;
  alertTitle: string;
  alertMessage: string;
  alertButtons: AlertButton[];
  onAlertDismiss: () => void;
}) {
  return (
    <>
      <AdvancedSearchModal
        key={advancedSearchVisible ? "open" : "closed"}
        visible={advancedSearchVisible}
        keywords={advancedKeywords}
        blacklisted={advancedBlacklist}
        matchMode={keywordMatchMode}
        hideDarkened={hideDarkened}
        onKeywordsChange={onKeywordsChange}
        onBlacklistedChange={onBlacklistedChange}
        onMatchModeChange={onMatchModeChange}
        onHideDarkenedChange={onHideDarkenedChange}
        onClose={onCloseAdvancedSearch}
      />

      <CharacterDiscoverActionsSheet
        visible={actionsVisible}
        characterName={characterName}
        hasCreator={hasCreator}
        onClose={onActionsClose}
        onViewCharacter={onViewCharacter}
        onViewCreator={onViewCreator}
        onBlockCharacter={onBlockCharacter}
        onReportCharacter={onReportCharacter}
      />

      <CharacterReportModal
        visible={reportVisible}
        characterId={characterId}
        onClose={onCloseReport}
      />

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        buttons={alertButtons}
        onDismiss={onAlertDismiss}
      />
    </>
  );
});

const CreatorCard = React.memo(function CreatorCard({
  item,
  onPress,
  onPressCharacter,
}: {
  item: ProfileSearchResult;
  onPress: () => void;
  onPressCharacter: (char: CharacterAvatarPreview) => void;
}) {
  return (
    <Pressable style={styles.creatorCard} onPress={onPress}>
      <View style={styles.creatorRow}>
        <Avatar uri={avatarUrl(item.avatar)} name={item.user_name} size={48} />
        <View style={styles.creatorInfo}>
          <Text style={styles.creatorName} numberOfLines={1}>
            {item.user_name}
          </Text>
          <Text style={styles.creatorMeta}>
            {item.followers_count} followers · {item.character_count} characters
          </Text>
        </View>
      </View>
      {item.character_avatar_previews.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.charPreviewScroll}
          contentContainerStyle={styles.charPreviewContent}
        >
          {item.character_avatar_previews.slice(0, 3).map((char) => (
            <Pressable
              key={char.id}
              style={styles.charPreviewItem}
              onPress={() => onPressCharacter(char)}
            >
              <Image
                source={{ uri: botAvatarUrl(char.avatar) }}
                style={styles.charPreviewAvatar}
              />
              <Text
                style={styles.charPreviewName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {char.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </Pressable>
  );
});

export default function CharacterSearchScreen() {
  const { navigate } = useNavigation<Nav>();
  const route = useRoute<SearchRoute>();
  const isTablet = useIsTablet();
  const [discoveryMode, setDiscoveryMode] =
    useState<DiscoveryMode>("characters");
  const [allTags, setAllTags] = useState<TagEntry[]>([]);
  const { hiddenIds, handleToggleHidden } = useHiddenCharacters();
  const {
    filters,
    setFilters,
    searchText,
    setSearchText,
    sortMode,
    setSortMode,
    selectedTagIds,
    setSelectedTagIds,
    toggleTag,
  } = useDiscoverState(route.params);
  const {
    advancedKeywords,
    setAdvancedKeywords,
    advancedBlacklist,
    setAdvancedBlacklist,
    keywordMatchMode,
    setKeywordMatchMode,
    hideDarkened,
    setHideDarkened,
    advancedSearchVisible,
    setAdvancedSearchVisible,
  } = useAdvancedSearch();
  const {
    alertVisible,
    alertTitle,
    alertMessage,
    alertButtons,
    showBlockAlert,
    handleAlertDismiss,
  } = useAlert();
  const {
    creators,
    creatorsTotal,
    creatorsLoading,
    creatorsRefreshing,
    doFetchCreators,
    handleLoadMoreCreators,
  } = useCreators();
  const {
    longPressCharacter,
    actionsVisible,
    reportVisible,
    handleLongPress,
    handleViewCharacter,
    handleViewCreator,
    handleReportCharacter,
    handleCloseReport,
    handleActionsClose,
  } = useLongPressActions(navigate);

  const sortModalRef = useRef<SortModalHandle>(null);
  const tagsModalRef = useRef<TagsModalHandle>(null);
  const filterModalRef = useRef<FilterModalHandle>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openSort = useCallback(() => sortModalRef.current?.open(), []);
  const openTags = useCallback(() => tagsModalRef.current?.open(), []);
  const openFilters = useCallback(() => filterModalRef.current?.open(), []);
  const closeAdvancedSearch = useCallback(
    () => setAdvancedSearchVisible(false),
    [setAdvancedSearchVisible],
  );

  const { state, doFetch, handleLoadMore, topCustomTags } = useCharactersList();

  const currentSearchParams = useMemo(
    () => ({
      sort: sortMode,
      search: searchText,
      tags: selectedTagIds,
      filters,
    }),
    [sortMode, searchText, selectedTagIds, filters],
  );

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchText(text);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        doFetch(1, currentSearchParams);
      }, 500);
    },
    [setSearchText, doFetch, currentSearchParams],
  );

  const handleToggleMode = useCallback(() => {
    const next = discoveryMode === "characters" ? "creators" : "characters";
    setDiscoveryMode(next);
    if (next === "creators" && creators.length === 0) {
      doFetchCreators(1);
    }
  }, [discoveryMode, creators.length, doFetchCreators]);

  const handleRefresh = useCallback(() => {
    if (discoveryMode === "characters") {
      doFetch(1, currentSearchParams, true);
    } else {
      doFetchCreators(1, true);
    }
  }, [doFetch, doFetchCreators, discoveryMode, currentSearchParams]);

  const handleSortSelect = useCallback(
    (value: string) => {
      setSortMode(value);
      doFetch(1, { ...currentSearchParams, sort: value });
    },
    [setSortMode, doFetch, currentSearchParams],
  );

  const handleApplyTags = useCallback(() => {
    doFetch(1, currentSearchParams);
  }, [currentSearchParams, doFetch]);

  const handleApplyFilters = useCallback(
    (newFilters: FilterState) => {
      setFilters(newFilters);
      doFetch(1, { ...currentSearchParams, filters: newFilters });
    },
    [setFilters, doFetch, currentSearchParams],
  );

  const handleBlockCharacter = useCallback(() => {
    if (!longPressCharacter) return;
    showBlockAlert(longPressCharacter);
  }, [longPressCharacter, showBlockAlert]);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await getTags();
        setAllTags(
          tags.map((t) => ({ id: String(t.id), name: t.name, slug: t.slug })),
        );
      } catch {}
    };
    fetchTags();
  }, []);

  const mergedTags: TagEntry[] = useMemo(
    () => mergeTags(topCustomTags, allTags),
    [topCustomTags, allTags],
  );

  const hasAdvancedFilters =
    advancedKeywords.length > 0 || advancedBlacklist.length > 0;

  const displayCharacters = useMemo(
    () =>
      filterDisplayCharacters(
        state.characters,
        advancedKeywords,
        advancedBlacklist,
        keywordMatchMode,
        hideDarkened,
        hiddenIds,
      ),
    [
      state.characters,
      advancedKeywords,
      advancedBlacklist,
      keywordMatchMode,
      hideDarkened,
      hiddenIds,
    ],
  );

  const sortLabel =
    SORT_OPTIONS.find((o) => o.value === sortMode)?.label ?? "Trending 24h";
  const tagsLabel =
    selectedTagIds.size > 0 ? `Tags (${selectedTagIds.size})` : "Tags";

  const renderItem = useCharacterCardRenderer(
    navigate,
    isTablet,
    handleLongPress,
    hiddenIds,
    handleToggleHidden,
  );

  const renderCreatorItem = useCreatorCardRenderer(navigate);

  const handleLoadMoreWrap = useCallback(
    () => handleLoadMore(currentSearchParams),
    [handleLoadMore, currentSearchParams],
  );

  return (
    <View style={styles.container}>
      <SearchHeader
        discoveryMode={discoveryMode}
        hasAdvancedFilters={hasAdvancedFilters}
        displayCount={displayCharacters.length}
        totalCount={state.total}
        creatorsTotal={creatorsTotal}
        onToggleMode={handleToggleMode}
      />
      {discoveryMode === "characters" && (
        <>
          <SearchInputRow
            searchText={searchText}
            onSearchChange={handleSearchChange}
            onOpenAdvanced={closeAdvancedSearch}
          />
          <ControlsRow
            sortLabel={sortLabel}
            tagsLabel={tagsLabel}
            onOpenSort={openSort}
            onOpenTags={openTags}
            onOpenFilters={openFilters}
          />
        </>
      )}
      {discoveryMode === "characters" ? (
        <CharacterList
          data={displayCharacters}
          renderItem={renderItem}
          isTablet={isTablet}
          refreshing={state.refreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMoreWrap}
          loading={state.loading}
          error={state.error}
          hasMore={state.loading && state.characters.length > 0}
        />
      ) : (
        <CreatorList
          data={creators}
          renderItem={renderCreatorItem}
          refreshing={creatorsRefreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMoreCreators}
          loading={creatorsLoading}
          hasMore={creatorsLoading && creators.length > 0}
        />
      )}
      <DiscoverModals
        sortModalRef={sortModalRef}
        currentSort={sortMode}
        onSortSelect={handleSortSelect}
        tagsModalRef={tagsModalRef}
        mergedTags={mergedTags}
        selectedTagIds={selectedTagIds}
        onToggleTag={toggleTag}
        onApplyTags={handleApplyTags}
        filterModalRef={filterModalRef}
        filters={filters}
        onApplyFilters={handleApplyFilters}
      />
      <ActionOverlays
        advancedSearchVisible={advancedSearchVisible}
        advancedKeywords={advancedKeywords}
        onKeywordsChange={setAdvancedKeywords}
        advancedBlacklist={advancedBlacklist}
        onBlacklistedChange={setAdvancedBlacklist}
        keywordMatchMode={keywordMatchMode}
        onMatchModeChange={setKeywordMatchMode}
        hideDarkened={hideDarkened}
        onHideDarkenedChange={setHideDarkened}
        onCloseAdvancedSearch={closeAdvancedSearch}
        actionsVisible={actionsVisible}
        characterName={longPressCharacter?.name || ""}
        hasCreator={!!longPressCharacter?.creator_id}
        onActionsClose={handleActionsClose}
        onViewCharacter={handleViewCharacter}
        onViewCreator={handleViewCreator}
        onBlockCharacter={handleBlockCharacter}
        onReportCharacter={handleReportCharacter}
        reportVisible={reportVisible}
        characterId={longPressCharacter?.id ?? ""}
        onCloseReport={handleCloseReport}
        alertVisible={alertVisible}
        alertTitle={alertTitle}
        alertMessage={alertMessage}
        alertButtons={alertButtons}
        onAlertDismiss={handleAlertDismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 14,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  advancedButton: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  controlsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  controlButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  controlButtonIcon: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  controlButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  list: {
    paddingBottom: 80,
  },
  listLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  footerLoader: {
    paddingVertical: 20,
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
  },
  emptyText: {
    color: colors.textDim,
    fontSize: 14,
  },
  cardTablet: {
    flex: 1,
    marginHorizontal: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 20,
  },
  modeToggle: {
    marginLeft: "auto",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 60,
  },
  modeToggleText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  creatorCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  creatorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  creatorName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  creatorMeta: {
    color: colors.textDim,
    fontSize: 13,
    marginTop: 2,
  },
  charPreviewScroll: {
    marginTop: 12,
  },
  charPreviewContent: {
    gap: 12,
  },
  charPreviewItem: {
    alignItems: "center",
    width: 64,
  },
  charPreviewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.border,
  },
  charPreviewName: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
    width: 64,
  },
});
