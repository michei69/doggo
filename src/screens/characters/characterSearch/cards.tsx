import React, { useCallback, useMemo } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Image } from "expo-image";
import { FlashList } from "@shopify/flash-list";
import type { CharacterAvatarPreview, ProfileSearchResult, TrendingCharacter } from "../../../types/api";
import Avatar from "../../../components/common/Avatar";
import EmptyState from "../../../components/common/EmptyState";
import { useRefreshControl } from "../../../components/common/useRefreshControl";
import { avatarUrl, botAvatarUrl } from "../../../utils/assets";
import { colors } from "../../../utils/colors";

export const CharacterList = React.memo(function CharacterList({
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
    const refreshControl = useRefreshControl(refreshing, onRefresh);
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
                <Pressable
                    onPress={onRefresh}
                    style={({ pressed }) => [
                        styles.retryBtn,
                        pressed && { opacity: 0.7 },
                    ]}
                >
                    <Text style={styles.retryText}>Retry</Text>
                </Pressable>
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
            refreshControl={refreshControl}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
                !loading && !error ? (
                    <EmptyState
                        text="No characters found"
                        containerStyle={styles.listLoader}
                    />
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

export const CreatorList = React.memo(function CreatorList({
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
    const refreshControl = useRefreshControl(refreshing, onRefresh);
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
            refreshControl={refreshControl}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
                !loading ? (
                    <EmptyState
                        text="No creators found"
                        containerStyle={styles.listLoader}
                    />
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

export const CreatorCard = React.memo(function CreatorCard({
    item,
    onPress,
    onPressCharacter,
}: {
    item: ProfileSearchResult;
    onPress: () => void;
    onPressCharacter: (char: CharacterAvatarPreview) => void;
}) {
    const charPreviews = useMemo(
        () => item.character_avatar_previews.slice(0, 3),
        [item.character_avatar_previews],
    );
    const renderCharPreview = useCallback(
        ({ item: char }: { item: CharacterAvatarPreview }) => (
            <CharPreviewRow char={char} onPressCharacter={onPressCharacter} />
        ),
        [onPressCharacter],
    );
    const charPreviewKeyExtractor = useCallback(
        (char: CharacterAvatarPreview) => char.id,
        [],
    );
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
                <FlashList
                    horizontal
                    data={charPreviews}
                    keyExtractor={charPreviewKeyExtractor}
                    renderItem={renderCharPreview}
                    showsHorizontalScrollIndicator={false}
                    style={styles.charPreviewScroll}
                    contentContainerStyle={styles.charPreviewContent}
                />
            )}
        </Pressable>
    );
});

const CharPreviewRow = React.memo(function CharPreviewRow({
    char,
    onPressCharacter,
}: {
    char: CharacterAvatarPreview;
    onPressCharacter: (char: CharacterAvatarPreview) => void;
}) {
    return (
        <Pressable
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
    );
});

const styles = StyleSheet.create({
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
    retryBtn: {
        marginTop: 16,
        backgroundColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: 24,
        paddingVertical: 10,
    },
    retryText: {
        color: colors.textSecondary,
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
