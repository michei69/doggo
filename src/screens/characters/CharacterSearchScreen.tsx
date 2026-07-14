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
import CharacterDiscoverActionsSheet from "../../components/character/CharacterDiscoverActionsSheet";
import CharacterReportModal from "../../components/character/CharacterReportModal";
import { getCharacters, getTags } from "../../api/characters";
import { getBlockedContent, updateBlockedContent } from "../../api/profile";
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
import { SlidersHorizontal, Filter } from "lucide-react-native";
import AdvancedSearchModal from "../../components/discover/AdvancedSearchModal";
import CustomAlert, {
  type AlertButton,
} from "../../components/common/CustomAlert";

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
  const loadingMoreRef = useRef(false);

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

  const [advancedKeywords, setAdvancedKeywords] = useState<string[]>([]);
  const [advancedBlacklist, setAdvancedBlacklist] = useState<string[]>([]);
  const [keywordMatchMode, setKeywordMatchMode] = useState<"any" | "all">(
    "any",
  );
  const [advancedSearchVisible, setAdvancedSearchVisible] = useState(false);

  const [longPressCharacter, setLongPressCharacter] = useState<TrendingCharacter | null>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertButtons, setAlertButtons] = useState<AlertButton[]>([]);

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
      storage.setHiddenCharacters([...next]);
      return next;
    });
  }, []);

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

      loadingMoreRef.current = false;
    } catch (err: any) {
      loadingMoreRef.current = false;
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
    if (loadingMoreRef.current) return;
    if (!state.loading && state.characters.length < state.total) {
      loadingMoreRef.current = true;
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

  const hasAdvancedFilters =
    advancedKeywords.length > 0 || advancedBlacklist.length > 0;

  const displayCharacters = useMemo(() => {
    let result = state.characters;
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
    return result;
  }, [state.characters, advancedKeywords, advancedBlacklist, keywordMatchMode]);

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

  const handleBlockCharacter = useCallback(() => {
    if (!longPressCharacter) return;
    setAlertTitle("Block Character");
    setAlertMessage(
      `Block "${longPressCharacter.name}"? Hidden characters won't appear in your discover feed.`,
    );
    setAlertButtons([
      {
        text: "Block",
        style: "destructive",
        onPress: async () => {
          setAlertVisible(false);
          try {
            const blocked = await getBlockedContent();
            if (!blocked.bots.includes(longPressCharacter.id)) {
              blocked.bots.push(longPressCharacter.id);
            }
            await updateBlockedContent(blocked);
          } catch {}
        },
      },
      { text: "Cancel", style: "cancel", onPress: () => setAlertVisible(false) },
    ]);
    setAlertVisible(true);
  }, [longPressCharacter]);

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

  const handleAlertDismiss = useCallback(() => setAlertVisible(false), []);

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
        onLongPress={() => handleLongPress(item)}
        hidden={hiddenIds.has(item.id)}
        onToggleHidden={() => handleToggleHidden(item.id)}
        style={isTablet ? styles.cardTablet : undefined}
      />
    ),
    [navigate, isTablet, handleLongPress, hiddenIds, handleToggleHidden],
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
        {hasAdvancedFilters
          ? `${displayCharacters.length.toLocaleString()} / ${state.total.toLocaleString()} characters`
          : `${state.total.toLocaleString()} characters`}
      </Text>

      <View style={styles.searchRow}>
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
        <Pressable
          style={styles.advancedButton}
          onPress={() => setAdvancedSearchVisible(true)}
        >
          <SlidersHorizontal size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

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
          <Filter size={18} color={colors.textSecondary} />
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
          data={displayCharacters}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={isTablet ? 2 : 1}
          key={isTablet ? "tablet-2col" : "phone-1col"}
          columnWrapperStyle={isTablet ? styles.columnWrapper : undefined}
          estimatedItemSize={260}
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
      <AdvancedSearchModal
        visible={advancedSearchVisible}
        keywords={advancedKeywords}
        blacklisted={advancedBlacklist}
        matchMode={keywordMatchMode}
        onKeywordsChange={setAdvancedKeywords}
        onBlacklistedChange={setAdvancedBlacklist}
        onMatchModeChange={setKeywordMatchMode}
        onClose={() => setAdvancedSearchVisible(false)}
      />

      <CharacterDiscoverActionsSheet
        visible={actionsVisible}
        characterName={longPressCharacter?.name || ""}
        hasCreator={!!longPressCharacter?.creator_id}
        onClose={handleActionsClose}
        onViewCharacter={handleViewCharacter}
        onViewCreator={handleViewCreator}
        onBlockCharacter={handleBlockCharacter}
        onReportCharacter={handleReportCharacter}
      />

      <CharacterReportModal
        visible={reportVisible}
        characterId={longPressCharacter?.id ?? ""}
        onClose={handleCloseReport}
      />

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        buttons={alertButtons}
        onDismiss={handleAlertDismiss}
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
  columnWrapper: {
    gap: 12,
    paddingHorizontal: 20,
  },
});
