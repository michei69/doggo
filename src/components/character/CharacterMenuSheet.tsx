import { memo, useCallback } from "react";
import { Share } from "react-native";
import OptionSheet, { type OptionSheetAction } from "../common/OptionSheet";

function CharacterMenuSheet({
  visible,
  isOwner,
  onClose,
  onViewCreator,
  onOpenSettings,
  onEditCharacter,
  onDeleteCharacter,
  onCopyCharacter,
  onReportCharacter,
  characterId,
  characterName,
}: {
  visible: boolean;
  isOwner: boolean;
  onClose: () => void;
  onViewCreator: () => void;
  onOpenSettings: () => void;
  onEditCharacter: () => void;
  onDeleteCharacter: () => void;
  onCopyCharacter: () => void;
  onReportCharacter: () => void;
  characterId: string;
  characterName: string;
}) {
  const handleShare = useCallback(async () => {
    const url = `https://janitorai.com/characters/${characterId}_${encodeURIComponent(characterName)}`;
    try {
      await Share.share({ url, message: url });
    } catch {
      // silently fail
    }
  }, [characterId, characterName]);

  const actions: OptionSheetAction[] = [
    { label: "Share", onPress: handleShare },
    { label: "View Creator", onPress: onViewCreator },
    ...(isOwner
      ? [
          { label: "Character Settings", onPress: onOpenSettings },
          { label: "Edit Character", onPress: onEditCharacter },
          {
            label: "Delete Character",
            onPress: onDeleteCharacter,
            destructive: true,
          },
        ]
      : [
          { label: "Copy Character", onPress: onCopyCharacter },
          {
            label: "Report Character",
            onPress: onReportCharacter,
            destructive: true,
          },
        ]),
  ];

  return (
    <OptionSheet
      visible={visible}
      onClose={onClose}
      actions={actions}
      variant="menu"
    />
  );
}

export default memo(CharacterMenuSheet);
