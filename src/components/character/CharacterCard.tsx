import { useCallback, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import CharacterIdentity from "./CharacterIdentity";
import { colors } from "../../utils/colors";
import type { TrendingCharacter } from "../../types/api";

export default function CharacterCard({
  character,
  onPress,
  onLongPress,
  hidden,
  onToggleHidden,
  style,
}: {
  character: TrendingCharacter;
  onPress: () => void;
  onLongPress?: () => void;
  hidden?: boolean;
  onToggleHidden?: () => void;
  style?: object;
}) {
  const handleSwipe = useCallback(() => {
    onToggleHidden?.();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    Toast.show({
      type: "success",
      text1: "Hidden",
      position: "top",
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 45,
      onPress: () => onToggleHidden?.(),
    });
  }, [onToggleHidden]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-30, 30])
        .failOffsetY([-10, 10])
        .onEnd((e) => {
          if (Math.abs(e.translationX) > 60) {
            scheduleOnRN(handleSwipe);
          }
        }),
    [handleSwipe],
  );

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: hidden ? withSpring(0.3) : withSpring(1),
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, style, animatedCardStyle]}>
        <Pressable
          style={({ pressed }) => pressed && styles.pressed}
          onPress={onPress}
          onLongPress={onLongPress}
        >
          <View style={styles.inner}>
            <CharacterIdentity
              character={character}
              variant="compact"
              avatarSize={76}
              hidden={hidden}
              name={
                <Text
                  style={[styles.name, hidden && styles.textHidden]}
                  numberOfLines={1}
                >
                  {character.name}
                </Text>
              }
            />
          </View>
        </Pressable>
        {hidden && <View style={styles.greyOverlay} />}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    position: "relative",
  },
  pressed: {
    opacity: 0.7,
  },
  inner: {
    flexDirection: "column",
    backgroundColor: colors.card,
    padding: 12,
    alignItems: "center",
  },
  greyOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.scrim,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  textHidden: {
    color: colors.textDimAlt,
  },
});
