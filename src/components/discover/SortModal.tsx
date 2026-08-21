import { useCallback } from "react";
import type React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../../utils/colors";
import { SORT_OPTIONS } from "../../utils/discover";
import CenteredModal from "../../components/common/CenteredModal";
import { useModalHandle } from "../../hooks/useModalHandle";

export interface SortModalHandle {
  open: () => void;
}

export default function SortModal({
  currentSort,
  onSelect,
  ref,
}: { currentSort: string; onSelect: (value: string) => void } & {
  ref?: React.Ref<SortModalHandle>;
}) {
  const { visible, close } = useModalHandle(ref);

  const handleSelect = useCallback(
    (value: string) => {
      close();
      onSelect(value);
    },
    [close, onSelect],
  );

  return (
    <CenteredModal
      visible={visible}
      onClose={close}
      title="Sort by"
      hideCloseButton
      contentStyle={styles.content}
    >
      {SORT_OPTIONS.map((opt) => (
        <Pressable
          key={opt.value}
          style={[
            styles.option,
            opt.value === currentSort && styles.optionSelected,
          ]}
          onPress={() => handleSelect(opt.value)}
        >
          <Text
            style={[
              styles.optionText,
              opt.value === currentSort && styles.optionTextSelected,
            ]}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </CenteredModal>
  );
}

const styles = StyleSheet.create({
  content: {
    maxWidth: 400,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  optionSelected: {
    backgroundColor: colors.accentFaded,
  },
  optionText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  optionTextSelected: {
    color: colors.accent,
    fontWeight: "600",
  },
});
