import { useEffect } from "react";
import {
  Modal,
  Pressable,
  Text,
  View,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { colors } from "../../utils/colors";
import { AVATAR_THUMB_WIDTH } from "../../utils/assets";

const MAX_SCALE = 5;
const MIN_SCALE = 1;

export default function AvatarPreview({
  visible,
  uri,
  onClose,
}: {
  visible: boolean;
  uri: string;
  onClose: () => void;
}) {
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const CX = SCREEN_W / 2;
  const CY = SCREEN_H / 2;
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const resetZoom = () => {
    "worklet";
    scale.value = withTiming(1, { duration: 200 });
    translateX.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(0, { duration: 200 });
  };

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      const newScale = Math.min(
        Math.max(savedScale.value * e.scale, MIN_SCALE),
        MAX_SCALE,
      );
      const s1 = savedScale.value;
      const s2 = newScale;
      scale.value = s2;
      // Anchor zoom at focal point.
      // RN default transformOrigin = "center", so formula uses 1/s2 - 1/s1,
      // NOT (1 - scaleRatio) which assumes top-left origin.
      translateX.value =
        (e.focalX - CX) * (1 / s2 - 1 / s1) + savedTranslateX.value;
      translateY.value =
        (e.focalY - CY) * (1 / s2 - 1 / s1) + savedTranslateY.value;
    })
    .onEnd(() => {
      if (scale.value < MIN_SCALE) {
        resetZoom();
      }
    });

  const pan = Gesture.Pan()
    .minPointers(1)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    });

  const tap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      if (scale.value > 1.05) {
        resetZoom();
      }
    });

  const composed = Gesture.Race(Gesture.Simultaneous(pinch, pan), tap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  useEffect(() => {
    if (visible) {
      scale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
    }
  }, [visible, scale, translateX, translateY]);

  if (!uri) return null;
  const previewUri = uri.replace(/\?width=\d+$/, "");
  const previewThumbUri = `${previewUri}?width=${AVATAR_THUMB_WIDTH}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.root}>
        <GestureDetector gesture={composed}>
          <View style={styles.overlay}>
            <Animated.View style={[styles.image, animatedStyle]}>
              <Image
                source={{ uri: previewUri }}
                placeholder={{ uri: previewThumbUri }}
                placeholderContentFit="contain"
                style={styles.image}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </Animated.View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  closeBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
});
