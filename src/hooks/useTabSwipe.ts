import { useCallback, useMemo } from "react";
import {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from "react-native-reanimated";
import { Gesture } from "react-native-gesture-handler";

/**
 * Shared tab-swipe skeleton: pan gesture (begin/update), snap-to-tab
 * animation, tab-row layout sync and content/indicator translate styles.
 * The onEnd snap-decision is intentionally left to each call site (their
 * behaviors differ: nearest-index rounding vs distance threshold).
 *
 * pageWidthMode:
 *   - "screen": the page width is the (static) screen width.
 *   - "row":    the page width is the measured tab-row width (dynamic).
 */
export function useTabSwipe({
    tabCount,
    screenWidth,
    pageWidthMode,
    activeIndex,
    onChangeIndex,
}: {
    tabCount: number;
    screenWidth: number;
    pageWidthMode: "screen" | "row";
    activeIndex: number;
    onChangeIndex: (index: number) => void;
}) {
    const tabIndicator = useSharedValue(0);
    const tabRowWidth = useSharedValue(1);
    const translateX = useSharedValue(0);
    const startX = useSharedValue(0);

    const snapToTab = useCallback(
        (index: number) => {
            onChangeIndex(index);
            const pageWidth =
                pageWidthMode === "screen" ? screenWidth : tabRowWidth.value;
            translateX.value = withTiming(-index * pageWidth, {
                duration: 250,
            });
            tabIndicator.value = withTiming(
                index * (tabRowWidth.value / tabCount),
                { duration: 250 },
            );
        },
        [
            translateX,
            tabIndicator,
            tabRowWidth,
            tabCount,
            screenWidth,
            pageWidthMode,
            onChangeIndex,
        ],
    );

    const panGesture = useMemo(
        () =>
            Gesture.Pan()
                .activeOffsetX([-10, 10])
                .failOffsetY([-10, 10])
                .onBegin(() => {
                    startX.value = translateX.value;
                })
                .onUpdate((event) => {
                    const pageWidth =
                        pageWidthMode === "screen"
                            ? screenWidth
                            : tabRowWidth.value;
                    const maxOffset = -(tabCount - 1) * pageWidth;
                    const raw = startX.value + event.translationX;
                    const clamped = Math.max(maxOffset, Math.min(0, raw));
                    translateX.value = clamped;
                    const progress = -clamped / pageWidth;
                    tabIndicator.value =
                        (progress / tabCount) * tabRowWidth.value;
                }),
        [
            translateX,
            startX,
            tabIndicator,
            tabRowWidth,
            tabCount,
            screenWidth,
            pageWidthMode,
        ],
    );

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: tabIndicator.value }],
    }));

    const contentTranslateStyle = useAnimatedStyle(() => ({
        transform: [
            {
                translateX:
                    (translateX.value /
                        Math.max(
                            pageWidthMode === "screen"
                                ? screenWidth
                                : tabRowWidth.value,
                            1,
                        )) *
                    screenWidth,
            },
        ],
    }));

    const handleTabRowLayout = useCallback(
        (width: number) => {
            tabRowWidth.value = width;
            const pageWidth =
                pageWidthMode === "screen" ? screenWidth : width;
            tabIndicator.value = activeIndex * (width / tabCount);
            translateX.value = -activeIndex * pageWidth;
        },
        [
            activeIndex,
            tabIndicator,
            translateX,
            tabRowWidth,
            tabCount,
            screenWidth,
            pageWidthMode,
        ],
    );

    return {
        tabIndicator,
        translateX,
        tabRowWidth,
        snapToTab,
        panGesture,
        indicatorStyle,
        contentTranslateStyle,
        handleTabRowLayout,
    };
}
