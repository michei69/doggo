import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Switch,
} from "react-native";
import {
  type RouteProp,
  useRoute,
  useNavigation,
} from "@react-navigation/native";
import CharacterHeader from "../../components/character/CharacterHeader";
import PersonaPicker from "../../components/chat/PersonaPicker";
import CustomBottomSheet from "../../components/common/CustomBottomSheet";
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
} from "../../api/characters";
import {
  getCharacterChats,
  fetchSystemPrompt,
  attemptExtractSystemPrompt,
  createChat as createChatApi,
  getChatDetail,
  deleteChat,
} from "../../api/chats";
import type {
  CharacterDetail,
  ChatListItem,
  ChatDetail,
} from "../../types/api";
import { apiClient } from "../../api/client";
import { processSystemMessage } from "../../utils/processText";
import { storage } from "../../utils/storage";
import { colors } from "../../utils/colors";
import { useIsTablet } from "../../hooks/useIsTablet";
import { cleanTags, generify } from "../../utils/markdown";

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
  const [reportVisible, setReportVisible] = useState(false);
  const [reportPhase, setReportPhase] = useState<1 | 2>(1);
  const [reportReason, setReportReason] = useState("");
  const [reportType, setReportType] = useState("");
  const [reportLink, setReportLink] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const user = useAuthStore((s) => s.user);
  const createChat = useChatStore((s) => s.createChat);

  const isTablet = useIsTablet();
  const isOwner = character?.creator_id === user?.id;

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
        if (!cancelled) {
          setIsFavorited(favStatus);
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
      const charName = character.chat_name ?? character.name;

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
    setFavLoading(true);
    try {
      if (wasFavorited) {
        await unfavoriteCharacter(character.id);
      } else {
        await favoriteCharacter(character.id);
      }
    } catch {
      setIsFavorited(wasFavorited);
    } finally {
      setFavLoading(false);
    }
  }, [character, isFavorited, favLoading]);

  const reportReasons = [
    { label: "Mine, posted without my permission", type: "stolen" },
    { label: "Spam or low quality", type: "spam" },
    { label: "Illegal or harmful content", type: "illegal" },
    { label: "Other", type: "other" },
  ];

  const handleReportCharacter = useCallback(() => {
    setMenuVisible(false);
    setReportReason("");
    setReportType("");
    setReportLink("");
    setReportDetails("");
    setReportPhase(1);
    setReportVisible(true);
  }, []);

  const handleSelectReportReason = useCallback(
    (label: string, type: string) => {
      setReportReason(label);
      setReportType(type);
    },
    [],
  );

  const handleContinueReport = useCallback(() => {
    if (!reportType) return;
    setReportPhase(2);
  }, [reportType]);

  const handleSubmitReport = useCallback(async () => {
    if (!character) return;
    if (reportType === "stolen" && !reportLink.trim()) return;
    if (reportType !== "stolen" && reportDetails.trim().length <= 5) return;

    setReportSubmitting(true);
    try {
      const body: Record<string, string> = {
        character_id: character.id,
        reason: reportType,
        other: reportDetails.trim(),
        url: `https://janitorai.com/characters/${character.id}`,
      };
      if (reportType === "stolen") {
        body.originalBotLink = reportLink.trim();
      }
      await apiClient.post("/moderation/report", body);
      setReportVisible(false);
    } catch {
      // Submission failed silently
    } finally {
      setReportSubmitting(false);
    }
  }, [character, reportType, reportLink, reportDetails]);

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
          <Pressable onPress={handleToggleFavorite} style={styles.menuBtn}>
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
      />

      <PersonaPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handlePersonaSelect}
        characterName={character.name}
      />

      <CustomBottomSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
      >
        <ScrollView>
          <Pressable onPress={handleViewCreator} style={styles.menuItem}>
            <Text style={styles.menuItemText}>View Creator</Text>
          </Pressable>
          {isOwner && (
            <>
              <Pressable onPress={handleOpenSettings} style={styles.menuItem}>
                <Text style={styles.menuItemText}>Character Settings</Text>
              </Pressable>
              <Pressable onPress={handleEditCharacter} style={styles.menuItem}>
                <Text style={styles.menuItemText}>Edit Character</Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteCharacter}
                style={styles.menuItem}
              >
                <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                  Delete Character
                </Text>
              </Pressable>
            </>
          )}
          {!isOwner && (
            <>
              <Pressable onPress={handleCopyCharacter} style={styles.menuItem}>
                <Text style={styles.menuItemText}>Copy Character</Text>
              </Pressable>
              <Pressable
                onPress={handleReportCharacter}
                style={styles.menuItem}
              >
                <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                  Report Character
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </CustomBottomSheet>

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        buttons={alertButtons}
        onDismiss={() => setAlertVisible(false)}
      />

      <Modal
        visible={settingsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <Pressable
          style={styles.settingsOverlay}
          onPress={() => setSettingsVisible(false)}
        >
          <Pressable style={styles.settingsModal} onPress={() => {}}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Character Settings</Text>
              <Pressable onPress={() => setSettingsVisible(false)}>
                <Text style={styles.settingsClose}>{"✕"}</Text>
              </Pressable>
            </View>

            <View style={styles.settingsRow}>
              <View style={styles.settingsInfo}>
                <Text style={styles.settingsLabel}>Show Definition</Text>
              </View>
              <Switch
                value={character?.showdefinition ?? false}
                onValueChange={() => handleToggleSetting("showdefinition")}
                trackColor={{ false: colors.border, true: colors.accent }}
                disabled={settingsSaving !== null}
              />
            </View>

            <View style={styles.settingsRow}>
              <View style={styles.settingsInfo}>
                <Text style={styles.settingsLabel}>Allow Proxies</Text>
              </View>
              <Switch
                value={character?.allow_proxy ?? false}
                onValueChange={() => handleToggleSetting("allow_proxy")}
                trackColor={{ false: colors.border, true: colors.accent }}
                disabled={settingsSaving !== null}
              />
            </View>

            <View style={styles.settingsRow}>
              <View style={styles.settingsInfo}>
                <Text style={styles.settingsLabel}>Allow Published Chats</Text>
              </View>
              <Switch
                value={character?.allow_published_chats ?? false}
                onValueChange={() =>
                  handleToggleSetting("allow_published_chats")
                }
                trackColor={{ false: colors.border, true: colors.accent }}
                disabled={settingsSaving !== null}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={reportVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseReport}
      >
        <Pressable style={styles.settingsOverlay} onPress={handleCloseReport}>
          <Pressable style={styles.settingsModal} onPress={() => {}}>
            {reportPhase === 1 ? (
              <>
                <View style={styles.settingsHeader}>
                  <Text style={styles.settingsTitle}>Report Character</Text>
                  <Pressable onPress={handleCloseReport}>
                    <Text style={styles.settingsClose}>{"✕"}</Text>
                  </Pressable>
                </View>
                <Text style={styles.reportSubtitle}>
                  Why are you reporting this character?
                </Text>
                {reportReasons.map((r) => {
                  const selected = reportType === r.type;
                  return (
                    <Pressable
                      key={r.type}
                      onPress={() => handleSelectReportReason(r.label, r.type)}
                      style={[
                        styles.reportRadioItem,
                        selected && styles.reportRadioItemSelected,
                      ]}
                    >
                      <View
                        style={[
                          styles.reportRadio,
                          selected && styles.reportRadioSelected,
                        ]}
                      >
                        {selected && <View style={styles.reportRadioDot} />}
                      </View>
                      <Text style={styles.reportRadioText}>{r.label}</Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={handleContinueReport}
                  style={[
                    styles.reportContinueBtn,
                    !reportType && styles.reportContinueBtnDisabled,
                  ]}
                  disabled={!reportType}
                >
                  <Text
                    style={[
                      styles.reportContinueText,
                      !reportType && styles.reportContinueTextDisabled,
                    ]}
                  >
                    Continue
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.settingsHeader}>
                  <Pressable onPress={() => setReportPhase(1)} style={styles.reportBackBtn}>
                    <Text style={styles.reportBackArrow}>{"\u2190"}</Text>
                  </Pressable>
                  <Text style={styles.settingsTitle}>Report Character</Text>
                  <Pressable onPress={handleCloseReport}>
                    <Text style={styles.settingsClose}>{"✕"}</Text>
                  </Pressable>
                </View>
                <View style={styles.reportReasonChip}>
                  <Text style={styles.reportReasonChipText}>{reportReason}</Text>
                </View>

                {reportType === "stolen" && (
                  <>
                    <Text style={styles.reportLabel}>
                      Link to your original bot
                    </Text>
                    <TextInput
                      style={styles.reportInput}
                      placeholder="https://janitorai.com/characters/..."
                      placeholderTextColor={colors.textDim}
                      value={reportLink}
                      onChangeText={setReportLink}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </>
                )}

                <Text style={styles.reportLabel}>
                  {reportType === "stolen"
                    ? "Additional details (optional)"
                    : "Tell us more"}
                </Text>
                <TextInput
                  style={[styles.reportInput, styles.reportTextArea]}
                  placeholder={
                    reportType === "stolen"
                      ? "Any other details..."
                      : "Describe the issue (at least 5 characters)"
                  }
                  placeholderTextColor={colors.textDim}
                  value={reportDetails}
                  onChangeText={setReportDetails}
                  multiline
                  textAlignVertical="top"
                />

                <Pressable
                  onPress={handleSubmitReport}
                  style={[
                    styles.reportSubmitBtn,
                    reportSubmitting && { opacity: 0.5 },
                  ]}
                  disabled={reportSubmitting}
                >
                  {reportSubmitting ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.reportSubmitText}>Submit Report</Text>
                  )}
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

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


  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
  },
  menuItemDanger: {
    color: colors.danger,
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
  settingsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  settingsModal: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    width: "85%",
    padding: 20,
  },
  settingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  settingsTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  settingsClose: {
    color: colors.textFaint,
    fontSize: 18,
    padding: 4,
  },
  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingsLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
  },
  reportSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  reportRadioItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportRadioItemSelected: {
    borderColor: colors.accentFaded,
    backgroundColor: colors.accentFaded
  },
  reportRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textFaint,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  reportRadioSelected: {
    borderColor: colors.accent,
  },
  reportRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  reportRadioText: {
    color: colors.text,
    fontSize: 15,
    flex: 1,
    lineHeight: 21,
  },
  reportBackBtn: {
    padding: 4,
    marginRight: 4,
  },
  reportBackArrow: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: "600",
  },
  reportReasonChip: {
    backgroundColor: colors.accentFaded,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  reportReasonChipText: {
    color: colors.accentLight,
    fontSize: 14,
    fontWeight: "500",
  },
  reportContinueBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 24,
  },
  reportContinueBtnDisabled: {
    backgroundColor: colors.border,
  },
  reportContinueText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  reportContinueTextDisabled: {
    color: colors.textFaint,
  },
  reportLabel: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 8,
    marginTop: 16,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reportInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reportTextArea: {
    minHeight: 110,
    paddingTop: 12,
  },
  reportSubmitBtn: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 24,
  },
  reportSubmitText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
