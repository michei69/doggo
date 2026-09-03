import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import FormSheet from "../common/FormSheet";
import { colors } from "../../utils/colors";

export default function ChatSummaryModal({
  visible,
  summary,
  onChangeSummary,
  onClose,
  onSave,
  saving,
  loading,
  canGenerateFromLastMessage,
  onGenerateFromChat,
  onGenerateFromLastMessage,
}: {
  visible: boolean;
  summary: string;
  onChangeSummary: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  loading: boolean;
  canGenerateFromLastMessage: boolean;
  onGenerateFromChat: () => void;
  onGenerateFromLastMessage: () => void;
}) {
  return (
    <FormSheet
      visible={visible}
      title="Chat Summary"
      onClose={onClose}
      onCancel={onClose}
      onSave={onSave}
      saveLabel="Save"
      cancelLabel="Cancel"
      saving={saving}
      saveDisabled={loading}
    >
      <View style={styles.field}>
        <Text style={styles.label}>Summary</Text>
        <TextInput
          multiline
          value={summary}
          onChangeText={onChangeSummary}
          placeholder="Memory document..."
          placeholderTextColor={colors.textDimAlt}
          style={styles.input}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.smallButtonRow}>
        <Pressable
          onPress={onGenerateFromLastMessage}
          disabled={loading || !canGenerateFromLastMessage}
          style={({ pressed }) => [
            styles.smallButton,
            (!canGenerateFromLastMessage || loading) &&
              styles.smallButtonDisabled,
            pressed && styles.smallButtonPressed,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={styles.smallButtonText}>
              Auto-generate from last message
            </Text>
          )}
        </Pressable>
        <Pressable
          onPress={onGenerateFromChat}
          disabled={loading}
          style={({ pressed }) => [
            styles.smallButton,
            loading && styles.smallButtonDisabled,
            pressed && styles.smallButtonPressed,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={styles.smallButtonText}>Auto-generate from chat</Text>
          )}
        </Pressable>
      </View>

      {!canGenerateFromLastMessage && (
        <Text style={styles.hint}>
          “Last message” is available once a summary has been saved.
        </Text>
      )}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 16,
  },
  label: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 6,
    fontWeight: "500",
  },
  input: {
    minHeight: 180,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
  },
  smallButtonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  smallButton: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  smallButtonDisabled: {
    opacity: 0.5,
  },
  smallButtonPressed: {
    opacity: 0.7,
  },
  smallButtonText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
});
