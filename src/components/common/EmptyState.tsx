import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { colors } from "../../utils/colors";

export default function EmptyState({
  title,
  text,
  subtext,
  children,
  containerStyle,
  titleStyle,
  textStyle,
  subtextStyle,
}: {
  title?: string;
  text: string;
  subtext?: string;
  children?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  textStyle?: StyleProp<TextStyle>;
  subtextStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={[styles.container, containerStyle]}>
      {title ? <Text style={[styles.title, titleStyle]}>{title}</Text> : null}
      <Text style={[styles.text, textStyle]}>{text}</Text>
      {subtext ? (
        <Text style={[styles.subtext, subtextStyle]}>{subtext}</Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  text: {
    color: colors.textDim,
    fontSize: 14,
  },
  subtext: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
});
