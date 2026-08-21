import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ScreenHeader from "../../components/common/ScreenHeader";
import EmptyState from "../../components/common/EmptyState";
import { colors } from "../../utils/colors";
import { storage } from "../../utils/storage";
import { toast } from "../../utils/toast";
import {
  StorageAccessFramework,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import { getCharacterDetail } from "../../api/characters";
import type { ProfileStackParamList } from "../../navigation/types";
import { useAlert } from "../../hooks/useAlert";
import CustomAlert from "../../components/common/CustomAlert";

type Nav = NativeStackNavigationProp<ProfileStackParamList, "HiddenCharacters">;

interface HiddenEntry {
  id: string;
  name: string;
  avatar: string;
  loading: boolean;
}

export default function HiddenCharactersScreen() {
  const { goBack } = useNavigation<Nav>();
  const { alert, showAlert, dismissAlert } = useAlert();
  const [entries, setEntries] = useState<HiddenEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const ids = await storage.getHiddenCharacters();
      const items: HiddenEntry[] = ids.map((id) => ({
        id,
        name: "",
        avatar: "",
        loading: true,
      }));
      setEntries(items);
      // Resolve names/avatars in parallel, best effort
      void Promise.all(
        items.map(async (item) => {
          try {
            const detail = await getCharacterDetail(item.id);
            setEntries((prev) =>
              prev.map((e) =>
                e.id === item.id
                  ? {
                      ...e,
                      name:
                        detail.chat_name ||
                        detail.name ||
                        item.id,
                      avatar: detail.avatar ?? "",
                      loading: false,
                    }
                  : e,
              ),
            );
          } catch {
            setEntries((prev) =>
              prev.map((e) =>
                e.id === item.id ? { ...e, loading: false } : e,
              ),
            );
          }
        }),
      );
    } catch {
      toast("Failed to load hidden characters", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleExport = useCallback(async () => {
    try {
      const ids = await storage.getHiddenCharacters();
      if (ids.length === 0) {
        toast("No hidden characters to export", "error");
        return;
      }
      const json = JSON.stringify(ids, null, 2);
      const perm =
        await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!perm.granted) {
        toast("Save cancelled", "error");
        return;
      }
      const fileUri = await StorageAccessFramework.createFileAsync(
        perm.directoryUri,
        "hidden_characters.json",
        "application/json",
      );
      await writeAsStringAsync(fileUri, json, { encoding: "utf8" as any });
      toast(`Saved ${ids.length} hidden character IDs`);
    } catch {
      toast("Failed to export hidden characters", "error");
    }
  }, []);

  const handleImport = useCallback(() => {
    const doImport = async (raw: string) => {
      try {
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          toast("Invalid JSON file", "error");
          return;
        }
        const ids = Array.isArray(parsed)
          ? (parsed as unknown[]).filter((x): x is string => typeof x === "string")
          : typeof parsed === "object" && parsed !== null
            ? Object.keys(parsed)
            : [];
        if (ids.length === 0) {
          toast("No character IDs found in file", "error");
          return;
        }
        const existing = await storage.getHiddenCharacters();
        const merged = Array.from(new Set([...existing, ...ids]));
        await storage.setHiddenCharacters(merged);
        toast(`Imported ${ids.length} hidden character IDs`);
        await loadEntries(true);
      } catch {
        toast("Failed to import hidden characters", "error");
      }
    };

    const pickFile = async () => {
      try {
        const perm =
          await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!perm.granted) {
          toast("Pick cancelled", "error");
          return;
        }
        const files = await StorageAccessFramework.readDirectoryAsync(
          perm.directoryUri,
        );
        const jsonFile = files.find((f) => f.endsWith(".json"));
        if (!jsonFile) {
          toast("No JSON file found in selected folder", "error");
          return;
        }
        const raw = await readAsStringAsync(jsonFile, {
          encoding: "utf8" as any,
        });
        await doImport(raw);
      } catch {
        toast("Failed to read file", "error");
      }
    };

    showAlert(
      "Import Hidden Characters",
      "Merge character IDs from a JSON file into the hidden list?",
      [
        {
          text: "Import",
          style: "destructive",
          onPress: () => {
            dismissAlert();
            void pickFile();
          },
        },
        { text: "Cancel", style: "cancel", onPress: dismissAlert },
      ],
    );
  }, [showAlert, dismissAlert, loadEntries]);

  const handleRemove = useCallback(
    (id: string) => {
      showAlert(
        "Remove Hidden Character",
        "Unhide this character?",
        [
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              dismissAlert();
              try {
                const existing = await storage.getHiddenCharacters();
                await storage.setHiddenCharacters(
                  existing.filter((x) => x !== id),
                );
                setEntries((prev) => prev.filter((e) => e.id !== id));
                toast("Character unhidden");
              } catch {
                toast("Failed to remove character", "error");
              }
            },
          },
          { text: "Cancel", style: "cancel", onPress: dismissAlert },
        ],
      );
    },
    [showAlert, dismissAlert],
  );

  const renderEntry = useCallback(
    ({ item }: { item: HiddenEntry }) => (
      <View style={styles.entryRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.entryName} numberOfLines={1}>
            {item.loading ? "Loading..." : item.name || item.id}
          </Text>
          <Text style={styles.entryId} numberOfLines={1}>
            {item.id}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.removeBtn,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => handleRemove(item.id)}
        >
          <Text style={styles.removeBtnText}>Unhide</Text>
        </Pressable>
      </View>
    ),
    [handleRemove],
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Hidden Characters" onBack={goBack} />
      <View style={styles.actionsRow}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
          onPress={handleImport}
        >
          <Text style={styles.actionBtnText}>Import</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
          onPress={handleExport}
        >
          <Text style={styles.actionBtnText}>Export</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator
          color={colors.accent}
          style={{ paddingVertical: 24 }}
        />
      ) : entries.length === 0 ? (
        <EmptyState
          text="No hidden characters"
          containerStyle={styles.emptyBox}
          textStyle={styles.emptyText}
        />
      ) : (
        <FlashList
          data={entries}
          keyExtractor={(entry) => entry.id}
          renderItem={renderEntry}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}

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
  container: { flex: 1, backgroundColor: colors.background },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    paddingTop: 4,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  actionBtnText: { color: colors.text, fontSize: 15, fontWeight: "700" },
  emptyBox: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: { color: colors.textFaint, fontSize: 14 },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  entryName: { color: colors.textSecondary, fontSize: 14, fontWeight: "600" },
  entryId: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  removeBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  removeBtnText: { color: colors.danger, fontSize: 12, fontWeight: "600" },
});
