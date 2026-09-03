import { useWindowDimensions } from "react-native";

export function useIsTablet(): boolean {
    const { width, height } = useWindowDimensions();
    return Math.min(width, height) >= 600;
}
