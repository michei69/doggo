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
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import CharacterCard from "../../components/character/CharacterCard";
import { getCharacters, getTags } from "../../api/characters";
import type { CharacterSearchParams } from "../../api/characters";
import type { TrendingCharacter, TrendingResponse } from "../../types/api";
import type { CharactersStackParamList } from "../../navigation/types";
import { storage } from "../../utils/storage";
import SortModal, {
  type SortModalHandle,
  SORT_OPTIONS,
} from "../../components/discover/SortModal";
import TagsModal, {
  type TagsModalHandle,
  type TagEntry,
} from "../../components/discover/TagsModal";
import FilterModal, {
  type FilterModalHandle,
  type FilterState,
  INITIAL_FILTERS,
} from "../../components/discover/FilterModal";
import { colors } from "../../utils/colors";
import { useIsTablet } from "../../hooks/useIsTablet";

type Nav = NativeStackNavigationProp<
  CharactersStackParamList,
  "CharacterSearch"
>;

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
      return {
        ...state,
        characters: page === 1 ? data : [...state.characters, ...data],
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

export default function CharacterSearchScreen() {
  const { navigate } = useNavigation<Nav>();
  const isTablet = useIsTablet();
  const [state, dispatch] = useReducer(listReducer, {
    characters: [],
    page: 1,
    loading: true,
    refreshing: false,
    total: 0,
    error: null,
  });
  const pageRef = useRef(1);
  const initialLoadRef = useRef(false);

  const [allTags, setAllTags] = useState<TagEntry[]>([]);
  const [topCustomTags, setTopCustomTags] = useState<TagEntry[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const selectedTagsRef = useRef<Set<string>>(new Set());

  const [sortMode, setSortMode] = useState("trending24");
  const sortModeRef = useRef("trending24");
  const [searchText, setSearchText] = useState("");
  const searchRef = useRef("");

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const filtersRef = useRef<FilterState>(INITIAL_FILTERS);
  const filtersLoadedRef = useRef(false);
  const firstRenderRef = useRef(true);

  useEffect(() => {
    if (filtersLoadedRef.current) return;
    filtersLoadedRef.current = true;
    const loadFilters = async () => {
      try {
        const saved = await storage.getDiscoverFilters<FilterState>();
        if (saved) {
          setFilters(saved);
          filtersRef.current = saved;
        }
      } catch {}
    };
    loadFilters();
  }, []);

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    storage.setDiscoverFilters(filters);
  }, [filters]);

  const sortModalRef = useRef<SortModalHandle>(null);
  const tagsModalRef = useRef<TagsModalHandle>(null);
  const filterModalRef = useRef<FilterModalHandle>(null);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doFetch = useCallback(async (pageNum: number, isRefresh = false) => {
    if (isRefresh) {
      dispatch({ type: "REFRESHING" });
    } else if (pageNum === 1) {
      dispatch({ type: "RESET" });
    } else {
      dispatch({ type: "LOADING" });
    }

    try {
      const params = buildParams(
        sortModeRef.current,
        searchRef.current,
        selectedTagsRef.current,
        filtersRef.current,
        pageNum,
      );
      const response: TrendingResponse = await getCharacters(params);
      let filteredData = response.data;
      if (filtersRef.current.customAvatar) {
        filteredData = filteredData.filter(
          (c) => c.avatar !== "placeholder-nsfw.webp",
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
    } catch (err: any) {
      dispatch({ type: "ERROR", payload: err.message });
    }
  }, []);

  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    doFetch(1);
  }, [doFetch]);

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

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchText(text);
      searchRef.current = text;

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        doFetch(1);
      }, 500);
    },
    [doFetch],
  );

  const handleLoadMore = useCallback(() => {
    if (!state.loading && state.characters.length < state.total) {
      const nextPage = pageRef.current + 1;
      doFetch(nextPage);
    }
  }, [state.loading, state.characters.length, state.total, doFetch]);

  const handleRefresh = useCallback(() => {
    doFetch(1, true);
  }, [doFetch]);

  const handleSortSelect = useCallback(
    (value: string) => {
      setSortMode(value);
      sortModeRef.current = value;
      doFetch(1);
    },
    [doFetch],
  );

  const handleApplyTags = useCallback(() => {
    selectedTagsRef.current = selectedTagIds;
    doFetch(1);
  }, [selectedTagIds, doFetch]);

  const handleApplyFilters = useCallback(
    (newFilters: FilterState) => {
      setFilters(newFilters);
      filtersRef.current = newFilters;
      doFetch(1);
    },
    [doFetch],
  );

  const mergedTags: TagEntry[] = useMemo(() => {
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
  }, [topCustomTags, allTags]);

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

  const renderItem = useCallback(
    ({ item }: { item: TrendingCharacter }) => (
      <CharacterCard
        character={item}
        onPress={() =>
          navigate("CharacterScreen", {
            characterId: item.id,
            characterName: item.name,
          })
        }
        style={isTablet ? styles.cardTablet : undefined}
      />
    ),
    [navigate, isTablet],
  );

  const sortLabel =
    SORT_OPTIONS.find((o) => o.value === sortMode)?.label ?? "Trending 24h";
  const tagsLabel =
    selectedTagIds.size > 0 ? `Tags (${selectedTagIds.size})` : "Tags";

  const isLoading = state.loading && state.characters.length === 0;
  const isEmptyError = state.error && state.characters.length === 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Discover</Text>
      <Text style={styles.subtitle}>
        {state.total.toLocaleString()} characters
      </Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search characters..."
        placeholderTextColor={colors.textDim}
        value={searchText}
        onChangeText={handleSearchChange}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />

      <View style={styles.controlsRow}>
        <Pressable
          style={styles.controlButton}
          onPress={() => sortModalRef.current?.open()}
        >
          <Text style={styles.controlButtonText}>{sortLabel}</Text>
        </Pressable>

        <Pressable
          style={styles.controlButton}
          onPress={() => tagsModalRef.current?.open()}
        >
          <Text style={styles.controlButtonText}>{tagsLabel}</Text>
        </Pressable>

        <Pressable
          style={styles.controlButtonIcon}
          onPress={() => filterModalRef.current?.open()}
        >
          <Text style={styles.controlButtonText}>{"⚙"}</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.listLoader}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : isEmptyError ? (
        <View style={styles.listLoader}>
          <Text style={styles.errorText}>{state.error}</Text>
        </View>
      ) : (
        <FlashList
          data={state.characters}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={isTablet ? 2 : 1}
          key={isTablet ? "tablet-2col" : "phone-1col"}
          columnWrapperStyle={isTablet ? styles.columnWrapper : undefined}
          estimatedItemSize={140}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          drawDistance={800}
          refreshControl={
            <RefreshControl
              refreshing={state.refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !state.loading && !state.error ? (
              <View style={styles.listLoader}>
                <Text style={styles.emptyText}>No characters found</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            state.loading && state.characters.length > 0 ? (
              <ActivityIndicator
                style={styles.footerLoader}
                color={colors.accent}
              />
            ) : null
          }
        />
      )}

      <SortModal
        ref={sortModalRef}
        currentSort={sortMode}
        onSelect={handleSortSelect}
      />
      <TagsModal
        ref={tagsModalRef}
        mergedTags={mergedTags}
        selectedTagIds={selectedTagIds}
        onToggleTag={toggleTag}
        onApply={handleApplyTags}
      />
      <FilterModal
        ref={filterModalRef}
        filters={filters}
        onApply={handleApplyFilters}
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
  searchInput: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    color: colors.text,
    fontSize: 15,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
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
  columnWrapper: {
    gap: 12,
    paddingHorizontal: 20,
  },
});
