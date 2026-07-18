import React from "react";
import { View, Image, Text, Pressable, StyleSheet } from "react-native";
import { colors } from "../../utils/colors";

export default function Avatar({
  uri,
  name,
  size = 48,
  onPress,
}: {
  uri?: string;
  name?: string;
  size?: number;
  onPress?: () => void;
}) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const content = (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri: uri.includes("?width=") ? uri : `${uri}?width=${size}` }}
          style={[styles.image, { borderRadius: size / 2 }]}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
          {initials}
        </Text>
      )}
    </View>
  );

  if (onPress && uri) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => pressed && { opacity: 0.7 }}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.border,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  initials: {
    color: colors.accent,
    fontWeight: "700",
  },
});
