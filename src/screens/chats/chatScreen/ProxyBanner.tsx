import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../../utils/colors";

const ProxyBanner = React.memo(function ProxyBanner() {
  return (
    <View style={styles.proxyWarningBanner}>
      <Text style={styles.proxyWarningText}>
        This character does not support proxies.
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  proxyWarningBanner: {
    backgroundColor: colors.dangerLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.danger,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  proxyWarningText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
});

export default ProxyBanner;
