import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

export function useKeyboardHeight(): number {
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        const eventShow: "keyboardWillShow" | "keyboardDidShow" =
            Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
        const eventHide: "keyboardWillHide" | "keyboardDidHide" =
            Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
        const show = Keyboard.addListener(eventShow, (e: any) =>
            setKeyboardHeight(e.endCoordinates.height),
        );
        const hide = Keyboard.addListener(eventHide, () =>
            setKeyboardHeight(0),
        );
        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

    return keyboardHeight;
}
