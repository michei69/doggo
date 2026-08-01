import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Pressable,
} from "react-native";
import { Skeleton } from "boneyard-js/native";
import {
  type RouteProp,
  useRoute,
  useNavigation,
} from "@react-navigation/native";
import CharacterHeader from "../../components/character/CharacterHeader";
import CharacterMenuSheet from "../../components/character/CharacterMenuSheet";
import CharacterSettingsModal from "../../components/character/CharacterSettingsModal";
import CharacterReportModal from "../../components/character/CharacterReportModal";
import PersonaPicker from "../../components/chat/PersonaPicker";
import CustomAlert from "../../components/common/CustomAlert";
import type { AlertButton } from "../../components/common/CustomAlert";
import { useAlert } from "../../hooks/useAlert";
import type { CharactersStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../stores/authStore";
import { useChatStore } from "../../stores/chatStore";
import { Heart, Ellipsis } from "lucide-react-native";
import {
  getCharacterDetail,
  deleteCharacter,
  patchCharacterSettings,
  checkFavorite,
  favoriteCharacter,
  unfavoriteCharacter,
  getFavoriteCount,
} from "../../api/characters";
import {
  getCharacterChats,
  fetchSystemPrompt,
  attemptExtractSystemPrompt,
  createChat as createChatApi,
  getChatDetail,
  deleteChat,
} from "../../api/chats";
import type { CharacterDetail, ChatListItem, ChatDetail } from "../../types/api";
import { processSystemMessage } from "../../utils/processText";
import { storage } from "../../utils/storage";
import { colors } from "../../utils/colors";
import { useIsTablet } from "../../hooks/useIsTablet";
import { cleanTags, generify } from "../../utils/markdown";
import { formatCount } from "../../utils/format";
import { getEmojiDefinitions } from "../../stores/reviewStore";

type Route = RouteProp<CharactersStackParamList, "CharacterScreen">;

const LoadingState = React.memo(function LoadingState() {
  return (
    <Skeleton
      name="character-screen"
      loading
      animate="shimmer"
      fallback={
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      }
    >
      <View style={styles.skeletonContainer}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonNameRow}>
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, { width: "50%", marginTop: 8 }]} />
        </View>
        <View style={styles.skeletonStatsRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeletonStatChip} />
          ))}
        </View>
        <View style={[styles.skeletonLine, { width: "100%", height: 80, marginTop: 16 }]} />
      </View>
    </Skeleton>
  );
});

const ErrorState = React.memo(function ErrorState({
  error,
  onBack,
}: {
  error: string;
  onBack: () => void;
}) {
  return (
    <View style={styles.centered}>
      <Text style={styles.errorText}>{error}</Text>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>Go back</Text>
      </Pressable>
    </View>
  );
});

const FavoriteButton = React.memo(function FavoriteButton({
  isFavorited,
  favoriteCount,
  onToggle,
}: {
  isFavorited: boolean;
  favoriteCount: number;
  onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle} style={styles.favBtn}>
      <Text
        style={[
          styles.favCount,
          { color: isFavorited ? colors.danger : colors.textSecondary },
        ]}
      >
        {formatCount(favoriteCount)}
      </Text>
      <Heart
        size={22}
        color={isFavorited ? colors.danger : colors.textSecondary}
        fill={isFavorited ? colors.danger : "transparent"}
      />
    </Pressable>
  );
});

const ScreenHeader = React.memo(function ScreenHeader({
  isFavorited,
  favoriteCount,
  onToggleFavorite,
  onOpenMenu,
  onBack,
}: {
  isFavorited: boolean;
  favoriteCount: number;
  onToggleFavorite: () => void;
  onOpenMenu: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.headerBack}>
        <Text style={styles.arrow}>{"\u2190"} Back</Text>
      </Pressable>
      <View style={styles.headerActions}>
        <FavoriteButton
          isFavorited={isFavorited}
          favoriteCount={favoriteCount}
          onToggle={onToggleFavorite}
        />
        <Pressable onPress={onOpenMenu} style={styles.menuBtn}>
          <Ellipsis size={26} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
});

const CopyOverlay = React.memo(function CopyOverlay() {
  return (
    <View style={styles.copyOverlay}>
      <View style={styles.copyOverlayBox}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.copyOverlayText}>Copying character…</Text>
      </View>
    </View>
  );
});

async function buildCopyFormData(character: CharacterDetail) {
  let personality = "";
  let scenario = "";
  const charName = character.chat_name || character.name;

  if (character.allow_proxy) {
    const minimalDetail = {
      chat: { character_id: character.id },
    } as ChatDetail;
    const prompt = await fetchSystemPrompt(minimalDetail);
    const processed = processSystemMessage(
      prompt,
      character.chat_name || character.name,
    );
    personality = generify(processed.personality ?? "", charName);
    scenario = generify(processed.scenario ?? "", charName);
  } else {
    const abortController = new AbortController();
    const characterName = character.chat_name || character.name;
    const personaTag = `${characterName}'s Persona`;

    try {
      const raw = await attemptExtractSystemPrompt(
        character.id,
        personaTag,
        abortController.signal,
      );
      personality = generify(cleanTags(raw, personaTag), charName);
    } catch {
      personality = generify(character.personality ?? "", charName);
    }

    try {
      const raw = await attemptExtractSystemPrompt(
        character.id,
        "Scenario",
        abortController.signal,
      );
      scenario = generify(cleanTags(raw, "Scenario"), charName);
    } catch {
      scenario = generify(character.scenario ?? "", charName);
    }
  }

  const attribution = `Private clone of <a href='https://janitorai.com/characters/${character.id}'>${character.creator_name}'s original bot</a>\n\n`;
  const description = attribution + (character.description ?? "");

  let firstMessages: string[] =
    character.first_messages.length > 0 ? character.first_messages : [""];

  try {
    const chat = await createChatApi(character.id);
    const detail = await getChatDetail(chat.id);
    if (
      detail.character.first_messages &&
      detail.character.first_messages.length > 0
    ) {
      firstMessages = detail.character.first_messages;
    }
    await deleteChat(chat.id);
  } catch {
    // Fall back to character.first_messages on any failure
  }

  return {
    avatar: character.avatar ?? "",
    name: character.name ?? "",
    chat_name: character.chat_name ?? "",
    description,
    personality,
    scenario,
    example_dialogs: character.example_dialogs ?? "",
    first_messages: firstMessages,
    is_nsfw: character.is_nsfw,
    tag_ids: character.tags.map((t) => t.id),
    custom_tags: character.custom_tags ?? [],
  };
}

function useCharacterData(characterId: string) {
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [character, setCharacter] = useState<CharacterDetail | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [latestChat, setLatestChat] = useState<ChatListItem | null>(null);

  const fetching = loadedId !== characterId;

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const [chats, data, favStatus, favCountRes] = await Promise.all([
          getCharacterChats(characterId).catch(() => [] as ChatListItem[]),
          getCharacterDetail(characterId),
          checkFavorite(characterId),
          getFavoriteCount(characterId),
        ]);
        if (!cancelled) {
          setIsFavorited(favStatus);
          setFavoriteCount(favCountRes.favoritesCount);
          setCharacter(data);
          const sorted = chats.sort(
            (a, b) =>
              new Date(b.updated_at).getTime() -
              new Date(a.updated_at).getTime(),
          );
          setLatestChat(sorted[0] ?? null);
          setLoadedId(characterId);
        }
      } catch (err: any) {
        if (!cancelled) {
          setFetchError(err.message || "Failed to load character");
          setLoadedId(characterId);
        }
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [characterId]);

  return {
    fetching,
    character,
    fetchError,
    latestChat,
    isFavorited,
    favoriteCount,
    setCharacter,
    setIsFavorited,
    setFavoriteCount,
  };
}

function useCopyCharacter(
  character: CharacterDetail | null,
  navigate: any,
  showAlert: (title: string, message: string, buttons: AlertButton[]) => void,
  dismissAlert: () => void,
) {
  const [copyLoading, setCopyLoading] = useState(false);

  const doCopyCharacter = useCallback(async () => {
    if (!character) return;
    setCopyLoading(true);

    try {
      const [formData] = await Promise.all([
        buildCopyFormData(character),
        storage.removeCreateBotState(),
        storage.removeEditBotState(),
      ]);

      await storage.setCreateBotState(formData);

      navigate("CreateTab", {
        screen: "CreateBot",
        params: undefined,
      });
    } catch (err: any) {
      showAlert("Error", err?.message || "Failed to copy character", [
        { text: "OK", onPress: dismissAlert },
      ]);
    } finally {
      setCopyLoading(false);
    }
  }, [character, navigate, showAlert, dismissAlert]);

  const confirmCopyCharacter = useCallback(() => {
    if (!character) return;

    showAlert(
      "Copy Character",
      "Please do not publish this copy publicly. " +
        "Always credit the original creator if you share or use this character in any way. " +
        "This is intended as a private backup for personal use.",
      [
        {
          text: "Continue",
          onPress: () => {
            dismissAlert();
            showAlert(
              "Private Use Only",
              "This copy should only be used privately, for yourself. " +
                "Do not distribute, publish, or share it with others.",
              [
                {
                  text: "I Understand",
                  onPress: () => {
                    dismissAlert();
                    doCopyCharacter();
                  },
                },
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: dismissAlert,
                },
              ],
            );
          },
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: dismissAlert,
        },
      ],
    );
  }, [character, doCopyCharacter, showAlert, dismissAlert]);

  return { copyLoading, confirmCopyCharacter };
}

export default function CharacterScreen() {
  const route = useRoute<Route>();
  const { navigate, goBack } = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const { alert, showAlert, dismissAlert } = useAlert();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState<string | null>(null);
  const favLoadingRef = useRef(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [dateFormat, setDateFormat] =
    useState<"relative" | "absolute">("relative");
  const user = useAuthStore((s) => s.user);
  const createChat = useChatStore((s) => s.createChat);
  const {
    fetching,
    character,
    fetchError,
    latestChat,
    isFavorited,
    favoriteCount,
    setCharacter,
    setIsFavorited,
    setFavoriteCount,
  } = useCharacterData(route.params.characterId);
  const { copyLoading, confirmCopyCharacter } = useCopyCharacter(
    character,
    navigate,
    showAlert,
    dismissAlert,
  );

  const isTablet = useIsTablet();
  const isOwner = character?.creator_id === user?.id;

  useEffect(() => {
    storage.getDateFormat().then(setDateFormat);
  }, []);

  useEffect(() => {
    storage.getReviewReactionsEnabled().then((enabled) => {
      if (enabled) {
        getEmojiDefinitions().catch(() => {});
      }
    });
  }, []);

  const handleStartChat = useCallback(() => {
    setPickerVisible(true);
  }, []);

  const handlePersonaSelect = useCallback(
    async (persona: { id: string; name: string; avatar: string } | null) => {
      if (!character) return;
      setLoading(true);
      try {
        const chatId = await createChat(character.id, persona?.id);
        navigate("ChatsTab", {
          screen: "ChatScreen",
          params: {
            chatId,
            characterName: character.name,
            characterId: character.id,
          },
        });
      } catch {
      } finally {
        setLoading(false);
      }
    },
    [createChat, character, navigate],
  );

  const handleContinueChat = useCallback(() => {
    if (!latestChat) return;
    navigate("ChatsTab", {
      screen: "ChatScreen",
      params: {
        chatId: latestChat.id,
        characterName: latestChat.character.name || character!.name,
        characterId: latestChat.character_id,
      },
    });
  }, [latestChat, character, navigate]);

  const handleViewCreator = useCallback(() => {
    setMenuVisible(false);
    if (!character) return;
    navigate("CreatorScreen", {
      userId: character.creator_id,
      userName: character.creator_name,
    });
  }, [character, navigate]);

  const handleEditCharacter = useCallback(() => {
    setMenuVisible(false);
    if (!character) return;
    navigate("CreateTab", {
      screen: "CreateBot",
      params: { characterId: character.id },
    });
  }, [character, navigate]);

  const handleDeleteCharacter = useCallback(() => {
    setMenuVisible(false);
    if (!character) return;
    showAlert(
      "Delete Character",
      `Permanently delete ${character.name}? This cannot be undone.`,
      [
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            dismissAlert();
            try {
              await deleteCharacter(character.id);
              goBack();
            } catch (err: any) {
              showAlert("Error", err?.message || "Failed to delete character", [
                { text: "OK", onPress: dismissAlert },
              ]);
            }
          },
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: dismissAlert,
        },
      ],
    );
  }, [character, goBack, showAlert, dismissAlert]);

  const handleCopyCharacter = useCallback(() => {
    setMenuVisible(false);
    confirmCopyCharacter();
  }, [confirmCopyCharacter]);

  const handleOpenSettings = useCallback(() => {
    setMenuVisible(false);
    setSettingsVisible(true);
  }, []);

  const handleToggleSetting = useCallback(
    async (key: "showdefinition" | "allow_proxy" | "allow_published_chats") => {
      if (!character) return;
      const current = character[key];
      const next = !current;

      // Optimistic update
      setCharacter({ ...character, [key]: next });
      setSettingsSaving(key);
      try {
        await patchCharacterSettings(character.id, {
          [key]: next,
        });
      } catch {
        // Revert on failure
        setCharacter({ ...character, [key]: current });
      } finally {
        setSettingsSaving(null);
      }
    },
    [character, setCharacter, setSettingsSaving],
  );

  const handleToggleFavorite = useCallback(async () => {
    if (!character || favLoadingRef.current) return;
    const wasFavorited = isFavorited;
    setIsFavorited(!wasFavorited);
    setFavoriteCount((c) => c + (wasFavorited ? -1 : 1));
    favLoadingRef.current = true;
    try {
      if (wasFavorited) {
        await unfavoriteCharacter(character.id);
      } else {
        await favoriteCharacter(character.id);
      }
    } catch {
      setIsFavorited(wasFavorited);
      setFavoriteCount((c) => c + (wasFavorited ? 1 : -1));
    } finally {
      favLoadingRef.current = false;
    }
  }, [character, isFavorited, setIsFavorited, setFavoriteCount]);

  const handleReportCharacter = useCallback(() => {
    setMenuVisible(false);
    setReportVisible(true);
  }, []);

  const handleCloseReport = useCallback(() => {
    setReportVisible(false);
  }, []);

  const handleOpenMenu = useCallback(() => {
    setMenuVisible(true);
  }, []);

  if (fetching) {
    return <LoadingState />;
  }

  if (fetchError || !character) {
    return (
      <ErrorState error={fetchError || "Character not found"} onBack={goBack} />
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        isFavorited={isFavorited}
        favoriteCount={favoriteCount}
        onToggleFavorite={handleToggleFavorite}
        onOpenMenu={handleOpenMenu}
        onBack={goBack}
      />
      <CharacterHeader
        character={character}
        onStartChat={handleStartChat}
        onContinueChat={latestChat ? handleContinueChat : undefined}
        isLoading={loading}
        isTablet={isTablet}
        isOwner={isOwner}
        dateFormat={dateFormat}
      />
      <PersonaPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handlePersonaSelect}
        characterName={character.name}
      />
      <CharacterMenuSheet
        visible={menuVisible}
        isOwner={isOwner}
        onClose={() => setMenuVisible(false)}
        onViewCreator={handleViewCreator}
        onOpenSettings={handleOpenSettings}
        onEditCharacter={handleEditCharacter}
        onDeleteCharacter={handleDeleteCharacter}
        onCopyCharacter={handleCopyCharacter}
        onReportCharacter={handleReportCharacter}
        characterId={character.id}
        characterName={character.name}
      />
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        onDismiss={dismissAlert}
      />
      <CharacterSettingsModal
        visible={settingsVisible}
        character={character}
        savingKey={settingsSaving}
        onToggle={handleToggleSetting}
        onClose={() => setSettingsVisible(false)}
      />
      <CharacterReportModal
        visible={reportVisible}
        characterId={character.id}
        onClose={handleCloseReport}
      />
      {copyLoading && <CopyOverlay />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingRight: 10,
    paddingBottom: 8,
  },
  headerBack: {
    paddingVertical: 4,
  },
  arrow: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "600",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  favBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    height: 40,
    gap: 6,
  },
  favCount: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
  },
  backBtn: {
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  copyOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  copyOverlayBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    gap: 16,
  },
  copyOverlayText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
  },
  skeletonContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    gap: 16,
  },
  skeletonAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.border,
    alignSelf: "center",
  },
  skeletonNameRow: {
    alignItems: "center",
    gap: 4,
  },
  skeletonLine: {
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.border,
    width: "70%",
    alignSelf: "center",
  },
  skeletonStatsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  skeletonStatChip: {
    width: 72,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
  },
});
