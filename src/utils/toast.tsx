import Toast, {
  type ToastConfig,
  type ToastConfigParams,
} from "react-native-toast-message";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "./colors";

function DarkToast({ text1 }: ToastConfigParams<unknown>) {
  return (
    <View style={styles.toast}>
      <Text style={styles.toastText}>{text1}</Text>
    </View>
  );
}

const toastConfig: ToastConfig = {
  success: (props) => <DarkToast {...props} />,
  error: (props) => <DarkToast {...props} />,
};

export function getToastConfig(): ToastConfig {
  return toastConfig;
}

export function toast(message: string, type: "success" | "error" = "success") {
  Toast.show({
    type,
    text1: message,
    position: "top",
    visibilityTime: 2000,
    autoHide: true,
    topOffset: 45,
  });
}

const styles = StyleSheet.create({
  toast: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginHorizontal: 16,
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
  },
  toastText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
