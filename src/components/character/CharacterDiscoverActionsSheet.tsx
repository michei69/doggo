import OptionSheet, { type OptionSheetAction } from "../common/OptionSheet";

export default function CharacterDiscoverActionsSheet({
  visible,
  characterName,
  hasCreator,
  onClose,
  onViewCharacter,
  onViewCreator,
  onBlockCharacter,
  onReportCharacter,
}: {
  visible: boolean;
  characterName: string;
  hasCreator: boolean;
  onClose: () => void;
  onViewCharacter: () => void;
  onViewCreator?: () => void;
  onBlockCharacter: () => void;
  onReportCharacter: () => void;
}) {
  const actions: OptionSheetAction[] = [
    {
      label: "View Character",
      onPress: () => {
        onClose();
        onViewCharacter();
      },
    },
    ...(hasCreator && onViewCreator
      ? [
          {
            label: "View Creator",
            onPress: () => {
              onClose();
              onViewCreator();
            },
          },
        ]
      : []),
    {
      label: "Block Character",
      onPress: () => {
        onClose();
        onBlockCharacter();
      },
      destructive: true,
    },
    {
      label: "Report Character",
      onPress: () => {
        onClose();
        onReportCharacter();
      },
      destructive: true,
    },
  ];

  return (
    <OptionSheet
      visible={visible}
      onClose={onClose}
      title={characterName}
      actions={actions}
    />
  );
}
