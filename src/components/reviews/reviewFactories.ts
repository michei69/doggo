import type { AuthUser, ReviewUserProfile } from "../../types/api";

export function makeReviewUserProfile(
    user: AuthUser | null,
): ReviewUserProfile {
    return {
        avatar: user?.user_metadata?.sub ?? "",
        is_verified: false,
        name: user?.user_metadata?.email ?? "",
        plusbadge: false,
        user_name: user?.user_metadata?.email ?? "",
    };
}
