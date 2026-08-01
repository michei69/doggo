import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getTags } from "../../api/characters";
import FilterModal, {
  type FilterModalHandle,
} from "../../components/discover/FilterModal";
import SortModal, {
  type SortModalHandle,
} from "../../components/discover/SortModal";
import TagsModal, {
  type TagEntry,
  type TagsModalHandle,
} from "../../components/discover/TagsModal";
import { useIsTablet } from "../../hooks/useIsTablet";
import {
  SORT_OPTIONS,
  type FilterState,
} from "../../utils/discover";
import { colors } from "../../utils/colors";
import {
  CharacterList,
  CreatorList,
} from "./characterSearch/cards";
import {
  ActionOverlays,
  ControlsRow,
  DiscoverModals,
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
  mergeTags,
  type Nav,
  type SearchRoute,
} from "./characterSearch/searchUtils";

type DiscoveryMode = "characters" | "creators";

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
  const { alert, showAlert, dismissAlert } = useAlert();
  const showBlockAlert = useBlockAlert(showAlert, dismissAlert);
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
  const openAdvancedSearch = useCallback(
    () => setAdvancedSearchVisible(true),
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
