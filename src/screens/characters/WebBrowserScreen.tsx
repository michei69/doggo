import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    BackHandler,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type {
    CompositeNavigationProp,
    RouteProp,
} from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { WebView } from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";
import * as ImageManipulator from "expo-image-manipulator";
import { downloadAsync, cacheDirectory } from "expo-file-system/legacy";
import { X } from "lucide-react-native";
import { getTags } from "../../api/characters";
import { uploadFile } from "../../api/profile";
import CustomAlert from "../../components/common/CustomAlert";
import { useAlert } from "../../hooks/useAlert";
import { colors } from "../../utils/colors";
import { storage } from "../../utils/storage";
import type {
    CharactersStackParamList,
    MainTabParamList,
} from "../../navigation/types";
import type { BotFormState } from "./createBot/botFormState";

type Nav = CompositeNavigationProp<
    NativeStackNavigationProp<CharactersStackParamList, "WebBrowser">,
    BottomTabNavigationProp<MainTabParamList>
>;

type Route = RouteProp<CharactersStackParamList, "WebBrowser">;

/**
 * Runs on every document load inside the WebView. On character pages
 * (jannyai.com/characters/:id, excluding /characters/search) it intercepts
 * the "Download" button, reads the serialized island props, decodes the
 * version-tagged payload, and forwards it to React Native.
 */
const INJECTED_JS = `
(function () {
    if (window.__jannyInterceptorInstalled) return;
    window.__jannyInterceptorInstalled = true;

    function isCharacterPage() {
        var path = window.location.pathname || "";
        return path.indexOf("/characters/") === 0 && path !== "/characters/search";
    }

    function decode(v) {
        if (Array.isArray(v) && v.length === 2 && typeof v[0] === "number") {
            var tag = v[0];
            var payload = v[1];
            if (tag === 1) return payload.map(decode);
            if (tag === 0) return decode(payload);
        }
        if (Array.isArray(v)) return v.map(decode);
        if (v !== null && typeof v === "object") {
            var out = {};
            for (var k in v) {
                if (Object.prototype.hasOwnProperty.call(v, k)) {
                    out[k] = decode(v[k]);
                }
            }
            return out;
        }
        return v;
    }

    function handleClick(e) {
        if (!isCharacterPage()) return;
        var btn = e.target;
        while (btn && btn !== document.body && btn.tagName !== "BUTTON") {
            btn = btn.parentElement;
        }
        if (!btn || btn === document.body) return;
        if (!btn.innerText || btn.innerText.trim() !== "Download") return;
        e.preventDefault();
        e.stopPropagation();

        var island = btn.closest ? btn.closest("astro-island") : null;
        if (!island) {
            island = document.querySelector("astro-island:has(div button)");
        }
        if (!island) return;
        var raw = island.getAttribute("props");
        if (!raw) return;
        var parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (err) {
            return;
        }
        var data = decode(parsed);
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(
                JSON.stringify({ type: "janny-import", data: data })
            );
        }
    }

    document.addEventListener("click", handleClick, true);
})();
`;

async function importJannyCharacter(data: any, nav: Nav): Promise<void> {
    const character = data?.character ?? {};
    const imageUrl = data?.imageUrl || character.avatar || "";

    let avatar = "";
    if (imageUrl) {
        try {
            const download = await downloadAsync(
                imageUrl,
                `${cacheDirectory}janny-avatar-${Date.now()}.jpg`,
            );
            const manip = await ImageManipulator.manipulateAsync(
                download.uri,
                [{ resize: { width: 256, height: 256 } }],
                {
                    format: ImageManipulator.SaveFormat.WEBP,
                    compress: 0.85,
                },
            );
            const upload = await uploadFile("webp", "bot");
            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("PUT", upload.url);
                xhr.setRequestHeader("Content-Type", "image/webp");
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) resolve();
                    else reject(new Error(`HTTP ${xhr.status}`));
                };
                xhr.onerror = () => reject(new Error("Upload failed"));
                xhr.send({
                    uri: manip.uri,
                    type: "image/webp",
                    name: "bot.webp",
                } as any);
            });
            avatar = upload.filename;
        } catch {
            avatar = "";
        }
    }

    let tagIds: number[] = [];
    try {
        const allTags = await getTags();
        const slugToId = new Map<string, number>();
        for (const t of allTags) slugToId.set(t.slug.toLowerCase(), t.id);
        const byId = new Set(allTags.map((t) => t.id));

        const importedTags = Array.isArray(character.tags)
            ? character.tags
            : [];
        const fromSlugs = importedTags
            .map((t: any) =>
                t?.slug ? slugToId.get(String(t.slug).toLowerCase()) : undefined,
            )
            .filter((id: number | undefined): id is number => id !== undefined);
        const fromIds = (
            Array.isArray(character.tagIds) ? character.tagIds : []
        ).filter((id: number) => byId.has(id));
        tagIds = [...new Set([...fromSlugs, ...fromIds])];
    } catch {
        tagIds = [];
    }

    const formData: BotFormState = {
        avatar,
        name: character.name ?? "",
        chat_name: "",
        description: character.description ?? "",
        personality: character.personality ?? "",
        scenario: character.scenario ?? "",
        example_dialogs: character.exampleDialogs ?? "",
        first_messages: character.firstMessage ? [character.firstMessage] : [""],
        is_nsfw: !!character.isNsfw,
        tag_ids: tagIds,
        custom_tags: [],
    };

    await Promise.all([
        storage.removeCreateBotState(),
        storage.removeEditBotState(),
    ]);
    await storage.setCreateBotState(formData);
}

export default function WebBrowserScreen() {
    const navigation = useNavigation<Nav>();
    const route = useRoute<Route>();
    const webViewRef = useRef<WebView>(null);
    const forceCloseRef = useRef(false);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [canGoBack, setCanGoBack] = useState(false);
    const { alert, showAlert, dismissAlert } = useAlert();

    const url = route.params.url;

    // Android hardware back: go back in webview history first.
    useEffect(() => {
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
            if (canGoBack) {
                webViewRef.current?.goBack();
                return true;
            }
            return false;
        });
        return () => sub.remove();
    }, [canGoBack]);

    // iOS back gesture: same behavior via beforeRemove.
    useEffect(() => {
        const unsub = navigation.addListener("beforeRemove", (e) => {
            if (
                e.data.action.type === "GO_BACK" &&
                !forceCloseRef.current &&
                canGoBack
            ) {
                e.preventDefault();
                webViewRef.current?.goBack();
            }
        });
        return unsub;
    }, [navigation, canGoBack]);

    const handleClose = useCallback(() => {
        forceCloseRef.current = true;
        navigation.goBack();
    }, [navigation]);

    const handleMessage = useCallback(
        async (event: WebViewMessageEvent) => {
            let msg: any;
            try {
                msg = JSON.parse(event.nativeEvent.data);
            } catch {
                return;
            }
            if (msg?.type !== "janny-import" || !msg.data) return;

            setImporting(true);
            try {
                await importJannyCharacter(msg.data, navigation);
                forceCloseRef.current = true;
                navigation.goBack();
                navigation.navigate("CreateTab", {
                    screen: "CreateBot",
                    params: undefined,
                });
            } catch (err: any) {
                showAlert(
                    "Import failed",
                    err?.message || "Something went wrong importing this character.",
                    [{ text: "OK", onPress: dismissAlert }],
                );
            } finally {
                setImporting(false);
            }
        },
        [navigation, showAlert, dismissAlert],
    );

    // Re-attach the interceptor on every webview navigation (SPA-safe).
    const handleNavigationStateChange = useCallback((navState: any) => {
        setCanGoBack(navState?.canGoBack ?? false);
        webViewRef.current?.injectJavaScript(INJECTED_JS);
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Browse</Text>
                <View style={styles.headerSpacer} />
                <Pressable
                    style={({ pressed }) => [
                        styles.closeButton,
                        pressed && styles.pressed,
                    ]}
                    onPress={handleClose}
                >
                    <X size={22} color={colors.textSecondary} />
                </Pressable>
            </View>
            <View style={styles.webviewContainer}>
                <WebView
                    ref={webViewRef}
                    source={{ uri: url }}
                    onMessage={handleMessage}
                    onNavigationStateChange={handleNavigationStateChange}
                    onLoadStart={() => setLoading(true)}
                    onLoadEnd={() => setLoading(false)}
                    injectedJavaScriptBeforeContentLoaded={INJECTED_JS}
                    javaScriptEnabled
                    domStorageEnabled
                    originWhitelist={["*"]}
                    mixedContentMode="compatibility"
                    sharedCookiesEnabled
                    thirdPartyCookiesEnabled
                    style={styles.webview}
                />
                {loading && (
                    <ActivityIndicator
                        style={styles.loader}
                        color={colors.accent}
                        size="large"
                    />
                )}
                {importing && (
                    <View style={styles.importOverlay}>
                        <ActivityIndicator size="large" color={colors.accent} />
                        <Text style={styles.importText}>
                            Importing character…
                        </Text>
                    </View>
                )}
            </View>
            <CustomAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                buttons={alert.buttons}
                onDismiss={dismissAlert}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 8,
    },
    title: {
        color: colors.text,
        fontSize: 24,
        fontWeight: "800",
    },
    headerSpacer: {
        flex: 1,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
    },
    pressed: {
        opacity: 0.7,
    },
    webviewContainer: {
        flex: 1,
    },
    webview: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loader: {
        position: "absolute",
        alignSelf: "center",
        top: "45%",
    },
    importOverlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: "rgba(0,0,0,0.75)",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },
    importText: {
        color: colors.text,
        fontSize: 15,
        fontWeight: "600",
    },
});
