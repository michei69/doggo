import React, { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { MessageCircle, MessageSquare } from "lucide-react-native";
import Avatar from "../common/Avatar";
import AvatarPreview from "../common/AvatarPreview";
import Tag from "../common/Tag";
import Badge from "../common/Badge";
import { colors } from "../../utils/colors";
import { botAvatarUrl } from "../../utils/assets";
import type { TrendingCharacter } from "../../types/api";

export default function CharacterCard({
  character,
  onPress,
  onLongPress,
  hidden,
  onToggleHidden,
  style,
}: {
  character: TrendingCharacter;
  onPress: () => void;
  onLongPress?: () => void;
  hidden?: boolean;
  onToggleHidden?: () => void;
  style?: object;
}) {
  const [preview, setPreview] = useState<{ uri: string; name: string } | null>(
    null,
  );

  const handleSwipe = useCallback(() => {
    onToggleHidden?.();
  }, [onToggleHidden]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-10, 10])
        .onEnd(() => runOnJS(handleSwipe)()),
    [handleSwipe],
  );

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: hidden ? withSpring(0.3) : withSpring(1),
  }));

  return (
    <>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, style, animatedCardStyle]}>
          <Pressable
            style={({ pressed }) => pressed && styles.pressed}
            onPress={onPress}
            onLongPress={onLongPress}
          >
            <View style={styles.inner}>
              <View style={styles.infoTop}>
                <Avatar
                  uri={botAvatarUrl(character.avatar)}
                  onPress={() =>
                    setPreview({
                      uri: botAvatarUrl(character.avatar),
                      name: character.name,
                    })
                  }
                  name={character.name}
                  size={76}
                />
                <View style={styles.info}>
                  <Text
                    style={[styles.name, hidden && styles.textHidden]}
                    numberOfLines={1}
                  >
                    {character.name}
                  </Text>
                  <Text
                    style={[styles.creator, hidden && styles.textHidden]}
                    numberOfLines={1}
                  >
                    by {character.creator_name}
                    {character.creator_verified ? (
                      <Text style={styles.verified}> {"\u2713"}</Text>
                    ) : null}
                    {character.creator_subscriber_badge ? (
                      <Text style={styles.subscriberBadge}> Subscriber</Text>
                    ) : null}
                  </Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <MessageCircle
                        size={12}
                        color={hidden ? colors.textFaint : colors.textDim}
                      />
                      <Text style={[styles.stat, hidden && styles.textHidden]}>
                        {character.stats.chat.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <MessageSquare
                        size={12}
                        color={hidden ? colors.textFaint : colors.textDim}
                      />
                      <Text style={[styles.stat, hidden && styles.textHidden]}>
                        {character.stats.message.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.info}>
                {(character.tags.length > 0 ||
                  character.custom_tags.length > 0) && (
                  <View style={styles.tagsRow}>
                    <Badge
                      label={character.is_nsfw ? "NSFW" : "Safe"}
                      variant={character.is_nsfw ? "nsfw" : "safe"}
                    />
                    {character.is_proxy_enabled && <Badge label="Proxy" />}
                    {!character.is_public && (
                      <Badge label="Private" variant="private" />
                    )}
                    {character.tags.map((tag) => (
                      <Tag key={tag.id} label={tag.name} compact />
                    ))}
                    {character.custom_tags.map((tag, _) => (
                      <Tag
                        key={`custom-${tag}`}
                        label={tag}
                        variant="custom"
                        compact
                      />
                    ))}
                  </View>
                )}
              </View>
            </View>
          </Pressable>
          {hidden && <View style={styles.greyOverlay} />}
        </Animated.View>
      </GestureDetector>
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
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    position: "relative",
  },
  pressed: {
    opacity: 0.7,
  },
  inner: {
    flexDirection: "column",
    backgroundColor: colors.card,
    padding: 12,
    alignItems: "center",
  },
  greyOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(30, 30, 40, 0.4)",
  },
  info: {
    flex: 1,
  },
  infoTop: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  creator: {
    color: colors.textFaint,
    fontSize: 13,
    marginTop: 6,
  },
  subscriberBadge: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "600",
  },
  verified: {
    color: colors.accent,
    fontWeight: "600",
  },
  textHidden: {
    color: colors.textDimAlt,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  stat: {
    color: colors.textDim,
    fontSize: 12,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 6,
  },
});
