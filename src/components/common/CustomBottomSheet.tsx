import type React from "react";
import { useEffect, useRef } from "react";
import { StyleSheet, Pressable, View, useWindowDimensions } from "react-native";
import { colors } from "../../utils/colors";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import {
  registerSheet,
  updateSheet,
  unregisterSheet,
} from "../../stores/sheetStore";
import { useSheetAnimation } from "../../hooks/useSheetAnimation";

function Proxy({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const keyRef = useRef(-1);

  useEffect(() => {
    if (keyRef.current < 0) {
      keyRef.current = registerSheet(visible, onClose, children);
    }
    updateSheet(keyRef.current, visible, onClose, children);
  });

  useEffect(() => {
    const key = keyRef.current;
    return () => {
      if (key >= 0) unregisterSheet(key);
    };
  }, []);

  return null;
}

function SheetRenderer({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const isTablet = Math.min(windowWidth, windowHeight) >= 600;
  const sheetMaxWidth = 500;
  const sheetInset = Math.max(0, (windowWidth - sheetMaxWidth) / 2);
  const {
    translateY,
    backdropOpacity,
    isClosing,
    animateIn,
    animateOut,
    panGesture,
  } = useSheetAnimation(onClose);
  const wasVisible = useRef(false);

  useEffect(() => {
    if (visible) {
      wasVisible.current = true;
      isClosing.value = false;
      translateY.value = windowHeight;
      backdropOpacity.value = 0;
      animateIn();
    } else if (wasVisible.current) {
      animateOut();
    }
  }, [
    visible,
    isClosing,
    translateY,
    backdropOpacity,
    windowHeight,
    animateIn,
    animateOut,
  ]);

  const rContainerStyle = useAnimatedStyle(() => ({
    pointerEvents:
      backdropOpacity.value > 0.01 ? ("auto" as const) : ("none" as const),
  }));

  const rBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const rSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, rContainerStyle]}>
      <Pressable style={styles.backdropTouchable} onPress={() => animateOut()}>
        <Animated.View style={[styles.backdrop, rBackdropStyle]} />
      </Pressable>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.sheet,
            rSheetStyle,
            isTablet && {
              left: sheetInset,
              right: sheetInset,
              borderRadius: 20,
              borderBottomWidth: 1,
            },
          ]}
        >
          <View style={styles.handle}>
            <View style={styles.handleBar} />
          </View>
          {children}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

export default function CustomBottomSheet(props: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Renders via portal: Proxy registers with SheetPortalHost, returns null.
  // SheetPortalHost renders the sheet above the tab bar using SheetRenderer.
  return <Proxy {...props} />;
}

// Exported for SheetPortalHost to render the actual sheet UI
export { SheetRenderer };

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  backdropTouchable: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlayMedium,
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  handle: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textDimAlt,
  },
});
