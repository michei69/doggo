import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { colors } from "../../utils/colors";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
} from "react-native-reanimated";

function Dot({ index }: { index: number }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      index * 150,
      withRepeat(withTiming(-8, { duration: 400 }), -1, true),
    );
  }, [index, translateY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

export default function TypingDots() {
  return (
    <View style={styles.container}>
      <Dot index={0} />
      <Dot index={1} />
      <Dot index={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.textFaint,
  },
});
