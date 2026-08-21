import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import {
    useNavigation,
    useRoute,
    type RouteProp,
} from "@react-navigation/native";
import { X } from "lucide-react-native";
import PersonaPicker from "../../components/chat/PersonaPicker";
import CustomAlert from "../../components/common/CustomAlert";
import EmptyState from "../../components/common/EmptyState";
import { useAlert } from "../../hooks/useAlert";
import { useChatStore } from "../../stores/chatStore";
import { colors } from "../../utils/colors";
import type { TrendingCharacter, PersonaRef } from "../../types/api";
import type { CharactersStackParamList } from "../../navigation/types";
import { useHiddenCharacters, useSwipeDeck } from "./characterSearch/hooks";
import SwipeCard, {
    type SwipeDirection,
} from "./characterSearch/SwipeCard";
import type { SwipeNav } from "./characterSearch/searchUtils";

export default function SwipeDiscoverScreen() {
    const { navigate, goBack } = useNavigation<SwipeNav>();
    const route = useRoute<RouteProp<CharactersStackParamList, "SwipeDiscover">>();
    const { hiddenIds, handleToggleHidden } = useHiddenCharacters();
    const {
        deck,
        loading,
        refreshing,
        error,
        refresh,
        loadMore,
    } = useSwipeDeck(route.params, hiddenIds);
    const [deckIndex, setDeckIndex] = useState(0);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pendingCharacter, setPendingCharacter] =
        useState<TrendingCharacter | null>(null);
    const [cardGeneration, setCardGeneration] = useState(0);
    const createChat = useChatStore((s) => s.createChat);
    const { alert, showAlert, dismissAlert } = useAlert();

    const current = deck[deckIndex];
    const behind = deck[deckIndex + 1];
    const caughtUp =
        !loading &&
        deck.length > 0 &&
        deckIndex >= deck.length;

    useEffect(() => {
        if (!loading && deck.length > 0 && deck.length - deckIndex < 5) {
            loadMore();
        }
    }, [loading, deck.length, deckIndex, loadMore]);

    const handleSwiped = useCallback(
        (direction: SwipeDirection) => {
            const character = deck[deckIndex];
            if (!character) return;

            if (direction === "right") {
                setPendingCharacter(character);
                setPickerVisible(true);
            } else if (direction === "down") {
                setDeckIndex((i) => Math.min(i + 1, deck.length));
            } else {
                handleToggleHidden(character.id);
            }
        },
        [deck, deckIndex, handleToggleHidden],
    );

    const handlePersonaSelect = useCallback(
        async (persona: PersonaRef | null) => {
            if (!pendingCharacter) return;
            const character = pendingCharacter;
            setPickerVisible(false);
            setPendingCharacter(null);
            try {
                const chatId = await createChat(character.id, persona?.id);
                setDeckIndex((i) => Math.min(i + 1, deck.length));
                navigate("ChatsTab", {
                    screen: "ChatScreen",
                    params: {
                        chatId,
                        characterName: character.name,
                        characterId: character.id,
                    },
                });
            } catch {
                setCardGeneration((g) => g + 1);
                showAlert(
                    "Failed to start chat",
                    "Something went wrong. Please try again.",
                    [{ text: "OK", onPress: dismissAlert }],
                );
            }
        },
        [pendingCharacter, createChat, navigate, showAlert, dismissAlert, deck.length],
    );

    const handleRestart = useCallback(() => {
        setDeckIndex(0);
        refresh();
    }, [refresh]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Swipe</Text>
                <View style={styles.headerSpacer} />
                <Pressable
                    style={({ pressed }) => [
                        styles.closeButton,
                        pressed && styles.pressed,
                    ]}
                    onPress={goBack}
                >
                    <X size={22} color={colors.textSecondary} />
                </Pressable>
            </View>

            {!loading && deck.length === 0 ? (
                <EmptyState
                    title="No characters to swipe"
                    text={error ? error : "Try refreshing the feed."}
                    containerStyle={styles.centerBox}
                    titleStyle={styles.emptyTitle}
                    textStyle={styles.emptyText}
                >
                    <Pressable
                        style={({ pressed }) => [
                            styles.reloadButton,
                            pressed && styles.pressed,
                        ]}
                        onPress={handleRestart}
                    >
                        <Text style={styles.reloadButtonText}>
                            {refreshing ? "Loading..." : "Try again"}
                        </Text>
                    </Pressable>
                </EmptyState>
            ) : (
                <View style={styles.deckArea}>
                    {behind && !caughtUp && (
                        <View
                            style={styles.stackCard}
                            pointerEvents="none"
                        >
                            <SwipeCard character={behind} />
                        </View>
                    )}
                    {current ? (
                        <SwipeCard
                            key={`${current.id}-${cardGeneration}`}
                            character={current}
                            onSwiped={handleSwiped}
                        />
                    ) : caughtUp && !loading ? (
                        <EmptyState
                            title="All caught up"
                            text="You have seen every character in this feed."
                            containerStyle={styles.centerBox}
                            titleStyle={styles.emptyTitle}
                            textStyle={styles.emptyText}
                        >
                            <Pressable
                                style={({ pressed }) => [
                                    styles.reloadButton,
                                    pressed && styles.pressed,
                                ]}
                                onPress={handleRestart}
                            >
                                <Text style={styles.reloadButtonText}>
                                    Reload
                                </Text>
                            </Pressable>
                        </EmptyState>
                    ) : null}
                    {loading && (
                        <ActivityIndicator
                            style={styles.loader}
                            color={colors.accent}
                            size="large"
                        />
                    )}
                </View>
            )}

            <View style={styles.legend}>
                <Text style={styles.legendText}>← Ignore</Text>
                <Text style={styles.legendText}>↓ Skip</Text>
                <Text style={styles.legendText}>→ Chat</Text>
            </View>

            <PersonaPicker
                visible={pickerVisible}
                onClose={() => {
                    setPickerVisible(false);
                    setPendingCharacter(null);
                    setCardGeneration((g) => g + 1);
                }}
                onSelect={handlePersonaSelect}
                characterName={pendingCharacter?.name ?? ""}
            />
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
    deckArea: {
        flex: 1,
        marginHorizontal: 16,
        marginVertical: 8,
    },
    stackCard: {
        ...StyleSheet.absoluteFill,
        transform: [{ translateY: 14 }, { scale: 0.96 }],
    },
    centerBox: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        gap: 8,
    },
    emptyTitle: {
        color: colors.text,
        fontSize: 18,
        fontWeight: "700",
    },
    emptyText: {
        color: colors.textDim,
        fontSize: 14,
        textAlign: "center",
    },
    reloadButton: {
        marginTop: 8,
        backgroundColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: 24,
        paddingVertical: 10,
    },
    reloadButtonText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: "600",
    },
    loader: {
        alignSelf: "center",
    },
    legend: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 24,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    legendText: {
        color: colors.textFaint,
        fontSize: 13,
        fontWeight: "600",
    },
});