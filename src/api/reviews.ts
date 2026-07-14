import { apiClient } from "./client";
import type {
    Review,
    ReviewComment,
    ReviewCounts,
    ReviewSettings,
    CreateReviewRequest,
    CreateReviewResponse,
    CreateCommentRequest,
    CreateCommentResponse,
} from "../types/api";

export type ReviewSort = "likes" | "latest" | "oldest";

export interface GetReviewsParams {
    page?: number;
    size?: number;
    sortBy?: ReviewSort;
}

export async function getReviewSettings(
    characterId: string,
): Promise<ReviewSettings> {
    const response = await apiClient.get<ReviewSettings>(
        `/reviews/settings/${characterId}`,
    );
    return response.data;
}

export async function getReviews(
    characterId: string,
    params: GetReviewsParams = {},
): Promise<Review[]> {
    const filteredParams: Record<string, string | number> = {};
    if (params.page !== undefined) filteredParams.page = params.page;
    if (params.size !== undefined) filteredParams.size = params.size;
    if (params.sortBy !== undefined) filteredParams.sortBy = params.sortBy;
    const response = await apiClient.get<Review[]>(`/reviews/${characterId}`, {
        params: filteredParams,
    });
    return response.data;
}

export async function getReviewCounts(
    characterId: string,
): Promise<ReviewCounts> {
    const response = await apiClient.get<ReviewCounts>(
        `/reviews/counts/${characterId}`,
    );
    return response.data;
}

export async function getReviewComments(
    reviewId: string,
): Promise<ReviewComment[]> {
    const response = await apiClient.get<ReviewComment[]>(
        `/reviews/comments/${reviewId}`,
    );
    return response.data.reverse();
}

export async function likeReview(reviewId: string): Promise<string> {
    const response = await apiClient.post<string>(
        `/reviews/like/review/${reviewId}`,
    );
    return response.data;
}

export async function likeComment(commentId: string): Promise<string> {
    const response = await apiClient.post<string>(
        `/reviews/like/comment/${commentId}`,
    );
    return response.data;
}

export async function createReview(
    data: CreateReviewRequest,
): Promise<CreateReviewResponse> {
    const response = await apiClient.post<CreateReviewResponse>(
        "/reviews",
        data,
    );
    return response.data;
}

export async function pinReview(reviewId: string): Promise<void> {
    await apiClient.post(`/reviews/${reviewId}/pin`);
}

export async function unpinReview(reviewId: string): Promise<void> {
    await apiClient.delete(`/reviews/${reviewId}/pin`);
}

export async function createComment(
    data: CreateCommentRequest,
): Promise<CreateCommentResponse> {
    const response = await apiClient.post<CreateCommentResponse>(
        "/reviews/comment",
        data,
    );
    return response.data;
}

export async function deleteComment(commentId: string): Promise<void> {
    await apiClient.delete(`/reviews/comment/${commentId}`);
}

export async function translateComment(
    commentId: string,
    content: string,
): Promise<string> {
    const response = await apiClient.post<{ translated: string }>(
        "/reviews/translate",
        { comment_id: commentId, content },
    );
    return response.data.translated;
}

export async function reportComment(data: {
    comment_id: string;
    review_id: string;
    reason: string;
    details: string;
}): Promise<void> {
    await apiClient.post("/moderation/report", {
        comment_id: data.comment_id,
        review_id: data.review_id,
        reason: data.reason,
        other: data.details,
    });
}

export async function deleteReview(reviewId: string): Promise<void> {
    await apiClient.delete(`/reviews/${reviewId}`);
}
