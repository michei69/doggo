import OptionSheet, { type OptionSheetAction } from "../common/OptionSheet";

export default function MessagesActionsSheet({
  visible,
  onClose,
  onExport,
  onImport,
  onReset,
  onSwitchPersona,
}: {
  visible: boolean;
  onClose: () => void;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
  onSwitchPersona?: () => void;
}) {
  const actions: OptionSheetAction[] = [
    {
      label: "Export Messages",
      onPress: () => {
        onClose();
        onExport();
      },
    },
    {
      label: "Import Messages",
      onPress: () => {
        onClose();
        onImport();
      },
      destructive: true,
    },
    ...(onSwitchPersona
      ? [
          {
            label: "Switch Persona",
            onPress: () => {
              onClose();
              onSwitchPersona();
            },
            destructive: true,
          },
        ]
      : []),
    {
      label: "Reset Messages",
      onPress: () => {
        onClose();
        onReset();
      },
      destructive: true,
    },
  ];

  return (
    <OptionSheet
      visible={visible}
      onClose={onClose}
      title="Messages Actions"
      actions={actions}
    />
  );
}
