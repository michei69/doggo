import { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { EnrichedMarkdownText } from "react-native-enriched-markdown";
import {
    BadgeCheck,
    CirclePlus,
    MessageCircle,
    MessageSquare,
} from "lucide-react-native";
import Avatar from "../../../components/common/Avatar";
import AvatarPreview from "../../../components/common/AvatarPreview";
import Badge from "../../../components/common/Badge";
import Tag from "../../../components/common/Tag";
import { colors } from "../../../utils/colors";
import { botAvatarUrl } from "../../../utils/assets";
import { htmlToMarkdown } from "../../../utils/markdown";
import { markdownStyle } from "../../../utils/markdownStyle";
import { useNavigateToJanitorLink } from "../../../utils/janitorLinks";
import type { TrendingCharacter } from "../../../types/api";

export type SwipeDirection = "right" | "left" | "down";

const SPRING_CONFIG = { damping: 18, stiffness: 200, mass: 0.8 };
const TINT_RANGE = 110;
const EXIT_DURATION = 200;

export default function SwipeCard({
    character,
    onSwiped,
    style,
}: {
    character: TrendingCharacter;
    onSwiped?: (direction: SwipeDirection) => void;
    style?: object;
}) {
    const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
    const [preview, setPreview] = useState<{ uri: string; name: string } | null>(
        null,
    );
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const rotate = useSharedValue(0);

    const interactive = onSwiped !== undefined;
    const onLinkPress = useNavigateToJanitorLink();
    const descriptionMarkdown = useMemo(
        () => htmlToMarkdown(character.description || ""),
        [character.description],
    );

    const panGesture = useMemo(() => {
        if (!interactive) return null;
        return Gesture.Pan()
            .activeOffsetX([-15, 15])
            .activeOffsetY([-15, 15])
            .onUpdate((e) => {
                translateX.value = e.translationX;
                translateY.value = e.translationY;
                rotate.value = Math.max(
                    -15,
                    Math.min(15, e.translationX / 30),
                );
            })
            .onEnd((e) => {
                const { translationX, translationY, velocityX, velocityY } = e;
                const horizontal =
                    Math.abs(translationX) > Math.abs(translationY);
                let direction: SwipeDirection | null = null;
                if (horizontal && (translationX > 100 || velocityX > 800)) {
                    direction = "right";
                } else if (
                    horizontal &&
                    (translationX < -100 || velocityX < -800)
                ) {
                    direction = "left";
                } else if (
                    !horizontal &&
                    translationY > 100 &&
                    velocityY > 300
                ) {
                    direction = "down";
                }

                if (!direction) {
                    translateX.value = withSpring(0, SPRING_CONFIG);
                    translateY.value = withSpring(0, SPRING_CONFIG);
                    rotate.value = withSpring(0, SPRING_CONFIG);
                    return;
                }

                const targetX =
                    direction === "right"
                        ? SCREEN_W * 1.4
                        : direction === "left"
                          ? -SCREEN_W * 1.4
                          : translationX;
                const targetY =
                    direction === "down" ? SCREEN_H * 1.4 : translationY;
                const targetRotate =
                    direction === "right"
                        ? 20
                        : direction === "left"
                          ? -20
                          : rotate.value;

                translateX.value = withTiming(targetX, {
                    duration: EXIT_DURATION,
                });
                translateY.value = withTiming(targetY, {
                    duration: EXIT_DURATION,
                });
                rotate.value = withTiming(
                    targetRotate,
                    { duration: EXIT_DURATION },
                    (finished) => {
                        if (finished) {
                            scheduleOnRN(onSwiped, direction);
                        }
                    },
                );
            });
    }, [
        interactive,
        onSwiped,
        SCREEN_W,
        SCREEN_H,
        translateX,
        translateY,
        rotate,
    ]);

    const animatedStyle = useAnimatedStyle(() => {
        const x = translateX.value;
        const y = translateY.value;
        const rot = rotate.value;
        return {
            transform: [
                { translateX: x },
                { translateY: y },
                { rotate: `${rot}deg` },
            ],
        };
    });

    const tintStyle = useAnimatedStyle(() => {
        const x = translateX.value;
        const y = translateY.value;
        const horizontal = Math.abs(x) > Math.abs(y);
        let backgroundColor: string = colors.transparent;
        let opacity = 0;
        if (horizontal) {
            const p = Math.min(Math.abs(x) / TINT_RANGE, 1);
            backgroundColor = x > 0 ? colors.success : colors.danger;
            opacity = p * 0.45;
        } else if (y > 0) {
            const p = Math.min(y / TINT_RANGE, 1);
            backgroundColor = "rgba(30, 30, 40, 0.4)";
            opacity = p;
        }
        return { backgroundColor, opacity };
    });

    const dimStyle = useAnimatedStyle(() => {
        const x = translateX.value;
        const y = translateY.value;
        const horizontal = Math.abs(x) > Math.abs(y);
        const down = !horizontal && y > 0 ? Math.min(y / TINT_RANGE, 1) : 0;
        return { opacity: 1 - down * 0.7 };
    });

    const cardContent = (
        <View style={styles.inner}>
            <Avatar
                uri={botAvatarUrl(character.avatar)}
                onPress={() =>
                    setPreview({
                        uri: botAvatarUrl(character.avatar),
                        name: character.name,
                    })
                }
                name={character.name}
                size={140}
            />
            <Text style={styles.name} numberOfLines={2}>
                {character.name}
            </Text>
            <View style={styles.creatorRow}>
                <Text style={styles.creator} numberOfLines={1}>
                    by {character.creator_name}
                </Text>
                {character.creator_verified ? (
                    <BadgeCheck size={14} color={colors.accent} />
                ) : null}
                {character.creator_subscriber_badge ? (
                    <View style={styles.subscriberRow}>
                        <CirclePlus size={14} color={colors.accent} />
                        <Text style={styles.subscriberBadge}> Subscriber</Text>
                    </View>
                ) : null}
            </View>
            <View style={styles.badgesRow}>
                <Badge
                    label={character.is_nsfw ? "NSFW" : "Safe"}
                    variant={character.is_nsfw ? "nsfw" : "safe"}
                />
                {character.is_proxy_enabled ? (
                    <Badge label="Proxy" />
                ) : null}
                {!character.is_public ? (
                    <Badge label="Private" variant="private" />
                ) : null}
            </View>
            {(character.tags.length > 0 ||
                character.custom_tags.length > 0) && (
                <View style={styles.tagsRow}>
                    {character.tags.map((tag) => (
                        <Tag key={tag.id} label={tag.name} />
                    ))}
                    {character.custom_tags.map((tag) => (
                        <Tag
                            key={`custom-${tag}`}
                            label={tag}
                            variant="custom"
                        />
                    ))}
                </View>
            )}
            {character.description ? (
                <View style={styles.descSection}>
                    <View style={styles.descCollapsed}>
                        <EnrichedMarkdownText
                            markdown={descriptionMarkdown}
                            markdownStyle={markdownStyle}
                            selectable={false}
                            onLinkPress={onLinkPress}
                        />
                    </View>
                </View>
            ) : null}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <MessageCircle size={13} color={colors.textDim} />
                    <Text style={styles.stat}>
                        {character.stats.chat.toLocaleString()}
                    </Text>
                </View>
                <View style={styles.statItem}>
                    <MessageSquare size={13} color={colors.textDim} />
                    <Text style={styles.stat}>
                        {character.stats.message.toLocaleString()}
                    </Text>
                </View>
            </View>
        </View>
    );

    return (
        <>
            {interactive && panGesture ? (
                <GestureDetector gesture={panGesture}>
                    <Animated.View
                        style={[
                            styles.card,
                            style,
                            animatedStyle,
                            dimStyle,
                        ]}
                    >
                        {cardContent}
                        <Animated.View
                            pointerEvents="none"
                            style={[styles.tintOverlay, tintStyle]}
                        />
                    </Animated.View>
                </GestureDetector>
            ) : (
                <Animated.View style={[styles.card, style, animatedStyle]}>
                    {cardContent}
                </Animated.View>
            )}
            <AvatarPreview
                visible={preview !== null}
                uri={preview?.uri ?? ""}
                onClose={() => setPreview(null)}
            />
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        overflow: "hidden",
        marginHorizontal: 16,
        marginVertical: 8,
    },
    tintOverlay: {
        ...StyleSheet.absoluteFill,
        borderRadius: 20,
    },
    inner: {
        flex: 1,
        padding: 20,
        alignItems: "center",
        backgroundColor: colors.card,
    },
    name: {
        color: colors.text,
        fontSize: 22,
        fontWeight: "800",
        textAlign: "center",
        marginTop: 12,
    },
    creatorRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 6,
    },
    creator: {
        color: colors.textFaint,
        fontSize: 14,
    },
    subscriberBadge: {
        color: colors.accent,
        fontSize: 12,
        fontWeight: "600",
    },
    subscriberRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
    },
    badgesRow: {
        flexDirection: "row",
        gap: 6,
        marginTop: 10,
    },
    descSection: {
        width: "100%",
        paddingHorizontal: 4,
        marginVertical: 12,
    },
    descCollapsed: {
        maxHeight: 130,
        overflow: "hidden",
    },
    statsRow: {
        flexDirection: "row",
        gap: 16,
        marginTop: 8,
    },
    statItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    stat: {
        color: colors.textDim,
        fontSize: 13,
    },
    tagsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 14,
        justifyContent: "center",
        paddingHorizontal: 16,
    },
});