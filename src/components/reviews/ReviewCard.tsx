import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
    ThumbsUp,
    ThumbsDown,
    CirclePlus,
    MessageCircle,
    Pin,
    Trash2,
    BadgeCheck,
    Shield,
    Send,
} from "lucide-react-native";
import Avatar from "../common/Avatar";
import type { Review, ReviewComment } from "../../types/api";
import {
    getReviewComments,
    createComment,
    deleteComment,
    likeReview,
    deleteReview as deleteReviewApi,
    reactToReview,
    removeReviewReaction,
} from "../../api/reviews";
import { useAuthStore } from "../../stores/authStore";
import { storage } from "../../utils/storage";
import { colors } from "../../utils/colors";
import { avatarUrl } from "../../utils/assets";
import { formatRelativeTime } from "../../utils/time";
import CommentItem from "./CommentItem";
import EmojiPickerModal from "./EmojiPickerModal";

export default function ReviewCard({
  review: initialReview,
  isOwner,
  onDelete,
  onPin,
  onUnpin,
}: {
  review: Review;
  isOwner: boolean;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
}) {
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation<any>();
  const [review, setReview] = useState(initialReview);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liking, setLiking] = useState(false);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [reactionsEnabled, setReactionsEnabled] = useState(false);

  useEffect(() => {
    storage.getReviewReactionsEnabled().then(setReactionsEnabled);
  }, []);

  const isOwnReview = review.user_id === user?.id;
  const isOwnCharacter = isOwner;

  const handleToggleComments = useCallback(async () => {
    if (commentsExpanded) {
      setCommentsExpanded(false);
      return;
    }
    setCommentsExpanded(true);
    if (comments.length === 0) {
      setLoadingComments(true);
      try {
        const data = await getReviewComments(review.id);
        setComments(data);
      } catch {
        // silently fail
      } finally {
        setLoadingComments(false);
      }
    }
  }, [commentsExpanded, comments.length, review.id]);

  const handleSubmitComment = useCallback(async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const newComment = await createComment({
        content: commentText.trim(),
        review_id: review.id,
      });
      const optimistic: ReviewComment = {
        content: newComment.content,
        created_at: newComment.created_at,
        dislike_count: 0,
        id: newComment.id,
        is_liked_by_user: false,
        like_count: 0,
        moderator: false,
        review_id: newComment.review_id,
        user_id: newComment.user_id,
        user_profiles: {
          avatar: user?.user_metadata?.sub ?? "",
          is_verified: false,
          name: user?.user_metadata?.email ?? "",
          plusbadge: false,
          user_name: user?.user_metadata?.email ?? "",
        },
      };
      setComments((prev) => [...prev, optimistic]);
      setCommentText("");
      setReview((prev) => ({
        ...prev,
        comment_count: prev.comment_count + 1,
      }));
    } catch {
      // silently fail
    } finally {
      setSubmittingComment(false);
    }
  }, [commentText, review.id, user]);

  const handleLikeReview = useCallback(async () => {
    if (liking) return;
    setLiking(true);
    const wasLiked = review.is_liked_by_user;
    setReview((prev) => ({
      ...prev,
      is_liked_by_user: !wasLiked,
      like_count: wasLiked ? prev.like_count - 1 : prev.like_count + 1,
    }));
    try {
      await likeReview(review.id);
    } catch {
      setReview((prev) => ({
        ...prev,
        is_liked_by_user: wasLiked,
        like_count: wasLiked ? prev.like_count + 1 : prev.like_count - 1,
      }));
    } finally {
      setLiking(false);
    }
  }, [review.id, review.is_liked_by_user, liking]);

  const handleEmojiReact = useCallback(
    async (emojiId: string) => {
      try {
        await reactToReview(review.id, emojiId);
      } catch {
        // silently fail
      }
    },
    [review.id],
  );

  const handleRemoveReaction = useCallback(async () => {
    try {
      await removeReviewReaction(review.id);
    } catch {
      // silently fail
    }
  }, [review.id]);

  const handleDeleteReview = useCallback(async () => {
    try {
      await deleteReviewApi(review.id);
      onDelete(review.id);
    } catch {
      // silently fail
    }
  }, [review.id, onDelete]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setReview((prev) => ({
        ...prev,
        comment_count: Math.max(0, prev.comment_count - 1),
      }));
    } catch {
      // silently fail
    }
  }, []);

  const handleCommentLikeToggled = useCallback(
    (commentId: string, isLiked: boolean) => {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                is_liked_by_user: isLiked,
                like_count: isLiked ? c.like_count + 1 : c.like_count - 1,
              }
            : c,
        ),
      );
    },
    [],
  );

  const profile = review.user_profiles;
  const iconSize = 14;
  const iconColor = colors.textDim;

  return (
    <View style={[styles.card, review.is_pinned && styles.cardPinned]}>
      {/* Pin badge */}
      {review.is_pinned && (
        <View style={styles.pinBadgeRow}>
          <Pin size={12} color={colors.accent} />
          <Text style={styles.pinBadge}>Pinned</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.rowHeader}>
        <Pressable
          style={styles.userPressable}
          onPress={() =>
            navigation.navigate("CreatorScreen", {
              userId: review.user_id,
              userName: profile.name || profile.user_name,
            })
          }
        >
          <Avatar
            uri={profile.avatar ? avatarUrl(profile.avatar) : ""}
            name={profile.name || profile.user_name}
            size={36}
          />
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>
                {profile.name || profile.user_name}
              </Text>
              {profile.is_verified && (
                <BadgeCheck size={14} color={colors.accent} />
              )}
              {profile.plusbadge && <Text style={styles.plusBadge}>+</Text>}
              {review.moderator && (
                <View style={styles.moderatorBadge}>
                  <Shield size={9} color={colors.danger} />
                </View>
              )}
            </View>
            <Text style={styles.time}>
              {formatRelativeTime(review.created_at)}
            </Text>
          </View>
        </Pressable>
        {review.is_like ? (
          <ThumbsUp size={18} color={colors.accent} />
        ) : (
          <ThumbsDown size={18} color={colors.danger} />
        )}
      </View>

      {/* Content */}
      <Text style={styles.content}>{review.content}</Text>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          onPress={handleLikeReview}
          style={styles.actionBtn}
          disabled={liking}
        >
          <ThumbsUp
            size={iconSize}
            color={review.is_liked_by_user ? colors.accent : iconColor}
          />
          <Text
            style={[
              styles.actionText,
              review.is_liked_by_user && styles.actionTextActive,
            ]}
          >
            {" "}
            {review.like_count}
          </Text>
        </Pressable>

        {reactionsEnabled && (
          <Pressable
            onPress={() => setEmojiPickerVisible(true)}
            style={styles.actionBtn}
          >
            <CirclePlus size={iconSize} color={iconColor} />
          </Pressable>
        )}

        <Pressable onPress={handleToggleComments} style={styles.actionBtn}>
          <MessageCircle size={iconSize} color={iconColor} />
          <Text style={styles.actionText}> {review.comment_count}</Text>
        </Pressable>

        {/* Pin/unpin for character owner */}
        {isOwnCharacter && (
          <Pressable
            onPress={() =>
              review.is_pinned ? onUnpin(review.id) : onPin(review.id)
            }
            style={styles.actionBtn}
          >
            <Pin
              size={iconSize}
              color={review.is_pinned ? colors.accent : iconColor}
            />
          </Pressable>
        )}

        {/* Delete for review owner */}
        {isOwnReview && (
          <Pressable onPress={handleDeleteReview} style={styles.actionBtn}>
            <Trash2 size={iconSize} color={colors.danger} />
          </Pressable>
        )}
      </View>

      {/* Comments section */}
      {commentsExpanded && (
        <View style={styles.commentsSection}>
          {loadingComments ? (
            <ActivityIndicator
              size="small"
              color={colors.accent}
              style={styles.commentLoader}
            />
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onDelete={handleDeleteComment}
                onLikeToggled={handleCommentLikeToggled}
              />
            ))
          )}

          {/* Add comment form */}
          <View style={styles.commentForm}>
            <TextInput
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Write a comment..."
              placeholderTextColor={colors.textPlaceholder}
              multiline
            />
            <Pressable
              style={[
                styles.commentSubmitBtn,
                (!commentText.trim() || submittingComment) &&
                  styles.commentSubmitBtnDisabled,
              ]}
              onPress={handleSubmitComment}
              disabled={!commentText.trim() || submittingComment}
            >
              {submittingComment ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Send size={14} color={colors.white} />
              )}
            </Pressable>
          </View>
        </View>
      )}

      <EmojiPickerModal
        visible={emojiPickerVisible}
        onClose={() => setEmojiPickerVisible(false)}
        onReact={handleEmojiReact}
        onRemoveReact={handleRemoveReaction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  cardPinned: {
    borderColor: colors.accent,
  },
  pinBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pinBadge: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
  },
  userPressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  userName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  plusBadge: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: "800",
  },
  moderatorBadge: {
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
  },
  time: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 1,
  },
  content: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    flexWrap: "wrap",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    gap: 0,
  },
  actionText: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: "500",
  },
  actionTextActive: {
    color: colors.accent,
  },
  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    gap: 8,
  },
  commentLoader: {
    paddingVertical: 12,
  },
  commentForm: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
    marginTop: 4,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    color: colors.text,
    fontSize: 13,
    maxHeight: 80,
    textAlignVertical: "top",
  },
  commentSubmitBtn: {
    padding: 8,
    backgroundColor: colors.accent,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  commentSubmitBtnDisabled: {
    opacity: 0.5,
  },
});
