import { useState, useCallback } from "react";
import { View, TextInput, Pressable, Text, StyleSheet } from "react-native";
import { colors } from "../../utils/colors";

export default function ChatInput({
  onSend,
  isSending,
  isGenerating = false,
  onCancel,
  placeholder = "Type a message\u2026",
  disabled = false,
}: {
  onSend: (content: string) => void;
  isSending: boolean;
  isGenerating?: boolean;
  onCancel?: () => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed && !isSending && !isGenerating) {
      onSend(trimmed);
      setText("");
    }
  }, [text, isSending, isGenerating, onSend]);

  const busy = isSending || isGenerating || disabled;

  const stopBtnStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.sendBtn,
      styles.stopBtn,
      pressed && { opacity: 0.7 },
    ],
    [],
  );

  const sendBtnStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.sendBtn,
      (!text.trim() || busy) && styles.sendBtnDisabled,
      pressed && !(!text.trim() || busy) && { opacity: 0.7 },
    ],
    [text, busy],
  );

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.textDimAlt}
          multiline
          maxLength={5000}
          style={styles.input}
          editable={!busy}
        />
        {isGenerating ? (
          <Pressable onPress={onCancel} style={stopBtnStyle}>
            <Text style={styles.stopIcon}>{"\u25A0"}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || busy}
            style={sendBtnStyle}
          >
            <Text style={styles.sendIcon}>{"\u2191"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    backgroundColor: colors.border,
  },
  stopBtn: {
    backgroundColor: colors.danger,
  },
  sendIcon: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  stopIcon: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
});
