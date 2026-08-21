import { useReducer, useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Button from "../../components/common/Button";
import TextInput from "../../components/common/TextInput";
import { useAuthStore } from "../../stores/authStore";
import { useTurnstile } from "../../components/turnstile/TurnstileProvider";
import { TURNSTILE_LOGIN_SITE_KEY } from "../../utils/turnstile";
import { colors } from "../../utils/colors";
import type { AuthStackParamList } from "../../navigation/types";

type Nav = NativeStackNavigationProp<AuthStackParamList, "Register">;

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
  loading: boolean;
  error: string;
}

type FormAction =
  | { type: "SET_EMAIL"; payload: string }
  | { type: "SET_PASSWORD"; payload: string }
  | { type: "SET_CONFIRM"; payload: string }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_EMAIL":
      return { ...state, email: action.payload };
    case "SET_PASSWORD":
      return { ...state, password: action.payload };
    case "SET_CONFIRM":
      return { ...state, confirmPassword: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
  }
}

export default function RegisterScreen() {
  const { goBack } = useNavigation<Nav>();
  const [state, dispatch] = useReducer(formReducer, {
    email: "",
    password: "",
    confirmPassword: "",
    loading: false,
    error: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const register = useAuthStore((s) => s.register);
  const { showTurnstile } = useTurnstile();

  const handleRegister = useCallback(async () => {
    const { email, password, confirmPassword } = state;
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      dispatch({ type: "SET_ERROR", payload: "Please fill in all fields" });
      return;
    }
    if (password !== confirmPassword) {
      dispatch({ type: "SET_ERROR", payload: "Passwords do not match" });
      return;
    }
    if (password.length < 6) {
      dispatch({
        type: "SET_ERROR",
        payload: "Password must be at least 6 characters",
      });
      return;
    }

    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: "" });

    try {
      const captchaToken = await showTurnstile(TURNSTILE_LOGIN_SITE_KEY);
      useAuthStore.getState().setTurnstileToken(captchaToken);
      await register(email.trim(), password, captchaToken);
    } catch (err: any) {
      if (err.message !== "User cancelled") {
        if (err.response?.data?.message) {
          dispatch({ type: "SET_ERROR", payload: err.response.data.message });
        } else {
          dispatch({
            type: "SET_ERROR",
            payload: err.message || "Registration failed",
          });
        }
      }
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [state, register, showTurnstile]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join the community</Text>

        {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

        <TextInput
          label="Email"
          value={state.email}
          onChangeText={(v) => dispatch({ type: "SET_EMAIL", payload: v })}
          placeholder="your@email.com"
          keyboardType="email-address"
          autoComplete="email"
        />

        <View style={styles.passwordWrapper}>
          <TextInput
            label="Password"
            value={state.password}
            onChangeText={(v) => dispatch({ type: "SET_PASSWORD", payload: v })}
            placeholder="Min. 6 characters"
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            style={styles.passwordInput}
          />
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeBtn}
          >
            <Text style={styles.eyeIcon}>
              {showPassword ? "\u25C9" : "\u25CE"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.passwordWrapper}>
          <TextInput
            label="Confirm Password"
            value={state.confirmPassword}
            onChangeText={(v) => dispatch({ type: "SET_CONFIRM", payload: v })}
            placeholder="Re-enter your password"
            secureTextEntry={!showConfirm}
            autoComplete="new-password"
            style={styles.passwordInput}
          />
          <Pressable
            onPress={() => setShowConfirm(!showConfirm)}
            style={styles.eyeBtn}
          >
            <Text style={styles.eyeIcon}>
              {showConfirm ? "\u25C9" : "\u25CE"}
            </Text>
          </Pressable>
        </View>

        <Button
          title="Create Account"
          onPress={handleRegister}
          loading={state.loading}
          style={styles.button}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Text style={styles.link} onPress={() => goBack()}>
            Sign In
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 16,
    marginBottom: 32,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: "rgba(231, 76, 60, 0.1)",
    padding: 12,
    borderRadius: 8,
    overflow: "hidden",
  },
  button: {
    marginTop: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    color: colors.textDim,
    fontSize: 14,
  },
  link: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  passwordWrapper: {
    position: "relative",
    marginBottom: 16,
  },
  passwordInput: {
    marginBottom: 0,
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: 30,
    padding: 8,
  },
  eyeIcon: {
    color: colors.textFaint,
    fontSize: 18,
  },
});
