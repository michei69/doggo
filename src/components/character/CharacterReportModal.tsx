import { memo, useCallback } from "react";
import { reportComment } from "../../api/reviews";
import type { ReportCommentBody } from "../../types/api";
import ReportModal from "../common/ReportModal";

const CHARACTER_REASONS = [
  { label: "Mine, posted without my permission", type: "stolen" },
  { label: "Spam or low quality", type: "spam" },
  { label: "Illegal or harmful content", type: "illegal" },
  { label: "Other", type: "other" },
];

function CharacterReportModal({
  visible,
  characterId,
  onClose,
}: {
  visible: boolean;
  characterId: string;
  onClose: () => void;
}) {
  const handleSubmit = useCallback(
    async ({
      reportType,
      details,
      link,
    }: {
      reportType: string;
      details: string;
      link: string;
    }) => {
      const payload: ReportCommentBody = {
        character_id: characterId,
        reason: reportType,
        details: details.trim(),
        url: `https://janitorai.com/characters/${characterId}`,
      };
      if (reportType === "stolen") {
        payload.originalBotLink = link.trim();
      }
      await reportComment(payload);
    },
    [characterId],
  );

  return (
    <ReportModal
      visible={visible}
      title="Report Character"
      question="Why are you reporting this character?"
      reasons={CHARACTER_REASONS}
      showLinkField
      onSubmit={handleSubmit}
      onClose={onClose}
    />
  );
}

export default memo(CharacterReportModal);
