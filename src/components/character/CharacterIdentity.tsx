import { useState, type ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  BadgeCheck,
  CirclePlus,
  MessageCircle,
  MessageSquare,
} from "lucide-react-native";
import Avatar from "../common/Avatar";
import AvatarPreview from "../common/AvatarPreview";
import Badge from "../common/Badge";
import Tag from "../common/Tag";
import { colors } from "../../utils/colors";
import { botAvatarUrl } from "../../utils/assets";
import type { AvatarPreviewState, TrendingCharacter } from "../../types/api";

export default function CharacterIdentity({
  character,
  variant,
  avatarSize,
  hidden = false,
  name,
  footer,
}: {
  character: TrendingCharacter;
  variant: "compact" | "full";
  avatarSize: number;
  hidden?: boolean;
  name?: ReactNode;
  footer?: ReactNode;
}) {
  const [preview, setPreview] = useState<AvatarPreviewState | null>(null);

  const compact = variant === "compact";
  const hasTags = character.tags.length > 0 || character.custom_tags.length > 0;

  const openPreview = () => {
    setPreview({
      uri: botAvatarUrl(character.avatar),
      name: character.name,
    });
  };

  const avatar = (
    <Avatar
      uri={botAvatarUrl(character.avatar)}
      onPress={openPreview}
      name={character.name}
      size={avatarSize}
    />
  );

  const creatorRow = (
    <View style={[styles.creatorRow, hidden && styles.creatorRowHidden]}>
      <Text
        style={[styles.creator, compact && styles.creatorCompact]}
        numberOfLines={1}
      >
        by {character.creator_name}
      </Text>
      {character.creator_verified ? (
        <BadgeCheck size={14} color={colors.accent} />
      ) : null}
      {character.creator_subscriber_badge ? (
        <View style={styles.subscriberRow}>
          <CirclePlus size={14} color={colors.accent} />
          <Text
            style={[
              styles.subscriberBadge,
              compact && styles.subscriberBadgeCompact,
            ]}
          >
            {" "}
            Subscriber
          </Text>
        </View>
      ) : null}
    </View>
  );

  const badges = (
    <>
      <Badge
        label={character.is_nsfw ? "NSFW" : "Safe"}
        variant={character.is_nsfw ? "nsfw" : "safe"}
      />
      {character.is_proxy_enabled ? <Badge label="Proxy" /> : null}
      {!character.is_public ? (
        <Badge label="Private" variant="private" />
      ) : null}
    </>
  );

  const tags = (
    <>
      {character.tags.map((tag) => (
        <Tag key={tag.id} label={tag.name} compact={compact} />
      ))}
      {character.custom_tags.map((tag) => (
        <Tag
          key={`custom-${tag}`}
          label={tag}
          variant="custom"
          compact={compact}
        />
      ))}
    </>
  );

  const statsRow = (
    <View style={[styles.statsRow, compact && styles.statsRowCompact]}>
      <View style={[styles.statItem, compact && styles.statItemCompact]}>
        <MessageCircle
          size={compact ? 12 : 13}
          color={hidden ? colors.textFaint : colors.textDim}
        />
        <Text
          style={[
            styles.stat,
            compact && styles.statCompact,
            hidden && styles.textHidden,
          ]}
        >
          {character.stats.chat.toLocaleString()}
        </Text>
      </View>
      <View style={[styles.statItem, compact && styles.statItemCompact]}>
        <MessageSquare
          size={compact ? 12 : 13}
          color={hidden ? colors.textFaint : colors.textDim}
        />
        <Text
          style={[
            styles.stat,
            compact && styles.statCompact,
            hidden && styles.textHidden,
          ]}
        >
          {character.stats.message.toLocaleString()}
        </Text>
      </View>
    </View>
  );

  const previewModal = (
    <AvatarPreview
      visible={preview !== null}
      uri={preview?.uri ?? ""}
      onClose={() => setPreview(null)}
    />
  );

  if (compact) {
    return (
      <>
        <View style={styles.infoTop}>
          {avatar}
          <View style={styles.info}>
            {name}
            {creatorRow}
            {statsRow}
          </View>
        </View>
        {hasTags ? (
          <View style={[styles.info, styles.infoStretch]}>
            <View style={styles.tagsRowCompact}>
              {badges}
              {tags}
            </View>
          </View>
        ) : null}
        {previewModal}
      </>
    );
  }

  return (
    <>
      {avatar}
      {name}
      {creatorRow}
      <View style={styles.badgesRow}>{badges}</View>
      {hasTags ? <View style={styles.tagsRow}>{tags}</View> : null}
      {footer}
      {statsRow}
      {previewModal}
    </>
  );
}

const styles = StyleSheet.create({
  infoTop: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  infoStretch: {
    alignSelf: "stretch",
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  creatorRowHidden: {
    opacity: 0.5,
  },
  creator: {
    color: colors.textFaint,
    fontSize: 14,
  },
  creatorCompact: {
    fontSize: 13,
  },
  subscriberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  subscriberBadge: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
  },
  subscriberBadgeCompact: {
    fontSize: 11,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 14,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  tagsRowCompact: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },
  statsRowCompact: {
    gap: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statItemCompact: {
    gap: 3,
  },
  stat: {
    color: colors.textDim,
    fontSize: 13,
  },
  statCompact: {
    fontSize: 12,
  },
  textHidden: {
    color: colors.textDimAlt,
  },
});
