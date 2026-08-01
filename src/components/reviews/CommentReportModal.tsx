import { memo, useCallback } from "react";
import { reportComment } from "../../api/reviews";
import ReportModal from "../common/ReportModal";

const COMMENT_REASONS = [
  { label: "Spam or low quality", type: "spam" },
  { label: "Harassment or hate speech", type: "harassment" },
  { label: "Illegal or harmful content", type: "illegal" },
  { label: "Other", type: "other" },
];

function CommentReportModal({
  visible,
  commentId,
  reviewId,
  onClose,
}: {
  visible: boolean;
  commentId: string;
  reviewId: string;
  onClose: () => void;
}) {
  const handleSubmit = useCallback(
    async ({
      reportType,
      details,
    }: {
      reportType: string;
      details: string;
      link: string;
    }) => {
      await reportComment({
        comment_id: commentId,
        review_id: reviewId,
        reason: reportType,
        details: details.trim(),
      });
    },
    [commentId, reviewId],
  );

  return (
    <ReportModal
      visible={visible}
      title="Report Comment"
      question="Why are you reporting this comment?"
      reasons={COMMENT_REASONS}
      onSubmit={handleSubmit}
      onClose={onClose}
    />
  );
}

export default memo(CommentReportModal);
