import { useCallback, useEffect } from "react";
import { useWindowDimensions } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
    useSharedValue,
    withSpring,
    withTiming,
    interpolate,
    cancelAnimation,
    ReduceMotion,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

/**
 * Shared bottom-sheet animation state and gestures.
 *
 * Serves both the generic CustomBottomSheet renderer and the keyboard-aware
 * FormSheet. The caller owns visibility wiring; this hook only owns the shared
 * values, the enter/exit animations, and the drag-to-dismiss pan gesture.
 */
export function useSheetAnimation(onClose: () => void) {
    const { height: windowHeight } = useWindowDimensions();
    // Shared value (not a ref) so worklets can read the latest window height
    // without triggering the "modified after being passed to a worklet" warning.
    const windowHeightSV = useSharedValue(windowHeight);

    useEffect(() => {
        windowHeightSV.value = windowHeight;
    });

    const translateY = useSharedValue(windowHeight);
    const backdropOpacity = useSharedValue(0);
    const dragOffset = useSharedValue(0);
    const isClosing = useSharedValue(false);

    const animateIn = useCallback(() => {
        "worklet";
        const h = windowHeightSV.value;
        cancelAnimation(translateY);
        cancelAnimation(backdropOpacity);
        translateY.value = h;
        translateY.value = withSpring(0, {
            damping: 24,
            stiffness: 200,
            mass: 0.8,
            reduceMotion: ReduceMotion.System,
        });
        backdropOpacity.value = withTiming(1, {
            duration: 200,
            reduceMotion: ReduceMotion.System,
        });
    }, [translateY, backdropOpacity, windowHeightSV]);

    const animateOut = useCallback(
        (onFinish?: () => void) => {
            "worklet";
            if (isClosing.value) return;
            isClosing.value = true;
            const h = windowHeightSV.value;
            cancelAnimation(translateY);
            cancelAnimation(backdropOpacity);
            translateY.value = withTiming(h, {
                duration: 250,
                reduceMotion: ReduceMotion.System,
            });
            backdropOpacity.value = withTiming(
                0,
                { duration: 250, reduceMotion: ReduceMotion.System },
                () => {
                    scheduleOnRN(onFinish ?? onClose);
                },
            );
        },
        [isClosing, translateY, backdropOpacity, onClose, windowHeightSV],
    );

    const panGesture = Gesture.Pan()
        .onStart(() => {
            dragOffset.value = translateY.value;
        })
        .onUpdate((e) => {
            if (e.translationY > 0) {
                translateY.value = dragOffset.value + e.translationY;
                backdropOpacity.value = interpolate(
                    translateY.value,
                    [0, windowHeight * 0.4],
                    [1, 0],
                );
            }
        })
        .onEnd((e) => {
            if (e.translationY > 120 || e.velocityY > 600) {
                animateOut();
            } else {
                cancelAnimation(translateY);
                cancelAnimation(backdropOpacity);
                translateY.value = withSpring(0, {
                    damping: 24,
                    stiffness: 200,
                    mass: 0.8,
                    reduceMotion: ReduceMotion.System,
                });
                backdropOpacity.value = withTiming(1, {
                    duration: 200,
                    reduceMotion: ReduceMotion.System,
                });
            }
        });

    return {
        translateY,
        backdropOpacity,
        isClosing,
        dragOffset,
        animateIn,
        animateOut,
        panGesture,
    };
}
