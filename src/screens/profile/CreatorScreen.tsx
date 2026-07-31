import React, {
  useEffect,
  useReducer,
  useCallback,
  useRef,
  useMemo,
  useState,
} from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  RefreshControl,
  ScrollView,
  Alert,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import {
  useRoute,
  useNavigation,
  type RouteProp,
} from "@react-navigation/native";
import { useAuthStore } from "../../stores/authStore";
import Avatar from "../../components/common/Avatar";
import AvatarPreview from "../../components/common/AvatarPreview";
import CharacterCard from "../../components/character/CharacterCard";
import CharacterDiscoverActionsSheet from "../../components/character/CharacterDiscoverActionsSheet";
import CharacterReportModal from "../../components/character/CharacterReportModal";
import CustomAlert, {
  type AlertButton,
} from "../../components/common/CustomAlert";
import { getProfile, followUser, unfollowUser, getMyFollowing, getBlockedContent, updateBlockedContent } from "../../api/profile";
import { getCharacters } from "../../api/characters";
import type { CharacterSearchParams } from "../../api/characters";
import { stripHtml } from "../../utils/markdown";
import { assetUrl, avatarUrl } from "../../utils/assets";
import { colors } from "../../utils/colors";
import { useIsTablet } from "../../hooks/useIsTablet";
import type {
  UserProfile,
  TrendingCharacter,
  TrendingResponse,
} from "../../types/api";
import type { CharactersStackParamList } from "../../navigation/types";
import FilterModal, {
  type FilterModalHandle,
} from "../../components/discover/FilterModal";
import { type FilterState, INITIAL_FILTERS } from "../../utils/discover";
import AdvancedSearchModal from "../../components/discover/AdvancedSearchModal";
import { BadgeCheck, CirclePlus, Search, SlidersHorizontal } from "lucide-react-native";

type Route = RouteProp<CharactersStackParamList, "CreatorScreen">;

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
  | { type: "ERROR"; payload: string };

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
    default:
      return state;
  }
}

const ProfileSection = React.memo(function ProfileSection({
  profile,
  isTablet,
  aboutExpanded,
  onToggleAbout,
  onAvatarPress,
  followerCount,
  characterCount,
  isOwnProfile,
  isFollowing,
  followingLoading,
  userId,
  setIsFollowing,
  setFollowerCount,
  setFollowingLoading,
}: {
  profile: UserProfile;
  isTablet: boolean;
  aboutExpanded: boolean;
  onToggleAbout: () => void;
  onAvatarPress: () => void;
  followerCount: number;
  characterCount: number;
  isOwnProfile: boolean;
  isFollowing: boolean;
  followingLoading: boolean;
  userId: string;
  setIsFollowing: React.Dispatch<React.SetStateAction<boolean>>;
  setFollowerCount: React.Dispatch<React.SetStateAction<number>>;
  setFollowingLoading: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const handleToggleFollow = useCallback(async () => {
    if (followingLoading) return;
    setFollowingLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(userId);
        setIsFollowing(false);
        setFollowerCount((c) => Math.max(0, c - 1));
      } else {
        await followUser(userId);
        setIsFollowing(true);
        setFollowerCount((c) => c + 1);
      }
    } catch {
      Alert.alert("Error", "Failed to update follow status");
    } finally {
      setFollowingLoading(false);
    }
  }, [userId, isFollowing, followingLoading, setIsFollowing, setFollowerCount, setFollowingLoading]);

  return (
    <View style={[styles.profileSection, isTablet && { paddingTop: 0 }]}>
      <Pressable onPress={onAvatarPress}>
        <Avatar
          uri={profile.avatar ? avatarUrl(profile.avatar) : undefined}
          name={profile.name}
          size={80}
        />
      </Pressable>
      <Text style={styles.profileName}>{profile.name || `@${profile.user_name}`}</Text>
      {profile.user_name ? (
        <Text style={styles.profileUsername}>@{profile.user_name}</Text>
      ) : null}
      {profile.is_verified && (
        <View style={styles.verifiedRow}>
          <BadgeCheck size={14} color={colors.accent} />
          <Text style={styles.profileVerified}> Verified</Text>
        </View>
      )}
      {profile.subscriber_badge && (
        <View style={styles.subBadge}>
          <CirclePlus size={14} color={colors.accent} />
          <Text style={styles.subBadgeText}> Subscriber</Text>
        </View>
      )}
      {profile.about_me ? (
        <View style={styles.aboutSection}>
          <View style={!aboutExpanded && styles.aboutCollapsed}>
            <Text style={styles.profileAbout}>
              {stripHtml(profile.about_me)}
            </Text>
          </View>
          <Pressable style={styles.showMoreBtn} onPress={onToggleAbout}>
            <Text style={styles.showMoreText}>
              {aboutExpanded ? "Show less" : "Show more"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {profile.badges && profile.badges.length > 0 && (
        <View style={styles.badgesRow}>
          {profile.badges.map((b) => (
            <View key={b.id} style={styles.badge}>
              <Avatar uri={assetUrl(b.img)} size={24} />
              <Text style={styles.badgeTitle}>{b.title}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{followerCount}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{characterCount}</Text>
          <Text style={styles.statLabel}>Characters</Text>
        </View>
      </View>

      {!isOwnProfile && (
        <Pressable
          onPress={handleToggleFollow}
          disabled={followingLoading}
          style={({ pressed }) => [
            styles.followBtn,
            isFollowing && styles.followingBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text
            style={[
              styles.followBtnText,
              isFollowing && styles.followingBtnText,
            ]}
          >
            {followingLoading
              ? "..."
              : isFollowing
                ? "Following"
                : "Follow"}
          </Text>
        </Pressable>
      )}
    </View>
  );
});

const FilterRow = React.memo(function FilterRow({
  onOpenFilters,
  onOpenAdvanced,
}: {
  onOpenFilters: () => void;
  onOpenAdvanced: () => void;
}) {
  return (
    <View style={styles.filterRow}>
      <Pressable
        onPress={onOpenFilters}
        style={({ pressed }) => [
          styles.filterBtn,
          pressed && { opacity: 0.7 },
        ]}
      >
        <SlidersHorizontal size={16} color={colors.accent} />
        <Text style={styles.filterBtnText}>Filters</Text>
      </Pressable>
      <Pressable
        onPress={onOpenAdvanced}
        style={({ pressed }) => [
          styles.filterBtn,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Search size={16} color={colors.accent} />
        <Text style={styles.filterBtnText}>Advanced</Text>
      </Pressable>
    </View>
  );
});

function CharacterList({
  characters,
  loading,
  refreshing,
  onRefresh,
  onEndReached,
  isTablet,
  profileSection,
  filterRow,
  navigate,
  characterScreenName,
  onLongPress,
}: {
  characters: TrendingCharacter[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  isTablet: boolean;
  profileSection: React.ReactElement;
  filterRow: React.ReactElement;
  navigate: (name: string, params?: any) => void;
  characterScreenName: string;
  onLongPress: (item: TrendingCharacter) => void;
}) {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

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

  const renderItem = useCallback(
    ({ item }: { item: TrendingCharacter }) => (
      <CharacterCard
        character={item}
        onPress={() =>
          navigate(characterScreenName, {
            characterId: item.id,
            characterName: item.name,
          })
        }
        onLongPress={() => onLongPress(item)}
        hidden={hiddenIds.has(item.id)}
        onToggleHidden={() => handleToggleHidden(item.id)}
      />
    ),
    [navigate, characterScreenName, onLongPress, hiddenIds, handleToggleHidden],
  );

  return (
    <FlashList
      data={characters}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      style={styles.flashlist}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
        />
      }
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        isTablet ? filterRow : (
          <>
            {profileSection}
            {filterRow}
          </>
        )
      }
      ListFooterComponent={
        loading && characters.length > 0 ? (
          <ActivityIndicator
            style={styles.footerLoader}
            color={colors.accent}
          />
        ) : null
      }
    />
  );
}

const ScreenModals = React.memo(function ScreenModals({
  navigate,
  characterScreenName,
  longPressCharacter,
  actionsVisible,
  reportVisible,
  alertVisible,
  alertTitle,
  alertMessage,
  alertButtons,
  preview,
  setPreview,
  setActionsVisible,
  setReportVisible,
  setAlertVisible,
  setAlertTitle,
  setAlertMessage,
  setAlertButtons,
}: {
  navigate: (name: string, params?: any) => void;
  characterScreenName: string;
  longPressCharacter: TrendingCharacter | null;
  actionsVisible: boolean;
  reportVisible: boolean;
  alertVisible: boolean;
  alertTitle: string;
  alertMessage: string;
  alertButtons: AlertButton[];
  preview: { uri: string; name: string } | null;
  setPreview: React.Dispatch<React.SetStateAction<{ uri: string; name: string } | null>>;
  setActionsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setReportVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setAlertVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setAlertTitle: React.Dispatch<React.SetStateAction<string>>;
  setAlertMessage: React.Dispatch<React.SetStateAction<string>>;
  setAlertButtons: React.Dispatch<React.SetStateAction<AlertButton[]>>;
}) {
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
  }, [longPressCharacter, setAlertTitle, setAlertMessage, setAlertButtons, setAlertVisible]);

  const handleReportCharacter = useCallback(() => {
    setActionsVisible(false);
    setReportVisible(true);
  }, [setActionsVisible, setReportVisible]);

  const handleActionsClose = useCallback(() => {
    setActionsVisible(false);
  }, [setActionsVisible]);

  const handleAlertDismiss = useCallback(() => setAlertVisible(false), [setAlertVisible]);

  const handleCloseReport = useCallback(() => {
    setReportVisible(false);
  }, [setReportVisible]);

  return (
    <>
      <AvatarPreview
        visible={preview !== null}
        uri={preview?.uri ?? ""}
        onClose={() => setPreview(null)}
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
    </>
  );
});

function ProfileState({ loading, error }: { loading: boolean; error: string | null }) {
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }
  return (
    <View style={styles.centered}>
      <Text style={styles.errorText}>{error || "Profile not found"}</Text>
    </View>
  );
}

export default function CreatorScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<any>();
  const { navigate, goBack } = navigation;
  const { userId } = route.params;
  const isTablet = useIsTablet();

  const characterScreenName = useMemo(() => {
    try {
      const routes = navigation.getState()?.routeNames ?? [];
      if (routes.includes("ChatCharacter")) return "ChatCharacter";
      if (routes.includes("ProfileCharacterScreen"))
        return "ProfileCharacterScreen";
      return "CharacterScreen";
    } catch {
      return "CharacterScreen";
    }
  }, [navigation.getState]);

  const currentUser = useAuthStore((s) => s.user);
  const isOwnProfile = currentUser?.id === userId;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [preview, setPreview] = useState<{ uri: string; name: string } | null>(
    null,
  );

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const filtersRef = useRef<FilterState>(INITIAL_FILTERS);
  const filterModalRef = useRef<FilterModalHandle>(null);

  const [advancedKeywords, setAdvancedKeywords] = useState<string[]>([]);
  const [advancedBlacklist, setAdvancedBlacklist] = useState<string[]>([]);
  const [keywordMatchMode, setKeywordMatchMode] = useState<"any" | "all">(
    "any",
  );
  const [advancedSearchVisible, setAdvancedSearchVisible] = useState(false);
  const [hideDarkened, setHideDarkened] = useState(false);

  const [longPressCharacter, setLongPressCharacter] = useState<TrendingCharacter | null>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertButtons, setAlertButtons] = useState<AlertButton[]>([]);

  const [list, dispatch] = useReducer(listReducer, {
    characters: [],
    page: 1,
    loading: true,
    refreshing: false,
    total: 0,
    error: null,
  });
  const pageRef = useRef(1);

  useEffect(() => {
    let cancelled = false;
    const fetchProfile = async () => {
      try {
        const [profile, following] = await Promise.all([
          getProfile(userId),
          isOwnProfile ? Promise.resolve([]) : getMyFollowing().catch(() => []),
        ]);
        if (cancelled) return;
        setProfile(profile);
        setFollowerCount(parseInt(profile.followers_count ?? "0", 10) || 0);
        setIsFollowing(following.some((f) => f.user_id === userId));
      } catch (err: any) {
        if (!cancelled) setProfileError(err.message || "Failed to load profile");
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [userId, isOwnProfile]);

  const doFetch = useCallback(
    async (pageNum: number, isRefresh = false) => {
      if (isRefresh) dispatch({ type: "REFRESHING" });
      else dispatch({ type: "LOADING" });

      try {
        const params: CharacterSearchParams = {
          page: pageNum,
          sort: "latest",
          user_id: [userId],
        };

        const currentFilters = filtersRef.current;
        if (currentFilters.messages && Number(currentFilters.messages) > 0) {
          params.messages = Number(currentFilters.messages);
          params.messages_mode = currentFilters.messagesMode;
        }
        if (currentFilters.tokens && Number(currentFilters.tokens) > 0) {
          params.tokens = Number(currentFilters.tokens);
          params.tokens_mode = currentFilters.tokensMode;
        }
        if (currentFilters.proxyOnly) {
          params.is_proxy_enabled = true;
        }
        params.mode = currentFilters.limitlessMode ? "all" : "sfw";

        const response: TrendingResponse = await getCharacters(params);
        dispatch({
          type: "LOADED",
          payload: {
            data: response.data,
            total: response.total,
            page: pageNum,
          },
        });
        pageRef.current = pageNum;
      } catch (err: any) {
        dispatch({ type: "ERROR", payload: err.message });
      }
    },
    [userId],
  );

  useEffect(() => {
    doFetch(1);
  }, [doFetch]);

  const handleLoadMore = useCallback(() => {
    if (!list.loading && list.characters.length < list.total) {
      doFetch(pageRef.current + 1);
    }
  }, [list.loading, list.characters.length, list.total, doFetch]);

  const handleRefresh = useCallback(() => {
    doFetch(1, true);
  }, [doFetch]);

  const handleApplyFilters = useCallback(
    (newFilters: FilterState) => {
      setFilters(newFilters);
      filtersRef.current = newFilters;
      doFetch(1);
    },
    [doFetch],
  );

  const handleLongPress = useCallback((item: TrendingCharacter) => {
    setLongPressCharacter(item);
    setActionsVisible(true);
  }, []);

  const handleToggleAbout = useCallback(() => {
    setAboutExpanded((e) => !e);
  }, []);

  const handleAvatarPress = useCallback(() => {
    if (!profile) return;
    setPreview({
      uri: avatarUrl(profile.avatar),
      name: profile.name,
    });
  }, [profile]);

  const handleOpenFilters = useCallback(() => {
    filterModalRef.current?.open();
  }, []);

  const handleOpenAdvanced = useCallback(() => {
    setAdvancedSearchVisible(true);
  }, []);

  if (profileLoading || profileError || !profile) {
    return <ProfileState loading={profileLoading} error={profileError} />;
  }

  const profileSection = (
    <ProfileSection
      profile={profile}
      isTablet={isTablet}
      aboutExpanded={aboutExpanded}
      onToggleAbout={handleToggleAbout}
      onAvatarPress={handleAvatarPress}
      followerCount={followerCount}
      characterCount={list.total}
      isOwnProfile={isOwnProfile}
      isFollowing={isFollowing}
      followingLoading={followingLoading}
      userId={userId}
      setIsFollowing={setIsFollowing}
      setFollowerCount={setFollowerCount}
      setFollowingLoading={setFollowingLoading}
    />
  );

  const filterRow = (
    <FilterRow
      onOpenFilters={handleOpenFilters}
      onOpenAdvanced={handleOpenAdvanced}
    />
  );

  const characterList = (
    <CharacterList
      characters={list.characters}
      loading={list.loading}
      refreshing={list.refreshing}
      onRefresh={handleRefresh}
      onEndReached={handleLoadMore}
      isTablet={isTablet}
      profileSection={profileSection}
      filterRow={filterRow}
      navigate={navigate}
      characterScreenName={characterScreenName}
      onLongPress={handleLongPress}
    />
  );

  return (
    <View style={styles.container}>
      <Pressable style={styles.backBtn} onPress={goBack}>
        <Text style={styles.backText}>{"\u2190"} Back</Text>
      </Pressable>
      {isTablet ? (
        <View style={styles.tabletRow}>
          <ScrollView
            style={styles.tabletLeft}
            contentContainerStyle={styles.tabletLeftInner}
            showsVerticalScrollIndicator={false}
          >
            {profileSection}
          </ScrollView>
          <View style={styles.tabletRight}>{characterList}</View>
        </View>
      ) : (
        characterList
      )}
      <FilterModal
        ref={filterModalRef}
        filters={filters}
        onApply={handleApplyFilters}
      />
      <AdvancedSearchModal
        key={advancedSearchVisible ? "open" : "closed"}
        visible={advancedSearchVisible}
        keywords={advancedKeywords}
        blacklisted={advancedBlacklist}
        matchMode={keywordMatchMode}
        hideDarkened={hideDarkened}
        onKeywordsChange={setAdvancedKeywords}
        onBlacklistedChange={setAdvancedBlacklist}
        onMatchModeChange={setKeywordMatchMode}
        onHideDarkenedChange={setHideDarkened}
        onClose={() => setAdvancedSearchVisible(false)}
      />
      <ScreenModals
        navigate={navigate}
        characterScreenName={characterScreenName}
        longPressCharacter={longPressCharacter}
        actionsVisible={actionsVisible}
        reportVisible={reportVisible}
        alertVisible={alertVisible}
        alertTitle={alertTitle}
        alertMessage={alertMessage}
        alertButtons={alertButtons}
        preview={preview}
        setPreview={setPreview}
        setActionsVisible={setActionsVisible}
        setReportVisible={setReportVisible}
        setAlertVisible={setAlertVisible}
        setAlertTitle={setAlertTitle}
        setAlertMessage={setAlertMessage}
        setAlertButtons={setAlertButtons}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabletRow: { flex: 1, flexDirection: "row", gap: 20, paddingHorizontal: 20 },
  tabletLeft: { flex: 1 },
  tabletLeftInner: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 20,
  },
  tabletRight: { flex: 1 },
  backBtn: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 8 },
  backText: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  listContent: { paddingBottom: 80 },
  flashlist: { flex: 1 },
  profileSection: { alignItems: "center", padding: 20, paddingTop: 60 },
  profileName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 12,
  },
  profileUsername: { color: colors.textDim, fontSize: 14, marginTop: 2 },
  profileVerified: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  subBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accentFaded,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "rgba(124, 92, 231, 0.3)",
  },
  subBadgeText: { color: colors.accent, fontSize: 11, fontWeight: "600" },
  profileAbout: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  aboutSection: {
    width: "100%",
    marginTop: 12,
    alignItems: "center",
  },
  aboutCollapsed: {
    maxHeight: 300,
    overflow: "hidden",
  },
  showMoreBtn: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  showMoreText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    justifyContent: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeTitle: { color: colors.textSecondary, fontSize: 13 },
  statsRow: { marginTop: 16, flexDirection: "row", gap: 32 },
  statItem: { alignItems: "center" },
  statValue: { color: colors.text, fontSize: 20, fontWeight: "700" },
  statLabel: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  filterRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  filterBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  footerLoader: { paddingVertical: 20 },
  errorText: { color: colors.danger, fontSize: 16 },
  followBtn: {
    marginTop: 16,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 32,
  },
  followingBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  followBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  followingBtnText: {
    color: colors.accent,
  },
});
