import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  type DimensionValue,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import {
  User,
  Settings,
  MessageSquare,
  Users,
  ChevronRight,
} from "lucide-react-native";
import Avatar from "../../components/common/Avatar";
import { useAuthStore } from "../../stores/authStore";
import { getMyProfile } from "../../api/profile";
import type { UserProfile } from "../../types/api";
import type { ProfileStackParamList } from "../../navigation/types";
import { useIsTablet } from "../../hooks/useIsTablet";
import { colors } from "../../utils/colors";
import { assetUrl, avatarUrl } from "../../utils/assets";

type Nav = NativeStackNavigationProp<ProfileStackParamList, "ProfileHome">;

const SKELETON_BASE = "#1e1e35";

// ---- Skeleton ----

function SkeletonBlock({
  width,
  height,
  borderRadius = 8,
}: {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
}) {
  const opacity = useSharedValue(0.25);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.5, { duration: 800 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={{ width, height, overflow: "hidden" }}>
      <Animated.View
        style={[
          { flex: 1, borderRadius, backgroundColor: SKELETON_BASE },
          animatedStyle,
        ]}
      />
    </View>
  );
}

// ---- Menu Item ----

function MenuItem({
  icon: Icon,
  title,
  description,
  onPress,
}: {
  icon: typeof User;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        pressed && styles.menuItemPressed,
      ]}
    >
      <View style={styles.menuIconBox}>
        <Icon color={colors.accentLight} size={22} />
      </View>
      <View style={styles.menuBody}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuDesc}>{description}</Text>
      </View>
      <ChevronRight color={colors.textDim} size={18} />
    </Pressable>
  );
}

// ---- Screen ----

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const { navigate } = useNavigation<Nav>();
  const isTablet = useIsTablet();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const data = await getMyProfile();
      setProfile(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to load profile");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const handleRetry = useCallback(() => {
    setError(null);
    loadProfile();
  }, [loadProfile]);

  const isLoading = profile === null && error === null;
  const displayName =
    profile?.name || user?.user_metadata?.email || user?.email || "User";
  const username = profile?.user_name || "";
  const avatar = profile?.avatar ? avatarUrl(profile.avatar) : "";

  const leftColumn = (
    <View style={isTablet ? styles.column : undefined}>
      {/* Header */}
      {isLoading ? (
        <View style={styles.headerSkeleton}>
          <SkeletonBlock width={80} height={80} borderRadius={40} />
          <SkeletonBlock width={140} height={22} borderRadius={6} />
          <SkeletonBlock width={90} height={14} borderRadius={6} />
        </View>
      ) : (
        <View style={styles.header}>
          <Avatar uri={avatar} name={displayName} size={80} />
          <Text style={styles.name}>{displayName}</Text>
          {username ? <Text style={styles.username}>@{username}</Text> : null}
          {profile?.is_verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>{"\u2713"} Verified</Text>
            </View>
          )}
        </View>
      )}

      {/* Badges */}
      {isLoading ? (
        <View style={styles.section}>
          <SkeletonBlock width={60} height={12} borderRadius={4} />
          <View style={styles.badgesRow}>
            <SkeletonBlock width={80} height={44} borderRadius={8} />
            <SkeletonBlock width={80} height={44} borderRadius={8} />
          </View>
        </View>
      ) : profile?.badges && profile.badges.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <View style={styles.badgesRow}>
            {profile.badges.map((badge) => (
              <View key={badge.id} style={styles.badge}>
                <Avatar uri={assetUrl(badge.img)} size={32} />
                <Text style={styles.badgeTitle}>{badge.title}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Account Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {isLoading ? (
          <>
            <SkeletonBlock width="100%" height={48} borderRadius={10} />
            <View style={{ height: 8 }} />
            <SkeletonBlock width="100%" height={48} borderRadius={10} />
          </>
        ) : (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || "N/A"}</Text>
            </View>
            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={styles.infoLabel}>Subscription</Text>
              <Text style={styles.infoValue}>
                {profile?.subscription?.active ? "Active" : "Free"}
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );

  const rightColumn = (
    <View style={isTablet ? styles.column : undefined}>
      {/* Navigation Menu */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Navigate</Text>
        <MenuItem
          icon={User}
          title="View Profile"
          description="See your public profile as others see it"
          onPress={() => {
            const userId = user?.id;
            const userName = profile?.name || displayName;
            if (userId) navigate("ProfileCreatorScreen", { userId, userName });
          }}
        />
        <MenuItem
          icon={MessageSquare}
          title="My Characters"
          description="Manage your created characters"
          onPress={() => navigate("MyCharacters")}
        />
        <MenuItem
          icon={Users}
          title="My Personas"
          description="Manage your personas and groups"
          onPress={() => navigate("MyPersonas")}
        />
      </View>

      <View style={styles.section}>
        <MenuItem
          icon={Settings}
          title="Settings"
          description="App preferences and account settings"
          onPress={() => navigate("Settings")}
        />
      </View>
    </View>
  );

  if (error) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.errorContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={handleRetry}
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        isTablet && styles.contentTablet,
        isTablet && { flexGrow: 1, justifyContent: "center" },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {isTablet ? (
        <View style={styles.tabletRow}>
          {leftColumn}
          {rightColumn}
        </View>
      ) : (
        <>
          {leftColumn}
          {rightColumn}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  contentTablet: {
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  errorContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  errorWrap: {
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  tabletRow: {
    flexDirection: "row",
    gap: 24,
  },
  column: {
    flex: 1,
  },

  /* Header */

  header: {
    alignItems: "center",
  },
  headerSkeleton: {
    alignItems: "center",
    gap: 12,
  },
  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 16,
  },
  username: {
    color: colors.textDim,
    fontSize: 14,
    marginTop: 4,
  },
  verifiedBadge: {
    marginTop: 4,
  },
  verifiedText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },

  /* Section */

  section: {
    marginTop: 28,
  },
  sectionTitle: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  /* Badges */

  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeTitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },

  /* Account Info */

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRowLast: {
    marginBottom: 0,
  },
  infoLabel: {
    color: colors.textFaint,
    fontSize: 14,
  },
  infoValue: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },

  /* Menu Items */

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuItemPressed: {
    opacity: 0.7,
    borderColor: colors.borderLight,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.accentFaded,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  menuBody: {
    flex: 1,
  },
  menuTitle: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  menuDesc: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
});
