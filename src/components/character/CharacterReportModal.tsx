import { memo, useCallback } from "react";
import { apiClient } from "../../api/client";
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
      const body: Record<string, string> = {
        character_id: characterId,
        reason: reportType,
        other: details.trim(),
        url: `https://janitorai.com/characters/${characterId}`,
      };
      if (reportType === "stolen") {
        body.originalBotLink = link.trim();
      }
      await apiClient.post("/moderation/report", body);
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
