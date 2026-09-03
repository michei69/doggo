import { useCallback, useMemo } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { EnrichedMarkdownText } from "react-native-enriched-markdown";
import CharacterIdentity from "../../../components/character/CharacterIdentity";
import { colors } from "../../../utils/colors";
import { htmlToMarkdown } from "../../../utils/markdown";
import { markdownStyle } from "../../../utils/markdownStyle";
import { useNavigateToJanitorLink } from "../../../utils/janitorLinks";
import type { TrendingCharacter } from "../../../types/api";

export type SwipeDirection = "right" | "left" | "down";

const SPRING_CONFIG = { damping: 18, stiffness: 200, mass: 0.8 };
const TINT_RANGE = 110;
const EXIT_DURATION = 200;

export default function SwipeCard({
  character,
  onSwiped,
  style,
}: {
  character: TrendingCharacter;
  onSwiped?: (direction: SwipeDirection) => void;
  style?: object;
}) {
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);

  const interactive = onSwiped !== undefined;
  const onLinkPress = useNavigateToJanitorLink();
  const descriptionMarkdown = useMemo(
    () => htmlToMarkdown(character.description || ""),
    [character.description],
  );

  const panGesture = useMemo(() => {
    if (!interactive) return null;
    return Gesture.Pan()
      .activeOffsetX([-15, 15])
      .activeOffsetY([-15, 15])
      .onUpdate((e) => {
        translateX.value = e.translationX;
        translateY.value = e.translationY;
        rotate.value = Math.max(-15, Math.min(15, e.translationX / 30));
      })
      .onEnd((e) => {
        const { translationX, translationY, velocityX, velocityY } = e;
        const horizontal = Math.abs(translationX) > Math.abs(translationY);
        let direction: SwipeDirection | null = null;
        if (horizontal && (translationX > 100 || velocityX > 800)) {
          direction = "right";
        } else if (horizontal && (translationX < -100 || velocityX < -800)) {
          direction = "left";
        } else if (!horizontal && translationY > 100 && velocityY > 300) {
          direction = "down";
        }

        if (!direction) {
          translateX.value = withSpring(0, SPRING_CONFIG);
          translateY.value = withSpring(0, SPRING_CONFIG);
          rotate.value = withSpring(0, SPRING_CONFIG);
          return;
        }

        const targetX =
          direction === "right"
            ? SCREEN_W * 1.4
            : direction === "left"
              ? -SCREEN_W * 1.4
              : translationX;
        const targetY = direction === "down" ? SCREEN_H * 1.4 : translationY;
        const targetRotate =
          direction === "right"
            ? 20
            : direction === "left"
              ? -20
              : rotate.value;

        translateX.value = withTiming(targetX, {
          duration: EXIT_DURATION,
        });
        translateY.value = withTiming(targetY, {
          duration: EXIT_DURATION,
        });
        rotate.value = withTiming(
          targetRotate,
          { duration: EXIT_DURATION },
          (finished) => {
            if (finished) {
              scheduleOnRN(onSwiped, direction);
            }
          },
        );
      });
  }, [
    interactive,
    onSwiped,
    SCREEN_W,
    SCREEN_H,
    translateX,
    translateY,
    rotate,
  ]);

  const animatedStyle = useAnimatedStyle(() => {
    const x = translateX.value;
    const y = translateY.value;
    const rot = rotate.value;
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${rot}deg` },
      ],
    };
  });

  const tintStyle = useAnimatedStyle(() => {
    const x = translateX.value;
    const y = translateY.value;
    const horizontal = Math.abs(x) > Math.abs(y);
    let backgroundColor: string = colors.transparent;
    let opacity = 0;
    if (horizontal) {
      const p = Math.min(Math.abs(x) / TINT_RANGE, 1);
      backgroundColor = x > 0 ? colors.success : colors.danger;
      opacity = p * 0.45;
    } else if (y > 0) {
      const p = Math.min(y / TINT_RANGE, 1);
      backgroundColor = colors.scrim;
      opacity = p;
    }
    return { backgroundColor, opacity };
  });

  const dimStyle = useAnimatedStyle(() => {
    const x = translateX.value;
    const y = translateY.value;
    const horizontal = Math.abs(x) > Math.abs(y);
    const down = !horizontal && y > 0 ? Math.min(y / TINT_RANGE, 1) : 0;
    return { opacity: 1 - down * 0.7 };
  });

  const cardContent = (
    <View style={styles.inner}>
      <CharacterIdentity
        character={character}
        variant="full"
        avatarSize={140}
        name={
          <Text style={styles.name} numberOfLines={2}>
            {character.name}
          </Text>
        }
        footer={
          character.description ? (
            <View style={styles.descSection}>
              <View style={styles.descCollapsed}>
                <EnrichedMarkdownText
                  markdown={descriptionMarkdown}
                  markdownStyle={markdownStyle}
                  selectable={false}
                  onLinkPress={onLinkPress}
                />
              </View>
            </View>
          ) : null
        }
      />
    </View>
  );

  return (
    <>
      {interactive && panGesture ? (
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.card, style, animatedStyle, dimStyle]}>
            {cardContent}
            <Animated.View
              pointerEvents="none"
              style={[styles.tintOverlay, tintStyle]}
            />
          </Animated.View>
        </GestureDetector>
      ) : (
        <Animated.View style={[styles.card, style, animatedStyle]}>
          {cardContent}
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: "hidden",
    marginHorizontal: 16,
    marginVertical: 8,
  },
  tintOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 20,
  },
  inner: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    backgroundColor: colors.card,
  },
  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 12,
  },
  descSection: {
    width: "100%",
    paddingHorizontal: 4,
    marginVertical: 12,
  },
  descCollapsed: {
    maxHeight: 130,
    overflow: "hidden",
  },
});
