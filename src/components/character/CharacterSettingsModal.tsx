import { memo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Switch,
} from "react-native";
import type { CharacterDetail } from "../../types/api";
import { colors } from "../../utils/colors";

function CharacterSettingsModal({
  visible,
  character,
  savingKey,
  onToggle,
  onClose,
}: {
  visible: boolean;
  character: CharacterDetail;
  savingKey: string | null;
  onToggle: (key: "showdefinition" | "allow_proxy" | "allow_published_chats") => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>Character Settings</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.close}>{"✕"}</Text>
            </Pressable>
          </View>

          <View style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.label}>Show Definition</Text>
            </View>
            <Switch
              value={character.showdefinition ?? false}
              onValueChange={() => onToggle("showdefinition")}
              trackColor={{ false: colors.border, true: colors.accent }}
              disabled={savingKey !== null}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.label}>Allow Proxies</Text>
            </View>
            <Switch
              value={character.allow_proxy ?? false}
              onValueChange={() => onToggle("allow_proxy")}
              trackColor={{ false: colors.border, true: colors.accent }}
              disabled={savingKey !== null}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.label}>Allow Published Chats</Text>
            </View>
            <Switch
              value={character.allow_published_chats ?? false}
              onValueChange={() => onToggle("allow_published_chats")}
              trackColor={{ false: colors.border, true: colors.accent }}
              disabled={savingKey !== null}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default memo(CharacterSettingsModal);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayStrong,
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    width: "85%",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  close: {
    color: colors.textFaint,
    fontSize: 18,
    padding: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  info: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
  },
});
