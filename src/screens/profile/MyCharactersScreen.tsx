import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { FlashList } from "@shopify/flash-list";
import ScreenHeader from "../../components/common/ScreenHeader";
import EmptyState from "../../components/common/EmptyState";
import { useRefreshControl } from "../../components/common/useRefreshControl";
import CharacterCard from "../../components/character/CharacterCard";
import CharacterDiscoverActionsSheet from "../../components/character/CharacterDiscoverActionsSheet";
import CharacterReportModal from "../../components/character/CharacterReportModal";
import CustomAlert from "../../components/common/CustomAlert";
import { useAlert } from "../../hooks/useAlert";
import { getMyCharacters } from "../../api/characters";
import {
  useLongPressActions,
  useBlockAlert,
} from "../characters/characterSearch/hooks";
import type { ProfileStackParamList } from "../../navigation/types";
import type { TrendingCharacter } from "../../types/api";
import { colors } from "../../utils/colors";

type Nav = NativeStackNavigationProp<ProfileStackParamList, "MyCharacters">;

type PrivacyFilter = "all" | "public" | "private";

const FILTER_OPTIONS: { key: PrivacyFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "public", label: "Public" },
  { key: "private", label: "Private" },
];

const ANDROID_SPINNER_COLORS = [colors.accent];

export default function MyCharactersScreen() {
  const { navigate, goBack } = useNavigation<Nav>();
  const [characters, setCharacters] = useState<TrendingCharacter[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const [filter, setFilter] = useState<PrivacyFilter>("all");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const { alert, showAlert, dismissAlert } = useAlert();
  const showBlockAlert = useBlockAlert(showAlert, dismissAlert, (id) =>
    setCharacters((prev) => prev.filter((c) => c.id !== id)),
  );
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
  } = useLongPressActions(navigate, "ProfileCharacterScreen");

  const filterLabel = useMemo(
    () => FILTER_OPTIONS.find((o) => o.key === filter)?.label ?? "All",
    [filter],
  );

  const fetchCharacters = useCallback(
    async (pageNum: number, privacyFilter: PrivacyFilter, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      }
      try {
        const params: { page: number; is_public?: boolean } = {
          page: pageNum,
        };
        if (privacyFilter === "public") {
          params.is_public = true;
        } else if (privacyFilter === "private") {
          params.is_public = false;
        }
        const result = await getMyCharacters(params);
        if (append) {
          setCharacters((prev) => [...prev, ...result.data]);
        } else {
          setCharacters(result.data);
        }
        pageRef.current = pageNum;
        hasMoreRef.current = result.data.length > 0;
      } catch {
      } finally {
        setInitialLoad(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchCharacters(1, filter, false);
  }, [filter, fetchCharacters]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMoreRef.current) return;
    fetchCharacters(pageRef.current + 1, filter, true);
  }, [loadingMore, filter, fetchCharacters]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCharacters(1, filter, false).finally(() => setRefreshing(false));
  }, [filter, fetchCharacters]);

  const refreshControl = useRefreshControl(
    refreshing,
    handleRefresh,
    ANDROID_SPINNER_COLORS,
  );

  const handleFilterSelect = useCallback((key: PrivacyFilter) => {
    setFilter(key);
    setFilterModalVisible(false);
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

  const handleBlockCharacter = useCallback(() => {
    if (!longPressCharacter) return;
    showBlockAlert(longPressCharacter);
  }, [longPressCharacter, showBlockAlert]);

  const renderItem = useCallback(
    ({ item }: { item: TrendingCharacter }) => (
      <CharacterCard
        character={item}
        onPress={() =>
          navigate("ProfileCharacterScreen", {
            characterId: item.id,
            characterName: item.name,
          })
        }
        onLongPress={() => handleLongPress(item)}
        hidden={hiddenIds.has(item.id)}
        onToggleHidden={() => handleToggleHidden(item.id)}
      />
    ),
    [navigate, handleLongPress, hiddenIds, handleToggleHidden],
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <ActivityIndicator
        color={colors.accent}
        style={styles.loadingMore}
        size="small"
      />
    );
  }, [loadingMore]);

  const renderEmpty = useCallback(() => {
    if (initialLoad) return null;
    return (
      <EmptyState
        text="No characters found"
        containerStyle={styles.emptyContainer}
      />
    );
  }, [initialLoad]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="My Characters" onBack={goBack} />
      <View style={styles.filterRow}>
        <Pressable
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Text style={styles.filterButtonText}>
            {filterLabel} {"▼"}
          </Text>
        </Pressable>
      </View>
      {initialLoad ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlashList
          data={characters}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          drawDistance={2000}
          overrideProps={{ initialDrawBatchSize: 50 }}
          refreshControl={refreshControl}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFilterModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter</Text>
            {FILTER_OPTIONS.map((option) => (
              <Pressable
                key={option.key}
                style={[
                  styles.modalOption,
                  filter === option.key && styles.modalOptionActive,
                ]}
                onPress={() => handleFilterSelect(option.key)}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    filter === option.key && styles.modalOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

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
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        onDismiss={dismissAlert}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 20,
  },
  loadingMore: {
    paddingVertical: 16,
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayMedium,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    width: "70%",
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  modalOptionActive: {
    backgroundColor: colors.accentFaded,
  },
  modalOptionText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "500",
  },
  modalOptionTextActive: {
    color: colors.accent,
    fontWeight: "700",
  },
});
