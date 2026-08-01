import React from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SlidersHorizontal, Filter } from "lucide-react-native";
import CharacterDiscoverActionsSheet from "../../../components/character/CharacterDiscoverActionsSheet";
import CharacterReportModal from "../../../components/character/CharacterReportModal";
import CustomAlert, {
    type AlertButton,
} from "../../../components/common/CustomAlert";
import AdvancedSearchModal from "../../../components/discover/AdvancedSearchModal";
import FilterModal, {
    type FilterModalHandle,
} from "../../../components/discover/FilterModal";
import SortModal, {
    type SortModalHandle,
} from "../../../components/discover/SortModal";
import TagsModal, {
    type TagEntry,
    type TagsModalHandle,
} from "../../../components/discover/TagsModal";
import type { FilterState } from "../../../utils/discover";
import { colors } from "../../../utils/colors";

export const SearchHeader = React.memo(function SearchHeader({
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

            <Pressable style={styles.controlButtonIcon} onPress={onOpenFilters}>
                <Filter size={18} color={colors.textSecondary} />
            </Pressable>
        </View>
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

const styles = StyleSheet.create({
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
});
