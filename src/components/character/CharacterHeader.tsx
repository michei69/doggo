import React, { useState, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { EnrichedMarkdownText } from "react-native-enriched-markdown";
import AvatarPreview from "../common/AvatarPreview";
import Avatar from "../common/Avatar";
import Button from "../common/Button";
import Tag from "../common/Tag";
import Badge from "../common/Badge";
import CollapsibleSection from "../common/CollapsibleSection";
import ReviewsSection from "../reviews/ReviewsSection";
import type { CharacterDetail } from "../../types/api";
import { htmlToMarkdown } from "../../utils/markdown";
import { markdownStyle } from "../../utils/markdownStyle";
import { botAvatarUrl } from "../../utils/assets";
import { colors } from "../../utils/colors";
import { formatDate } from "../../utils/time";

export default function CharacterHeader({
  character,
  onStartChat,
  onContinueChat,
  isLoading,
  isTablet = false,
  isOwner = false,
  dateFormat = "relative",
}: {
  character: CharacterDetail;
  onStartChat: () => void;
  onContinueChat?: () => void;
  isLoading: boolean;
  isTablet?: boolean;
  isOwner?: boolean;
  dateFormat?: "relative" | "absolute";
}) {
  const [descExpanded, setDescExpanded] = useState(false);
  const [descTruncated, setDescTruncated] = useState(false);
  const [preview, setPreview] = useState<{ uri: string; name: string } | null>(
    null,
  );
  const [altIndex, setAltIndex] = useState(0);
  const nav = useNavigation<any>();

  const altMessages = character.first_messages?.slice(1) ?? [];

  const descriptionMarkdown = useMemo(
    () => htmlToMarkdown(character.description || ""),
    [character.description],
  );

  const handleDescLayout = useCallback(
    (e: any) => {
      if (!descExpanded && !descTruncated) {
        const { height } = e.nativeEvent.layout;
        if (height >= 495) {
          setDescTruncated(true);
        }
      }
    },
    [descExpanded, descTruncated],
  );

  const charInfo = (
    <>
      <Avatar
        uri={character.avatar ? botAvatarUrl(character.avatar) : ""}
        onPress={() =>
          setPreview({
            uri: botAvatarUrl(character.avatar),
            name: character.name,
          })
        }
        name={character.name}
        size={96}
      />
      <Text style={styles.name}>{character.name}</Text>

      {character.chat_name && character.chat_name !== character.name ? (
        <Text style={styles.chatName}>{character.chat_name}</Text>
      ) : null}

      <Pressable
        onPress={() =>
          nav.navigate("CreatorScreen", {
            userId: character.creator_id,
            userName: character.creator_name,
          })
        }
        hitSlop={8}
      >
        <Text style={styles.creator}>
          by {character.creator_name}
          {character.creator_verified && (
            <Text style={styles.verified}> {"\u2713"}</Text>
          )}
          {character.creator_subscriber_badge && (
            <Text style={styles.subscriberBadge}> Subscriber</Text>
          )}
        </Text>
      </Pressable>

      <View style={styles.badges}>
        <Badge
          label={character.is_nsfw ? "NSFW" : "Safe"}
          variant={character.is_nsfw ? "nsfw" : "safe"}
        />
        {character.allow_proxy && <Badge label="Proxy" />}
        {!character.is_public && <Badge label="Private" variant="private" />}
      </View>

      {(character.tags?.length > 0 || character.custom_tags?.length > 0) && (
        <View style={styles.tagsRow}>
          {character.tags?.map((tag) => (
            <Tag key={tag.id} label={tag.name} />
          ))}
          {character.custom_tags?.map((tag, _) => (
            <Tag key={`custom-${tag}`} label={tag} variant="custom" />
          ))}
        </View>
      )}

      <View style={styles.datesRow}>
        <Text style={styles.dateText}>
          Created {formatDate(character.created_at, dateFormat)}
        </Text>
        <Text style={styles.dateSep}>·</Text>
        <Text style={styles.dateText}>
          Updated {formatDate(character.updated_at, dateFormat)}
        </Text>
        {character.first_published_at ? (
          <>
            <Text style={styles.dateSep}>·</Text>
            <Text style={styles.dateText}>
              Published {formatDate(character.first_published_at, dateFormat)}
            </Text>
          </>
        ) : null}
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {character.stats.chat.toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>Chats</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {character.stats.message.toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>Messages</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {character.token_counts.total_tokens.toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>Tokens</Text>
        </View>
      </View>

      {character.description ? (
        <View style={styles.descSection}>
          <View
            style={!descExpanded && styles.descCollapsed}
            onLayout={handleDescLayout}
          >
            <EnrichedMarkdownText
              markdown={descriptionMarkdown}
              markdownStyle={markdownStyle}
              selectable={false}
            />
          </View>
          {descTruncated && (
            <Pressable
              style={styles.showMoreBtn}
              onPress={() => setDescExpanded((e) => !e)}
            >
              <Text style={styles.showMoreText}>
                {descExpanded ? "Show less" : "Show more"}
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}

      {onContinueChat && (
        <Button
          title="Continue latest chat"
          onPress={onContinueChat}
          variant="outline"
          style={styles.continueBtn}
        />
      )}

      <Button
        title={`Start chatting with ${character.chat_name || character.name}`}
        onPress={onStartChat}
        loading={isLoading}
        style={onContinueChat ? [styles.startBtn, styles.startBtnWithContinue] : styles.startBtn}
      />
    </>
  );

  const charDetails = (
    <>
      {character.personality ? (
        <CollapsibleSection title="Personality">
          <EnrichedMarkdownText
            markdown={htmlToMarkdown(character.personality)}
            markdownStyle={markdownStyle}
            selectable={false}
          />
        </CollapsibleSection>
      ) : null}
      {character.scenario ? (
        <CollapsibleSection title="Scenario">
          <EnrichedMarkdownText
            markdown={htmlToMarkdown(character.scenario)}
            markdownStyle={markdownStyle}
            selectable={false}
          />
        </CollapsibleSection>
      ) : null}
      {character.example_dialogs ? (
        <CollapsibleSection title="Example Dialogue">
          <EnrichedMarkdownText
            markdown={htmlToMarkdown(character.example_dialogs)}
            markdownStyle={markdownStyle}
            selectable={false}
          />
        </CollapsibleSection>
      ) : null}

      {character.first_message ? (
        <CollapsibleSection title="First Message">
          <EnrichedMarkdownText
            markdown={htmlToMarkdown(character.first_message)}
            markdownStyle={markdownStyle}
            selectable={false}
          />
        </CollapsibleSection>
      ) : null}

      {altMessages.length > 0 && (
        <CollapsibleSection
          title={`Alternate Messages (${altMessages.length})`}
        >
          <EnrichedMarkdownText
            markdown={htmlToMarkdown(altMessages[altIndex])}
            markdownStyle={markdownStyle}
            selectable={false}
          />
          <View style={styles.altNav}>
            <Pressable
              style={[
                styles.altNavBtn,
                altIndex === 0 && styles.altNavBtnDisabled,
              ]}
              onPress={() => setAltIndex((i) => Math.max(0, i - 1))}
              disabled={altIndex === 0}
            >
              <Text
                style={[
                  styles.altNavText,
                  altIndex === 0 && styles.altNavTextDisabled,
                ]}
              >
                ← Prev
              </Text>
            </Pressable>
            <Text style={styles.altNavCount}>
              {altIndex + 1} / {altMessages.length}
            </Text>
            <Pressable
              style={[
                styles.altNavBtn,
                altIndex === altMessages.length - 1 && styles.altNavBtnDisabled,
              ]}
              onPress={() =>
                setAltIndex((i) => Math.min(altMessages.length - 1, i + 1))
              }
              disabled={altIndex === altMessages.length - 1}
            >
              <Text
                style={[
                  styles.altNavText,
                  altIndex === altMessages.length - 1 &&
                    styles.altNavTextDisabled,
                ]}
              >
                Next →
              </Text>
            </Pressable>
          </View>
        </CollapsibleSection>
      )}
    </>
  );

  return (
    <>
      {isTablet ? (
        <View style={[styles.container, styles.tabletRow]}>
          <ScrollView
            style={styles.tabletLeft}
            contentContainerStyle={styles.tabletLeftInner}
            showsVerticalScrollIndicator={false}
          >
            {charInfo}
          </ScrollView>
          <ScrollView
            style={styles.tabletRight}
            contentContainerStyle={styles.tabletRightInner}
            showsVerticalScrollIndicator={false}
          >
            {charDetails}
            <ReviewsSection characterId={character.id} isOwner={isOwner} />
          </ScrollView>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
        >
          {charInfo}
          {charDetails}
          <ReviewsSection characterId={character.id} isOwner={isOwner} />
        </ScrollView>
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
  container: {
    flex: 1,
  },
  content: {
    alignItems: "center",
    padding: 20,
    paddingBottom: 60,
  },
  tabletRow: {
    flex: 1,
    flexDirection: "row",
    gap: 24,
    padding: 20,
  },
  tabletLeft: {
    flex: 1,
  },
  tabletLeftInner: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 20,
  },
  tabletRight: {
    flex: 1,
  },
  tabletRightInner: {
    paddingVertical: 20,
  },
  name: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 16,
    textAlign: "center",
  },
  chatName: {
    color: colors.textFaint,
    fontSize: 14,
    marginTop: 2,
  },
  creator: {
    color: colors.accent,
    fontSize: 14,
    marginTop: 4,
  },
  subscriberBadge: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
  },
  verified: {
    color: colors.accent,
  },
  badges: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 14,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  datesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 16,
  },
  dateText: {
    color: colors.textDim,
    fontSize: 12,
  },
  dateSep: {
    color: colors.textFaint,
    fontSize: 12,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 18,
    paddingVertical: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  descSection: {
    width: "100%",
    paddingHorizontal: 4,
    marginVertical: 16,
  },
  descCollapsed: {
    maxHeight: 500,
    overflow: "hidden",
  },
  showMoreBtn: {
    alignSelf: "center",
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  showMoreText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  section: {
    width: "100%",
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionToggle: {
    color: colors.textFaint,
    fontSize: 10,
  },
  sectionBody: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    overflow: "hidden",
  },
  altNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingHorizontal: 4,
  },
  altNavBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  altNavBtnDisabled: {
    opacity: 0.3,
  },
  altNavText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  altNavTextDisabled: {
    color: colors.textDimAlt,
  },
  altNavCount: {
    color: colors.textDim,
    fontSize: 12,
  },
  startBtn: {
    marginTop: 24,
    marginBottom: 24,
    width: "100%",
  },
  startBtnWithContinue: {
    marginTop: 12,
  },
  continueBtn: {
    marginTop: 24,
    width: "100%",
  },
});
