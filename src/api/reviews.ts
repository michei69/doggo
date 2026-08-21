import { cleanParams, request } from "./request";
import type {
    Review,
    ReviewComment,
    ReviewCounts,
    ReviewSettings,
    CreateReviewRequest,
    CreateReviewResponse,
    CreateCommentRequest,
    CreateCommentResponse,
    EmojiDefinitionsResponse,
    ReviewSort,
    GetReviewsParams,
    TranslateCommentResponse,
    ReportCommentBody,
} from "../types/api";

export async function getReviewSettings(
    characterId: string,
): Promise<ReviewSettings> {
    return request<ReviewSettings>({
        method: "GET",
        url: `/reviews/settings/${characterId}`,
    });
}

export async function getReviews(
    characterId: string,
    params: GetReviewsParams = {},
): Promise<Review[]> {
    return request<Review[]>({
        method: "GET",
        url: `/reviews/${characterId}`,
        params: cleanParams(params),
    });
}

export async function getReviewCounts(
    characterId: string,
): Promise<ReviewCounts> {
    return request<ReviewCounts>({
        method: "GET",
        url: `/reviews/counts/${characterId}`,
    });
}

export async function getReviewComments(
    reviewId: string,
): Promise<ReviewComment[]> {
    return request<ReviewComment[]>({
        method: "GET",
        url: `/reviews/comments/${reviewId}`,
    });
}

export async function likeReview(reviewId: string): Promise<string> {
    return request<string>({
        method: "POST",
        url: `/reviews/like/review/${reviewId}`,
    });
}

export async function likeComment(commentId: string): Promise<string> {
    return request<string>({
        method: "POST",
        url: `/reviews/like/comment/${commentId}`,
    });
}

export async function createReview(
    data: CreateReviewRequest,
): Promise<CreateReviewResponse> {
    return request<CreateReviewResponse>({
        method: "POST",
        url: "/reviews",
        data,
    });
}

export async function pinReview(reviewId: string): Promise<void> {
    await request<void>({
        method: "POST",
        url: `/reviews/${reviewId}/pin`,
    });
}

export async function unpinReview(reviewId: string): Promise<void> {
    await request<void>({
        method: "DELETE",
        url: `/reviews/${reviewId}/pin`,
    });
}

export async function createComment(
    data: CreateCommentRequest,
): Promise<CreateCommentResponse> {
    return request<CreateCommentResponse>({
        method: "POST",
        url: "/reviews/comment",
        data,
    });
}

export async function deleteComment(commentId: string): Promise<void> {
    await request<void>({
        method: "DELETE",
        url: `/reviews/comment/${commentId}`,
    });
}

export async function translateComment(
    commentId: string,
    content: string,
): Promise<string> {
    const response = await request<TranslateCommentResponse>({
        method: "POST",
        url: "/reviews/translate",
        data: { comment_id: commentId, content },
    });
    return response.translated;
}

export async function reportComment(data: ReportCommentBody): Promise<void> {
    await request<void>({
        method: "POST",
        url: "/moderation/report",
        data: {
            comment_id: data.comment_id,
            review_id: data.review_id,
            character_id: data.character_id,
            reason: data.reason,
            other: data.details,
            url: data.url,
            originalBotLink: data.originalBotLink,
        },
    });
}

export async function deleteReview(reviewId: string): Promise<void> {
    await request<void>({
        method: "DELETE",
        url: `/reviews/${reviewId}`,
    });
}

export async function fetchEmojiDefinitions(): Promise<EmojiDefinitionsResponse> {
    return request<EmojiDefinitionsResponse>({
        method: "GET",
        url: "/reviews/emoji-definitions",
    });
}

export async function reactToReview(
    reviewId: string,
    emojiId: string,
): Promise<void> {
    await request<void>({
        method: "POST",
        url: `/reviews/react/review/${reviewId}`,
        data: { emoji: emojiId },
    });
}

export async function removeReviewReaction(reviewId: string): Promise<void> {
    await request<void>({
        method: "DELETE",
        url: `/reviews/react/review/${reviewId}`,
    });
}

export async function reactToComment(
    commentId: string,
    emojiId: string,
): Promise<void> {
    await request<void>({
        method: "POST",
        url: `/reviews/react/comment/${commentId}`,
        data: { emoji: emojiId },
    });
}

export async function removeCommentReaction(
    commentId: string,
): Promise<void> {
    await request<void>({
        method: "DELETE",
        url: `/reviews/react/comment/${commentId}`,
    });
}
