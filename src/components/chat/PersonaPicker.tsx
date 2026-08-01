import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { getMyProfile, getMyPersonas } from "../../api/profile";
import Avatar from "../common/Avatar";
import { avatarUrl } from "../../utils/assets";
import { colors } from "../../utils/colors";
import type { UserProfile, Persona } from "../../types/api";

export interface PersonaEntry {
  id: string;
  name: string;
  avatar: string;
  appearance: string;
  order: number;
}

export default function PersonaPicker({
  visible,
  onClose,
  onSelect,
  characterName,
  title,
  subtitle,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (
    persona: { id: string; name: string; avatar: string } | null,
  ) => void;
  characterName: string;
  title?: string;
  subtitle?: string;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(false);

  const handleShow = useCallback(async () => {
    setLoading(true);
    try {
      let ps: Persona[] = [];
      try {
        ps = await getMyPersonas();
      } catch {}
      const p = await getMyProfile();
      setProfile(p);
      setPersonas(ps);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const entries = useMemo((): PersonaEntry[] => {
    if (!profile) return [];
    const main: PersonaEntry = {
      id: "__main__",
      name: profile.name,
      avatar: profile.avatar,
      appearance: profile.profile,
      order: 0,
    };
    const others: PersonaEntry[] = personas.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      appearance: p.appearance,
      order: 1,
    }));
    return [main, ...others].sort((a, b) => a.order - b.order);
  }, [profile, personas]);

  const renderPersona = useCallback(
    ({ item }: { item: PersonaEntry }) => (
      <Pressable
        style={({ pressed }) => [
          styles.persona,
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => {
          onClose();
          onSelect(
            item.id === "__main__"
              ? null
              : { id: item.id, name: item.name, avatar: item.avatar },
          );
        }}
      >
        <Avatar
          uri={item.avatar ? avatarUrl(item.avatar) : undefined}
          name={item.name}
          size={44}
        />
        <View style={styles.personaInfo}>
          <Text style={styles.personaName}>{item.name}</Text>
          {item.id === "__main__" ? (
            <Text style={styles.personaMeta}>Main persona</Text>
          ) : (
            <Text style={styles.personaMeta}>Persona</Text>
          )}
        </View>
      </Pressable>
    ),
    [onClose, onSelect],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onShow={handleShow}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content} onPress={() => {}}>
          <Text style={styles.title}>{title ?? `Start Chat with ${characterName}`}</Text>
          <Text style={styles.subtitle}>{subtitle ?? "Choose a persona"}</Text>

          {loading ? (
            <ActivityIndicator
              color={colors.accent}
              style={{ paddingVertical: 24 }}
            />
          ) : entries.length === 0 ? (
            <Text style={styles.empty}>No personas available</Text>
          ) : (
            <FlashList
              data={entries}
              renderItem={renderPersona}
              keyExtractor={(item) => item.id}
              style={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}

          <Pressable
            style={({ pressed }) => [
              styles.cancelBtn,
              pressed && { opacity: 0.7 },
            ]}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    maxHeight: "70%",
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textFaint,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
  },
  list: {
    maxHeight: 300,
  },
  persona: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  personaInfo: {
    flex: 1,
  },
  personaName: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  personaMeta: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  empty: {
    color: colors.textFaint,
    textAlign: "center",
    paddingVertical: 24,
  },
  cancelBtn: {
    backgroundColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
});
