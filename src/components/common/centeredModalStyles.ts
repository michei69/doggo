import { StyleSheet } from "react-native";
import { colors } from "../../utils/colors";

// Shared modal-body styles reused by the discover modals that build
// keyword/tag entry rows on top of CenteredModal.
export const centeredModalStyles = StyleSheet.create({
    input: {
        flex: 1,
        backgroundColor: colors.background,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 8,
        color: colors.text,
        fontSize: 14,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    addBtn: {
        backgroundColor: colors.accent,
        borderRadius: 8,
        paddingHorizontal: 16,
        justifyContent: "center",
        alignItems: "center",
    },
    addBtnDisabled: {
        opacity: 0.4,
    },
    addBtnText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: "600",
    },
});
