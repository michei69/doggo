import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getTags } from "../../api/characters";
import type { AdvancedSearchModalHandle } from "../../components/discover/AdvancedSearchModal";
import type { FilterModalHandle } from "../../components/discover/FilterModal";
import type { SortModalHandle } from "../../components/discover/SortModal";
import type { TagsModalHandle } from "../../components/discover/TagsModal";
import { useIsTablet } from "../../hooks/useIsTablet";
import { SORT_OPTIONS, type FilterState } from "../../utils/discover";
import { colors } from "../../utils/colors";
import {
  ActionOverlays,
  ControlsRow,
  DiscoverModals,
  ResultsList,
  SearchHeader,
  SearchInputRow,
} from "./characterSearch/components";
import {
  useAdvancedSearch,
  useBlockAlert,
  useCharacterCardRenderer,
  useCharactersList,
  useCreators,
  useCreatorCardRenderer,
  useDiscoverState,
  useHiddenCharacters,
  useLongPressActions,
} from "./characterSearch/hooks";
import { useAlert } from "../../hooks/useAlert";
import {
  filterDisplayCharacters,
  buildSwipeParams,
  mergeTags,
  tagsToTagEntries,
  type DiscoveryMode,
  type Nav,
  type SearchRoute,
} from "./characterSearch/searchUtils";
import type { TagEntry } from "../../types/api";

interface DiscoverSearchParams {
  sort: string;
  search: string;
  tags: Set<string>;
  filters: FilterState;
}

/**
 * Wires the discover search/sort/filter/refresh actions to the fetch layer.
 * Kept out of the screen component so the screen stays a thin composition.
 */
function useDiscoverSearch({
  doFetch,
  doFetchCreators,
  discoveryMode,
  setDiscoveryMode,
  creatorsLength,
  sortMode,
  setSortMode,
  searchText,
  setSearchText,
  filters,
  setFilters,
  selectedTagIds,
}: {
  doFetch: (
    page: number,
    params: DiscoverSearchParams,
    isRefresh?: boolean,
  ) => Promise<void>;
  doFetchCreators: (page: number, isRefresh?: boolean) => Promise<void>;
  discoveryMode: DiscoveryMode;
  setDiscoveryMode: (mode: DiscoveryMode) => void;
  creatorsLength: number;
  sortMode: string;
  setSortMode: (value: string) => void;
  searchText: string;
  setSearchText: (value: string) => void;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  selectedTagIds: Set<string>;
}) {
  const currentSearchParams = useMemo<DiscoverSearchParams>(
    () => ({
      sort: sortMode,
      search: searchText,
      tags: selectedTagIds,
      filters,
    }),
    [sortMode, searchText, selectedTagIds, filters],
  );

  // Keep a ref of the latest params so the debounced search callback
  // never reads a stale closure (setSearchText updates state async).
  const paramsRef = useRef(currentSearchParams);
  useEffect(() => {
    paramsRef.current = currentSearchParams;
  }, [currentSearchParams]);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchText(text);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        doFetch(1, { ...paramsRef.current, search: text });
      }, 500);
    },
    [setSearchText, doFetch],
  );

  const handleToggleMode = useCallback(() => {
    const next = discoveryMode === "characters" ? "creators" : "characters";
    setDiscoveryMode(next);
    if (next === "creators" && creatorsLength === 0) {
      doFetchCreators(1);
    }
  }, [discoveryMode, setDiscoveryMode, creatorsLength, doFetchCreators]);

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

  return {
    currentSearchParams,
    handleSearchChange,
    handleToggleMode,
    handleRefresh,
    handleSortSelect,
    handleApplyTags,
    handleApplyFilters,
  };
}

export default function CharacterSearchScreen() {
  const { navigate } = useNavigation<Nav>();
  const route = useRoute<SearchRoute>();
  const isTablet = useIsTablet();
  const [discoveryMode, setDiscoveryMode] =
    useState<DiscoveryMode>("characters");
  const [allTags, setAllTags] = useState<TagEntry[]>([]);
  const { hiddenIds, handleToggleHidden, handleHideCharacter } =
    useHiddenCharacters();
  const {
    filters,
    setFilters,
    searchText,
    setSearchText,
    sortMode,
    setSortMode,
    selectedTagIds,
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
  } = useAdvancedSearch();
  const { alert, showAlert, dismissAlert } = useAlert();
  const showBlockAlert = useBlockAlert(
    showAlert,
    dismissAlert,
    handleHideCharacter,
  );
  const {
    creators,
    creatorsTotal,
    creatorsLoading,
    creatorsRefreshing,
    creatorsError,
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
  const advancedSearchModalRef = useRef<AdvancedSearchModalHandle>(null);
  const openSort = useCallback(() => sortModalRef.current?.open(), []);
  const openTags = useCallback(() => tagsModalRef.current?.open(), []);
  const openFilters = useCallback(() => filterModalRef.current?.open(), []);
  const openAdvancedSearch = useCallback(
    () => advancedSearchModalRef.current?.open(),
    [],
  );

  const { state, doFetch, handleLoadMore, topCustomTags } = useCharactersList();

  const {
    currentSearchParams,
    handleSearchChange,
    handleToggleMode,
    handleRefresh,
    handleSortSelect,
    handleApplyTags,
    handleApplyFilters,
  } = useDiscoverSearch({
    doFetch,
    doFetchCreators,
    discoveryMode,
    setDiscoveryMode,
    creatorsLength: creators.length,
    sortMode,
    setSortMode,
    searchText,
    setSearchText,
    filters,
    setFilters,
    selectedTagIds,
  });

  const handleBlockCharacter = useCallback(() => {
    if (!longPressCharacter) return;
    showBlockAlert(longPressCharacter);
  }, [longPressCharacter, showBlockAlert]);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await getTags();
        setAllTags(tagsToTagEntries(tags));
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

  const handleOpenSwipe = useCallback(() => {
    navigate(
      "SwipeDiscover",
      buildSwipeParams({
        sort: sortMode,
        search: searchText,
        tags: selectedTagIds,
        filters,
        advancedKeywords,
        advancedBlacklist,
        keywordMatchMode,
      }),
    );
  }, [
    navigate,
    sortMode,
    searchText,
    selectedTagIds,
    filters,
    advancedKeywords,
    advancedBlacklist,
    keywordMatchMode,
  ]);

  const handleOpenBrowser = useCallback(() => {
    navigate("WebBrowser", {
      url: "https://jannyai.com/characters/search",
    });
  }, [navigate]);

  return (
    <View style={styles.container}>
      <SearchHeader
        discoveryMode={discoveryMode}
        hasAdvancedFilters={hasAdvancedFilters}
        displayCount={displayCharacters.length}
        totalCount={state.total}
        creatorsTotal={creatorsTotal}
        onToggleMode={handleToggleMode}
        onOpenSwipe={handleOpenSwipe}
        onOpenBrowser={handleOpenBrowser}
      />
      {discoveryMode === "characters" && (
        <>
          <SearchInputRow
            searchText={searchText}
            onSearchChange={handleSearchChange}
            onOpenAdvanced={openAdvancedSearch}
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
      <ResultsList
        discoveryMode={discoveryMode}
        characters={displayCharacters}
        renderItem={renderItem}
        isTablet={isTablet}
        refreshing={state.refreshing}
        onRefresh={handleRefresh}
        onEndReached={handleLoadMoreWrap}
        loading={state.loading}
        error={state.error}
        hasMore={state.loading && state.characters.length > 0}
        creators={creators}
        renderCreatorItem={renderCreatorItem}
        refreshingCreators={creatorsRefreshing}
        onEndReachedCreators={handleLoadMoreCreators}
        loadingCreators={creatorsLoading}
        creatorsError={creatorsError}
        hasMoreCreators={creatorsLoading && creators.length > 0}
      />
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
        advancedSearchModalRef={advancedSearchModalRef}
        advancedKeywords={advancedKeywords}
        onKeywordsChange={setAdvancedKeywords}
        advancedBlacklist={advancedBlacklist}
        onBlacklistedChange={setAdvancedBlacklist}
        keywordMatchMode={keywordMatchMode}
        onMatchModeChange={setKeywordMatchMode}
        hideDarkened={hideDarkened}
        onHideDarkenedChange={setHideDarkened}
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
        alertVisible={alert.visible}
        alertTitle={alert.title}
        alertMessage={alert.message}
        alertButtons={alert.buttons}
        onAlertDismiss={dismissAlert}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
