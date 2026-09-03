import {
  useState,
  useEffect,
  useCallback,
  useReducer,
  useRef,
  memo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { ThumbsUp, ThumbsDown, MessageSquarePlus } from "lucide-react-native";
import {
  getReviews,
  getReviewCounts,
  getReviewSettings,
  createReview,
  deleteReview,
  pinReview,
  unpinReview,
} from "../../api/reviews";
import type {
  Review,
  ReviewCounts,
  ReviewSettings,
  ReviewSort,
} from "../../types/api";
import { useAuthStore } from "../../stores/authStore";
import { colors } from "../../utils/colors";
import ReviewCard from "./ReviewCard";
import { makeReviewUserProfile } from "./reviewFactories";

interface ReviewsListState {
  reviews: Review[];
  hasMore: boolean;
  listLoading: boolean;
}

type ReviewsListAction =
  | { type: "REPLACE"; reviews: Review[]; hasMore: boolean }
  | { type: "APPEND"; reviews: Review[]; hasMore: boolean }
  | { type: "LIST_LOADING"; loading: boolean }
  | { type: "ADD"; review: Review }
  | { type: "REMOVE"; id: string }
  | { type: "PIN"; id: string; pinnedAt: string }
  | { type: "UNPIN"; id: string };

function reviewsListReducer(
  state: ReviewsListState,
  action: ReviewsListAction,
): ReviewsListState {
  switch (action.type) {
    case "REPLACE":
      return {
        reviews: action.reviews,
        hasMore: action.hasMore,
        listLoading: false,
      };
    case "APPEND":
      return {
        reviews: [...state.reviews, ...action.reviews],
        hasMore: action.hasMore,
        listLoading: false,
      };
    case "LIST_LOADING":
      return { ...state, listLoading: action.loading };
    case "ADD":
      return { ...state, reviews: [action.review, ...state.reviews] };
    case "REMOVE":
      return {
        ...state,
        reviews: state.reviews.filter((r) => r.id !== action.id),
      };
    case "PIN":
      return {
        ...state,
        reviews: state.reviews.map((r) =>
          r.id === action.id
            ? { ...r, is_pinned: true, pinned_at: action.pinnedAt }
            : r,
        ),
      };
    case "UNPIN":
      return {
        ...state,
        reviews: state.reviews.map((r) =>
          r.id === action.id ? { ...r, is_pinned: false, pinned_at: null } : r,
        ),
      };
    default:
      return state;
  }
}

export default function ReviewsSection({
  characterId,
  isOwner,
}: {
  characterId: string;
  isOwner: boolean;
}) {
  const user = useAuthStore((s) => s.user);
  const [settings, setSettings] = useState<ReviewSettings | null>(null);
  const [counts, setCounts] = useState<ReviewCounts | null>(null);
  const [sortBy, setSortBy] = useState<ReviewSort>("likes");
  const pageRef = useRef(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [list, dispatchList] = useReducer(reviewsListReducer, {
    reviews: [],
    hasMore: true,
    listLoading: false,
  });
  const { reviews, hasMore, listLoading } = list;

  const initialLoading = settings === null && error === null;

  // Review form
  const [showForm, setShowForm] = useState(false);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewIsLike, setReviewIsLike] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Initial load: settings + counts + reviews
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setError(null);
        const [settingsData, countsData, reviewsData] = await Promise.all([
          getReviewSettings(characterId),
          getReviewCounts(characterId),
          getReviews(characterId, { page: 1, size: 20, sortBy: "likes" }),
        ]);
        if (cancelled) return;
        setSettings(settingsData);
        setCounts(countsData);
        dispatchList({
          type: "REPLACE",
          reviews: reviewsData,
          hasMore: reviewsData.length === 20,
        });
        pageRef.current = 1;
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message || "Failed to load reviews");
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [characterId]);

  // Refetch reviews when sort changes
  useEffect(() => {
    if (initialLoading) return;
    let cancelled = false;
    const fetch = async () => {
      dispatchList({ type: "LIST_LOADING", loading: true });
      try {
        const data = await getReviews(characterId, {
          page: 1,
          size: 20,
          sortBy,
        });
        if (cancelled) return;
        dispatchList({
          type: "REPLACE",
          reviews: data,
          hasMore: data.length === 20,
        });
        pageRef.current = 1;
      } catch {
        if (!cancelled) dispatchList({ type: "LIST_LOADING", loading: false });
      }
    };
    fetch();
    return () => {
      cancelled = true;
    };
  }, [sortBy, characterId, initialLoading]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const data = await getReviews(characterId, {
        page: nextPage,
        size: 20,
        sortBy,
      });
      dispatchList({
        type: "APPEND",
        reviews: data,
        hasMore: data.length === 20,
      });
      pageRef.current = nextPage;
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  }, [characterId, sortBy, loadingMore, hasMore]);

  const handleSortChange = useCallback((newSort: ReviewSort) => {
    setSortBy(newSort);
  }, []);

  const handleSubmitReview = useCallback(async () => {
    if (!reviewContent.trim()) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const newReview = await createReview({
        character_id: characterId,
        content: reviewContent.trim(),
        is_like: reviewIsLike,
      });
      // Convert to Review shape for optimistic display
      const optimistic: Review = {
        character_id: characterId,
        comment_count: 0,
        content: newReview.content,
        created_at: newReview.created_at,
        dislike_count: 0,
        id: newReview.id,
        is_like: newReview.is_like,
        is_liked_by_user: false,
        is_pinned: false,
        like_count: 0,
        moderator: false,
        pinned_at: null,
        user_id: newReview.user_id,
        user_profiles: makeReviewUserProfile(user),
      };
      dispatchList({ type: "ADD", review: optimistic });
      setReviewContent("");
      setShowForm(false);
      // Refresh counts
      const c = await getReviewCounts(characterId);
      setCounts(c);
    } catch (err: any) {
      setFormError(err.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }, [reviewContent, reviewIsLike, characterId, user]);

  const handleDeleteReview = useCallback(
    async (reviewId: string) => {
      try {
        await deleteReview(reviewId);
        dispatchList({ type: "REMOVE", id: reviewId });
        const c = await getReviewCounts(characterId);
        setCounts(c);
      } catch {
        // silently fail
      }
    },
    [characterId],
  );

  const handlePinReview = useCallback(async (reviewId: string) => {
    try {
      await pinReview(reviewId);
      dispatchList({
        type: "PIN",
        id: reviewId,
        pinnedAt: new Date().toISOString(),
      });
    } catch {
      // silently fail
    }
  }, []);

  const handleUnpinReview = useCallback(async (reviewId: string) => {
    try {
      await unpinReview(reviewId);
      dispatchList({ type: "UNPIN", id: reviewId });
    } catch {
      // silently fail
    }
  }, []);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setReviewContent("");
    setFormError(null);
  }, []);

  const handleOpenForm = useCallback(() => {
    setShowForm(true);
  }, []);

  const commentModeOpen = settings?.comment_mode === "open";

  if (initialLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ReviewsHeader
        counts={counts}
        sortBy={sortBy}
        listLoading={listLoading}
        onSortChange={handleSortChange}
      />
      {commentModeOpen && !showForm && (
        <WriteReviewButton onPress={handleOpenForm} />
      )}
      {showForm && (
        <ReviewForm
          reviewContent={reviewContent}
          reviewIsLike={reviewIsLike}
          submitting={submitting}
          formError={formError}
          onChangeText={setReviewContent}
          onToggleLike={setReviewIsLike}
          onSubmit={handleSubmitReview}
          onCancel={handleCancelForm}
        />
      )}
      <ReviewsList
        listLoading={listLoading}
        reviews={reviews}
        isOwner={isOwner}
        onDelete={handleDeleteReview}
        onPin={handlePinReview}
        onUnpin={handleUnpinReview}
      />
      <LoadMoreButton
        hasMore={hasMore}
        listLoading={listLoading}
        loadingMore={loadingMore}
        onLoadMore={handleLoadMore}
      />
    </View>
  );
}

const WriteReviewButton = memo(function WriteReviewButton({
  onPress,
}: {
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.writeBtn} onPress={onPress}>
      <MessageSquarePlus size={16} color={colors.accent} />
      <Text style={styles.writeBtnText}>Write a review</Text>
    </Pressable>
  );
});

const ReviewsHeader = memo(function ReviewsHeader({
  counts,
  sortBy,
  listLoading,
  onSortChange,
}: {
  counts: ReviewCounts | null;
  sortBy: ReviewSort;
  listLoading: boolean;
  onSortChange: (sort: ReviewSort) => void;
}) {
  return (
    <View style={styles.header}>
      {/* Header with counts and sort */}
      <Text style={styles.heading}>
        Reviews
        {counts ? (
          <Text style={styles.countText}> ({counts.total})</Text>
        ) : null}
      </Text>
      <View style={styles.sortRow}>
        {(["likes", "latest", "oldest"] as ReviewSort[]).map((s) => (
          <Pressable
            key={s}
            onPress={() => onSortChange(s)}
            disabled={listLoading}
            style={[styles.sortBtn, sortBy === s && styles.sortBtnActive]}
          >
            <Text
              style={[styles.sortText, sortBy === s && styles.sortTextActive]}
            >
              {s === "likes" ? "Top" : s === "latest" ? "New" : "Old"}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
});

const ReviewForm = memo(function ReviewForm({
  reviewContent,
  reviewIsLike,
  submitting,
  formError,
  onChangeText,
  onToggleLike,
  onSubmit,
  onCancel,
}: {
  reviewContent: string;
  reviewIsLike: boolean;
  submitting: boolean;
  formError: string | null;
  onChangeText: (text: string) => void;
  onToggleLike: (value: boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={styles.formCard}>
      <View style={styles.likeToggle}>
        <Pressable
          style={[styles.likeOption, reviewIsLike && styles.likeOptionActive]}
          onPress={() => onToggleLike(true)}
        >
          <ThumbsUp
            size={16}
            color={reviewIsLike ? colors.accent : colors.textDim}
          />
          <Text
            style={[
              styles.likeOptionText,
              reviewIsLike && styles.likeOptionTextActive,
            ]}
          >
            Like
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.likeOption,
            !reviewIsLike && styles.dislikeOptionActive,
          ]}
          onPress={() => onToggleLike(false)}
        >
          <ThumbsDown
            size={16}
            color={!reviewIsLike ? colors.danger : colors.textDim}
          />
          <Text
            style={[
              styles.likeOptionText,
              !reviewIsLike && styles.dislikeOptionTextActive,
            ]}
          >
            Dislike
          </Text>
        </Pressable>
      </View>
      <TextInput
        style={styles.input}
        value={reviewContent}
        onChangeText={onChangeText}
        placeholder="Write your review..."
        placeholderTextColor={colors.textPlaceholder}
        multiline
        numberOfLines={3}
      />
      {formError ? <Text style={styles.formError}>{formError}</Text> : null}
      <View style={styles.formActions}>
        <Pressable style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[
            styles.submitBtn,
            (!reviewContent.trim() || submitting) && styles.submitBtnDisabled,
          ]}
          onPress={onSubmit}
          disabled={!reviewContent.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.submitText}>Submit</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
});

const ReviewsList = memo(function ReviewsList({
  listLoading,
  reviews,
  isOwner,
  onDelete,
  onPin,
  onUnpin,
}: {
  listLoading: boolean;
  reviews: Review[];
  isOwner: boolean;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
}) {
  if (listLoading) {
    return (
      <View style={styles.listLoader}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }
  if (reviews.length === 0) {
    return <Text style={styles.emptyText}>No reviews yet. Be the first!</Text>;
  }
  return (
    <View style={styles.list}>
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          isOwner={isOwner}
          onDelete={onDelete}
          onPin={onPin}
          onUnpin={onUnpin}
        />
      ))}
    </View>
  );
});

const LoadMoreButton = memo(function LoadMoreButton({
  hasMore,
  listLoading,
  loadingMore,
  onLoadMore,
}: {
  hasMore: boolean;
  listLoading: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  if (!hasMore || listLoading) return null;
  return (
    <Pressable
      style={styles.loadMoreBtn}
      onPress={onLoadMore}
      disabled={loadingMore}
    >
      {loadingMore ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : (
        <Text style={styles.loadMoreText}>Load more</Text>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 24,
  },
  centered: {
    width: "100%",
    paddingVertical: 32,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  heading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  countText: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: "400",
  },
  sortRow: {
    flexDirection: "row",
    gap: 4,
  },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  sortBtnActive: {
    backgroundColor: colors.accentFaded,
  },
  sortText: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: "600",
  },
  sortTextActive: {
    color: colors.accent,
  },
  writeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.accentFaded,
    borderRadius: 8,
    marginBottom: 12,
  },
  writeBtnText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  likeToggle: {
    flexDirection: "row",
    gap: 8,
  },
  likeOption: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  likeOptionActive: {
    backgroundColor: colors.accentFaded,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  dislikeOptionActive: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  likeOptionText: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: "600",
  },
  likeOptionTextActive: {
    color: colors.accent,
  },
  dislikeOptionTextActive: {
    color: colors.danger,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  formError: {
    color: colors.danger,
    fontSize: 12,
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  cancelText: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: "600",
  },
  submitBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: colors.accent,
    borderRadius: 8,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  listLoader: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textDim,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 20,
  },
  list: {
    gap: 12,
  },
  loadMoreBtn: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  loadMoreText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
  },
});
