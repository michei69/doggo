import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { getMyProfile, getMyPersonas } from "../../api/profile";
import Avatar from "../common/Avatar";
import { avatarUrl } from "../../utils/assets";
import { colors } from "../../utils/colors";
import type {
  UserProfile,
  Persona,
  PersonaRef,
  PersonaEntry,
} from "../../types/api";

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
  onSelect: (persona: PersonaRef | null) => void;
  characterName: string;
  title?: string;
  subtitle?: string;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const wasVisibleRef = useRef(visible);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [p, ps] = await Promise.allSettled([
        getMyProfile(),
        getMyPersonas(),
      ]);
      if (p.status === "fulfilled") setProfile(p.value);
      if (ps.status === "fulfilled") setPersonas(ps.value);
      if (p.status === "rejected" && ps.status === "rejected") {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const wasVisible = wasVisibleRef.current;
    wasVisibleRef.current = visible;
    if (visible && !wasVisible) {
      fetchData();
    }
  }, [visible, fetchData]);

  const entries = useMemo((): PersonaEntry[] => {
    const main: PersonaEntry[] = profile
      ? [
          {
            id: "__main__",
            name: profile.name,
            avatar: profile.avatar,
            appearance: profile.profile,
            order: 0,
          },
        ]
      : [];
    const others: PersonaEntry[] = personas.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      appearance: p.appearance,
      order: 1,
    }));
    return [...main, ...others].sort((a, b) => a.order - b.order);
  }, [profile, personas]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content} onPress={() => {}}>
          <Text style={styles.title}>
            {title ?? `Start Chat with ${characterName}`}
          </Text>
          <Text style={styles.subtitle}>{subtitle ?? "Choose a persona"}</Text>

          {loading ? (
            <ActivityIndicator
              color={colors.accent}
              style={{ paddingVertical: 24 }}
            />
          ) : error && entries.length === 0 ? (
            <View style={styles.errorBox}>
              <Text style={styles.empty}>Failed to load personas</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.retryBtn,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={fetchData}
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : entries.length === 0 ? (
            <Text style={styles.empty}>No personas available</Text>
          ) : (
            <ScrollView
              style={styles.list}
              showsVerticalScrollIndicator={false}
            >
              {entries.map((item) => (
                <View key={item.id}>
                  <PersonaRow
                    item={item}
                    onClose={onClose}
                    onSelect={onSelect}
                  />
                </View>
              ))}
            </ScrollView>
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

const PersonaRow = React.memo(function PersonaRow({
  item,
  onClose,
  onSelect,
}: {
  item: PersonaEntry;
  onClose: () => void;
  onSelect: (persona: PersonaRef | null) => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.persona, pressed && { opacity: 0.7 }]}
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
  );
});

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
  errorBox: {
    alignItems: "center",
    paddingVertical: 12,
  },
  retryBtn: {
    backgroundColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  retryText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
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
