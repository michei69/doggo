import { useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    Image,
    ActivityIndicator,
} from "react-native";
import type { EmojiDef } from "../../types/api";
import { getEmojiDefinitions } from "../../stores/reviewStore";
import { colors } from "../../utils/colors";

type Tab = "all" | "animated" | "static";

export default function EmojiPickerModal({
    visible,
    onClose,
    onReact,
    onRemoveReact,
    activeEmojiId,
}: {
    visible: boolean;
    onClose: () => void;
    onReact: (emojiId: string) => void;
    onRemoveReact: () => void;
    activeEmojiId?: string | null;
}) {
    const [emojiList, setEmojiList] = useState<EmojiDef[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>("all");

    const handleOpen = useCallback(async () => {
        if (emojiList) return;
        setLoading(true);
        try {
            const defs = await getEmojiDefinitions();
            setEmojiList(defs);
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    }, [emojiList]);

    const handlePress = useCallback(
        (emojiId: string) => {
            if (activeEmojiId === emojiId) {
                onRemoveReact();
            } else {
                onReact(emojiId);
            }
            onClose();
        },
        [activeEmojiId, onReact, onRemoveReact, onClose],
    );

    const filtered = emojiList?.filter((e) => {
        if (activeTab === "animated") return e.img.endsWith(".gif");
        if (activeTab === "static") return !e.img.endsWith(".gif");
        return true;
    });

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            onShow={handleOpen}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.content} onPress={() => {}}>
                    {/* Tabs */}
                    <View style={styles.tabs}>
                        {(["all", "animated", "static"] as Tab[]).map((tab) => (
                            <Pressable
                                key={tab}
                                style={[
                                    styles.tab,
                                    activeTab === tab && styles.tabActive,
                                ]}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text
                                    style={[
                                        styles.tabText,
                                        activeTab === tab &&
                                            styles.tabTextActive,
                                    ]}
                                >
                                    {tab === "all"
                                        ? "All"
                                        : tab === "animated"
                                          ? "Animated"
                                          : "Static"}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Emoji grid */}
                    {loading ? (
                        <View style={styles.loaderContainer}>
                            <ActivityIndicator
                                size="small"
                                color={colors.accent}
                            />
                        </View>
                    ) : filtered?.length ? (
                        <View style={styles.grid}>
                            {filtered.map((emoji) => (
                                <Pressable
                                    key={emoji.id}
                                    style={[
                                        styles.emojiBtn,
                                        activeEmojiId === emoji.id &&
                                            styles.emojiBtnActive,
                                    ]}
                                    onPress={() => handlePress(emoji.id)}
                                >
                                    <Image
                                        source={{ uri: emoji.img }}
                                        style={styles.emojiImg}
                                        resizeMode="contain"
                                    />
                                </Pressable>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No emojis found</Text>
                        </View>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    content: {
        width: "100%",
        maxWidth: 360,
        maxHeight: "70%",
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
    },
    tabs: {
        flexDirection: "row",
        gap: 6,
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: "center",
        backgroundColor: colors.background,
    },
    tabActive: {
        backgroundColor: colors.accentFaded,
    },
    tabText: {
        color: colors.textDim,
        fontSize: 13,
        fontWeight: "600",
    },
    tabTextActive: {
        color: colors.accent,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        justifyContent: "flex-start",
    },
    emojiBtn: {
        width: "18%",
        aspectRatio: 1,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 8,
        padding: 4,
    },
    emojiBtnActive: {
        backgroundColor: colors.accentFaded,
        borderWidth: 1,
        borderColor: colors.accent,
    },
    emojiImg: {
        width: 36,
        height: 36,
    },
    loaderContainer: {
        paddingVertical: 40,
        alignItems: "center",
    },
    emptyContainer: {
        paddingVertical: 40,
        alignItems: "center",
    },
    emptyText: {
        color: colors.textDim,
        fontSize: 14,
    },
});
