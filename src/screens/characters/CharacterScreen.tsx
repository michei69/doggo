import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Pressable,
} from "react-native";
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
import CustomAlert, {
  type AlertButton,
} from "../../components/common/CustomAlert";
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

type Route = RouteProp<CharactersStackParamList, "CharacterScreen">;

export default function CharacterScreen() {
  const route = useRoute<Route>();
  const { navigate, goBack } = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [character, setCharacter] = useState<CharacterDetail | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [latestChat, setLatestChat] = useState<ChatListItem | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertButtons, setAlertButtons] = useState<AlertButton[]>([]);
  const [copyLoading, setCopyLoading] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [reportVisible, setReportVisible] = useState(false);
  const [dateFormat, setDateFormat] = useState<"relative" | "absolute">("relative");
  const user = useAuthStore((s) => s.user);
  const createChat = useChatStore((s) => s.createChat);

  const isTablet = useIsTablet();
  const isOwner = character?.creator_id === user?.id;

  useEffect(() => {
    storage.getDateFormat().then(setDateFormat);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    const fetchData = async () => {
      try {
        let chats: ChatListItem[] = [];
        try {
          chats = await getCharacterChats(route.params.characterId);
        } catch {}
        const data = await getCharacterDetail(route.params.characterId);
        const favStatus = await checkFavorite(route.params.characterId);
        const favCountRes = await getFavoriteCount(route.params.characterId);
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
          setFetching(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setFetchError(err.message || "Failed to load character");
          setFetching(false);
        }
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [route.params.characterId]);

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
    setAlertTitle("Delete Character");
    setAlertMessage(
      `Permanently delete ${character.name}? This cannot be undone.`,
    );
    setAlertButtons([
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setAlertVisible(false);
          try {
            await deleteCharacter(character.id);
            goBack();
          } catch (err: any) {
            setAlertTitle("Error");
            setAlertMessage(err?.message || "Failed to delete character");
            setAlertButtons([
              { text: "OK", onPress: () => setAlertVisible(false) },
            ]);
            setAlertVisible(true);
          }
        },
      },
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => setAlertVisible(false),
      },
    ]);
    setAlertVisible(true);
  }, [character, goBack]);

  const doCopyCharacter = useCallback(async () => {
    if (!character) return;
    setCopyLoading(true);

    try {
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

      const formData = {
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

      await storage.removeCreateBotState();
      await storage.removeEditBotState();
      await storage.setCreateBotState(formData);

      navigate("CreateTab", {
        screen: "CreateBot",
        params: undefined,
      });
    } catch (err: any) {
      setAlertTitle("Error");
      setAlertMessage(err?.message || "Failed to copy character");
      setAlertButtons([{ text: "OK", onPress: () => setAlertVisible(false) }]);
      setAlertVisible(true);
    } finally {
      setCopyLoading(false);
    }
  }, [character, navigate]);

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
    [character],
  );

  const handleCopyCharacter = useCallback(() => {
    setMenuVisible(false);
    if (!character) return;

    setAlertTitle("Copy Character");
    setAlertMessage(
      "Please do not publish this copy publicly. " +
        "Always credit the original creator if you share or use this character in any way. " +
        "This is intended as a private backup for personal use.",
    );
    setAlertButtons([
      {
        text: "Continue",
        onPress: () => {
          setAlertVisible(false);
          setAlertTitle("Private Use Only");
          setAlertMessage(
            "This copy should only be used privately, for yourself. " +
              "Do not distribute, publish, or share it with others.",
          );
          setAlertButtons([
            {
              text: "I Understand",
              onPress: () => {
                setAlertVisible(false);
                doCopyCharacter();
              },
            },
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => setAlertVisible(false),
            },
          ]);
          setAlertVisible(true);
        },
      },
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => setAlertVisible(false),
      },
    ]);
    setAlertVisible(true);
  }, [character, doCopyCharacter]);

  const handleToggleFavorite = useCallback(async () => {
    if (!character || favLoading) return;
    const wasFavorited = isFavorited;
    setIsFavorited(!wasFavorited);
    setFavoriteCount((c) => c + (wasFavorited ? -1 : 1));
    setFavLoading(true);
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
      setFavLoading(false);
    }
  }, [character, isFavorited, favLoading]);

  const handleReportCharacter = useCallback(() => {
    setMenuVisible(false);
    setReportVisible(true);
  }, []);

  const handleCloseReport = useCallback(() => {
    setReportVisible(false);
  }, []);

  if (fetching) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (fetchError || !character) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {fetchError || "Character not found"}
        </Text>
        <Pressable onPress={() => goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => goBack()} style={styles.headerBack}>
          <Text style={styles.arrow}>{"\u2190"} Back</Text>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable onPress={handleToggleFavorite} style={styles.favBtn}>
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
          <Pressable onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
            <Ellipsis size={26} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

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
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        buttons={alertButtons}
        onDismiss={() => setAlertVisible(false)}
      />

      {character && (
        <CharacterSettingsModal
          visible={settingsVisible}
          character={character}
          savingKey={settingsSaving}
          onToggle={handleToggleSetting}
          onClose={() => setSettingsVisible(false)}
        />
      )}

      {character && (
        <CharacterReportModal
          visible={reportVisible}
          characterId={character.id}
          onClose={handleCloseReport}
        />
      )}

      {copyLoading && (
        <View style={styles.copyOverlay}>
          <View style={styles.copyOverlayBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.copyOverlayText}>Copying character...</Text>
          </View>
        </View>
      )}
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
});
