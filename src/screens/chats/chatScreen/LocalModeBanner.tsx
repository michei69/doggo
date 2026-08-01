import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors } from "../../../utils/colors";

const LocalModeBanner = React.memo(
  function LocalModeBanner({ onDismiss }: { onDismiss: () => void }) {
    return (
      <View style={styles.localModeBanner}>
        <Text style={styles.localModeBannerText}>Local mode enabled.</Text>
        <Pressable onPress={onDismiss} style={styles.localModeBannerClose}>
          <Text style={styles.localModeBannerCloseText}>{"\u2715"}</Text>
        </Pressable>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  localModeBanner: {
    backgroundColor: `${colors.accent}25`,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  localModeBannerText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
    textAlign: "center",
  },
  localModeBannerClose: {
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  localModeBannerCloseText: {
    color: colors.accent,
    fontSize: 16,
    marginTop: -2,
    fontWeight: "600",
  },
});

export default LocalModeBanner;
