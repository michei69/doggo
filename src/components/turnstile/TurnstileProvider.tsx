import React, { use, useCallback, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { useAuthStore } from "../../stores/authStore";
import { getSiteUrl } from "../../utils/baseUrl";
import { TURNSTILE_HTML } from "../../utils/turnstile";
import { setUserAgent } from "../../utils/userAgent";
import { storage } from "../../utils/storage";
import { colors } from "../../utils/colors";
import CookieManager from "@react-native-cookies/cookies";

interface TurnstileContextValue {
  showTurnstile: (siteKey: string) => Promise<string>;
  showChallenge: (challengeHtml: string) => Promise<string>;
  isVisible: boolean;
}

const TurnstileContext = React.createContext<TurnstileContextValue>({
  showTurnstile: async () => {
    throw new Error("TurnstileProvider not mounted");
  },
  showChallenge: async () => {
    throw new Error("TurnstileProvider not mounted");
  },
  isVisible: false,
});

export function useTurnstile() {
  return use(TurnstileContext);
}

export default function TurnstileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const [webViewSource, setWebViewSource] = useState<{
    html: string;
    baseUrl: string;
  }>({
    html: TURNSTILE_HTML,
    baseUrl: getSiteUrl(),
  });

  const readyRef = useRef(false);
  const webViewRef = useRef<WebView>(null);
  const resolveRef = useRef<((token: string) => void) | null>(null);
  const rejectRef = useRef<((err: Error) => void) | null>(null);
  const pendingSiteKeyRef = useRef<string | null>(null);
  const challengeStartedRef = useRef(false);

  const setCfClearance = useAuthStore((s) => s.setCfClearance);
  const setCfBm = useAuthStore((s) => s.setCfBm);

  const injectRender = useCallback((siteKey: string) => {
    const webView = webViewRef.current;
    if (typeof webView?.injectJavaScript !== "function") return;
    try {
      webView.injectJavaScript(
        `window.renderTurnstile('${siteKey}'); true;`,
      );
    } catch {
      // The WebView may be mid-reload; ignore it rather than crashing the
      // login promise. The READY handler retries via pendingSiteKeyRef.
    }
  }, []);

  const cleanup = useCallback(() => {
    challengeStartedRef.current = false;
    pendingSiteKeyRef.current = null;
    resolveRef.current = null;
    rejectRef.current = null;
  }, []);

  const solveAndClose = useCallback(
    (token: string) => {
      setCfClearance(token);
      setVisible(false);
      resolveRef.current?.(token);
      cleanup();
    },
    [setCfClearance, cleanup],
  );

  const pollForClearance = useCallback(async () => {
    try {
      const cookies = await CookieManager.get(getSiteUrl());
      const clearance = cookies.cf_clearance ?? cookies["cf-clearance"];
      const bm = cookies.__cf_bm ?? cookies["cf-bm"];
      if (clearance && bm) {
        setCfClearance(clearance.value);
        setCfBm(bm.value);
        setVisible(false);
        resolveRef.current?.(clearance.value);
        cleanup();
      }
    } catch {}
  }, [setCfClearance, setCfBm, cleanup]);

  const handleMessage = useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        switch (data.type) {
          case "USER_AGENT":
            setUserAgent(data.ua || "");
            storage.setUserAgent(data.ua || "");
            break;
          case "READY":
            readyRef.current = true;
            if (pendingSiteKeyRef.current) {
              injectRender(pendingSiteKeyRef.current);
            }
            break;
          case "TURNSTILE_SUCCESS":
            solveAndClose(data.token);
            break;
          case "TURNSTILE_ERROR":
            rejectRef.current?.(
              new Error(data.error || "Turnstile verification failed"),
            );
            cleanup();
            break;
          case "TURNSTILE_EXPIRED":
            break;
        }
      } catch {}
    },
    [injectRender, solveAndClose, cleanup],
  );

  const handleNavigation = useCallback(
    (navState: WebViewNavigation) => {
      if (!challengeStartedRef.current) return;

      const title = (navState.title || "").toLowerCase();
      if (title.startsWith("janitor")) {
        pollForClearance();
      }
    },
    [pollForClearance],
  );

  const showTurnstile = useCallback(
    (siteKey: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        cleanup();
        resolveRef.current = resolve;
        rejectRef.current = reject;
        pendingSiteKeyRef.current = siteKey;
        setWebViewSource({
          html: TURNSTILE_HTML,
          baseUrl: getSiteUrl(),
        });
        setVisible(true);

        if (readyRef.current) {
          injectRender(siteKey);
        }
      });
    },
    [injectRender, cleanup],
  );

  const showChallenge = useCallback(
    (challengeHtml: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        cleanup();
        resolveRef.current = resolve;
        rejectRef.current = reject;
        challengeStartedRef.current = true;
        setWebViewSource({
          html: challengeHtml,
          baseUrl: getSiteUrl(),
        });
        setVisible(true);
      });
    },
    [cleanup],
  );

  const handleClose = useCallback(() => {
    setVisible(false);
    rejectRef.current?.(new Error("User cancelled"));
    cleanup();
  }, [cleanup]);

  const contextValue = useMemo(
    () => ({ showTurnstile, showChallenge, isVisible: visible }),
    [showTurnstile, showChallenge, visible],
  );

  return (
    <TurnstileContext.Provider value={contextValue}>
      {children}
      <Modal visible={visible} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Security Check</Text>
              <Pressable
                onPress={handleClose}
                style={({ pressed }) => [
                  styles.closeBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.closeText}>{"\u2715"}</Text>
              </Pressable>
            </View>
            <View style={styles.webviewContainer}>
              <WebView
                ref={webViewRef}
                source={webViewSource}
                onMessage={handleMessage}
                onNavigationStateChange={handleNavigation}
                javaScriptEnabled
                domStorageEnabled
                style={styles.webview}
                originWhitelist={["*"]}
                mixedContentMode="compatibility"
                sharedCookiesEnabled={true}
                thirdPartyCookiesEnabled={true}
                injectedJavaScript="window.ReactNativeWebView.postMessage(JSON.stringify({type:'USER_AGENT', ua: navigator.userAgent})); true;"
              />
            </View>
          </View>
        </View>
      </Modal>
    </TurnstileContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "90%",
    maxHeight: "60%",
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    color: colors.textPlaceholder,
    fontSize: 16,
    fontWeight: "600",
  },
  webviewContainer: {
    height: 200,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.transparent,
  },
});
