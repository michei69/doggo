import { useMemo } from "react";
import { RefreshControl } from "react-native";
import { colors } from "../../utils/colors";

export function useRefreshControl(
  refreshing: boolean,
  onRefresh: () => void,
  androidColors?: string[],
) {
  return useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={colors.accent}
        colors={androidColors}
      />
    ),
    [refreshing, onRefresh, androidColors],
  );
}
