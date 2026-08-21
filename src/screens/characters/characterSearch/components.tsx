import React from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SlidersHorizontal, Filter, Globe } from "lucide-react-native";
import type { ProfileSearchResult } from "../../../types/api";
import CharacterDiscoverActionsSheet from "../../../components/character/CharacterDiscoverActionsSheet";
import CharacterReportModal from "../../../components/character/CharacterReportModal";
import CustomAlert, {
    type AlertButton,
} from "../../../components/common/CustomAlert";
import AdvancedSearchModal, {
    type AdvancedSearchModalHandle,
} from "../../../components/discover/AdvancedSearchModal";
import FilterModal, {
    type FilterModalHandle,
} from "../../../components/discover/FilterModal";
import SortModal, {
    type SortModalHandle,
} from "../../../components/discover/SortModal";
import TagsModal, {
    type TagsModalHandle,
} from "../../../components/discover/TagsModal";
import type { TagEntry, TrendingCharacter } from "../../../types/api";
import type { FilterState } from "../../../utils/discover";
import { colors } from "../../../utils/colors";
import type { DiscoveryMode } from "./searchUtils";
import { CharacterList, CreatorList } from "./cards";

export const SearchHeader = React.memo(function SearchHeader({
    discoveryMode,
    hasAdvancedFilters,
    displayCount,
    totalCount,
    creatorsTotal,
    onToggleMode,
    onOpenSwipe,
    onOpenBrowser,
}: {
    discoveryMode: DiscoveryMode;
    hasAdvancedFilters: boolean;
    displayCount: number;
    totalCount: number;
    creatorsTotal: number;
    onToggleMode: () => void;
    onOpenSwipe: () => void;
    onOpenBrowser: () => void;
}) {
    const insets = useSafeAreaInsets();
    return (
        <>
            <View style={styles.titleRow}>
                <Text style={[styles.title, { paddingTop: insets.top }]}>
                    Discover
                </Text>
                <Pressable
                    style={[styles.browserButton, { marginTop: insets.top }]}
                    onPress={onOpenBrowser}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Browse web"
                >
                    <Globe size={18} color={colors.textSecondary} />
                </Pressable>
                <Pressable
                    style={[styles.swipeButton, { marginTop: insets.top }]}
                    onPress={onOpenSwipe}
                    accessibilityRole="button"
                    accessibilityLabel="Open swipe discover"
                >
                    <Text style={styles.swipeButtonText}>Swipe</Text>
                </Pressable>
                <Pressable
                    style={[styles.modeToggle, { marginTop: insets.top }]}
                    onPress={onToggleMode}
                    accessibilityRole="button"
                    accessibilityLabel={
                        discoveryMode === "characters"
                            ? "Switch to creators"
                            : "Switch to characters"
                    }
                >
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

export const SearchInputRow = React.memo(function SearchInputRow({
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

export const ControlsRow = React.memo(function ControlsRow({
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

            <Pressable
                style={styles.controlButtonIcon}
                onPress={onOpenFilters}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel="Filter results"
            >
                <Filter size={18} color={colors.textSecondary} />
            </Pressable>
        </View>
    );
});

export const ResultsList = React.memo(function ResultsList({
    discoveryMode,
    characters,
    renderItem,
    isTablet,
    refreshing,
    onRefresh,
    onEndReached,
    loading,
    error,
    hasMore,
    creators,
    renderCreatorItem,
    refreshingCreators,
    onEndReachedCreators,
    loadingCreators,
    hasMoreCreators,
}: {
    discoveryMode: DiscoveryMode;
    characters: TrendingCharacter[];
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
    creators: ProfileSearchResult[];
    renderCreatorItem: ({
        item,
    }: {
        item: ProfileSearchResult;
    }) => React.ReactElement;
    refreshingCreators: boolean;
    onEndReachedCreators: () => void;
    loadingCreators: boolean;
    hasMoreCreators: boolean;
}) {
    if (discoveryMode === "characters") {
        return (
            <CharacterList
                data={characters}
                renderItem={renderItem}
                isTablet={isTablet}
                refreshing={refreshing}
                onRefresh={onRefresh}
                onEndReached={onEndReached}
                loading={loading}
                error={error}
                hasMore={hasMore}
            />
        );
    }
    return (
        <CreatorList
            data={creators}
            renderItem={renderCreatorItem}
            refreshing={refreshingCreators}
            onRefresh={onRefresh}
            onEndReached={onEndReachedCreators}
            loading={loadingCreators}
            hasMore={hasMoreCreators}
        />
    );
});

export const DiscoverModals = React.memo(function DiscoverModals({
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

export const ActionOverlays = React.memo(function ActionOverlays({
    advancedSearchModalRef,
    advancedKeywords,
    onKeywordsChange,
    advancedBlacklist,
    onBlacklistedChange,
    keywordMatchMode,
    onMatchModeChange,
    hideDarkened,
    onHideDarkenedChange,
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
    advancedSearchModalRef: React.RefObject<AdvancedSearchModalHandle | null>;
    advancedKeywords: string[];
    onKeywordsChange: (value: string[]) => void;
    advancedBlacklist: string[];
    onBlacklistedChange: (value: string[]) => void;
    keywordMatchMode: "any" | "all";
    onMatchModeChange: (value: "any" | "all") => void;
    hideDarkened: boolean;
    onHideDarkenedChange: (value: boolean) => void;
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
                ref={advancedSearchModalRef}
                keywords={advancedKeywords}
                blacklisted={advancedBlacklist}
                matchMode={keywordMatchMode}
                hideDarkened={hideDarkened}
                onKeywordsChange={onKeywordsChange}
                onBlacklistedChange={onBlacklistedChange}
                onMatchModeChange={onMatchModeChange}
                onHideDarkenedChange={onHideDarkenedChange}
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

const styles = StyleSheet.create({
    title: {
        color: colors.text,
        fontSize: 28,
        fontWeight: "800",
        paddingHorizontal: 20,
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
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingRight: 20,
        gap: 8,
    },
    modeToggle: {
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    modeToggleText: {
        color: colors.accent,
        fontSize: 14,
        fontWeight: "600",
    },
    swipeButton: {
        backgroundColor: colors.accent,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    swipeButtonText: {
        color: colors.background,
        fontSize: 14,
        fontWeight: "700",
    },
    browserButton: {
        marginLeft: "auto",
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 10,
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
    },
});
