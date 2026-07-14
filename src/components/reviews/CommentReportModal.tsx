import { useState, useCallback, memo } from "react";
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  Modal,
} from "react-native";
import { reportComment } from "../../api/reviews";
import { colors } from "../../utils/colors";

const REPORT_REASONS = [
  { label: "Spam or low quality", type: "spam" },
  { label: "Harassment or hate speech", type: "harassment" },
  { label: "Illegal or harmful content", type: "illegal" },
  { label: "Other", type: "other" },
];

function CommentReportModal({
  visible,
  commentId,
  reviewId,
  onClose,
}: {
  visible: boolean;
  commentId: string;
  reviewId: string;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<1 | 2>(1);
  const [reason, setReason] = useState("");
  const [reportType, setReportType] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = useCallback(() => {
    setReason("");
    setReportType("");
    setDetails("");
    setPhase(1);
    onClose();
  }, [onClose]);

  const handleSelectReason = useCallback(
    (label: string, type: string) => {
      setReason(label);
      setReportType(type);
    },
    [],
  );

  const handleContinue = useCallback(() => {
    if (!reportType) return;
    setPhase(2);
  }, [reportType]);

  const handleSubmit = useCallback(async () => {
    if (details.trim().length <= 5) return;

    setSubmitting(true);
    try {
      await reportComment({
        comment_id: commentId,
        review_id: reviewId,
        reason: reportType,
        details: details.trim(),
      });
      handleClose();
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }, [commentId, reviewId, reportType, details, handleClose]);

  const handleBack = useCallback(() => setPhase(1), []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.modal} onPress={() => {}}>
          {phase === 1 ? (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Report Comment</Text>
                <Pressable onPress={handleClose}>
                  <Text style={styles.close}>{"\u2715"}</Text>
                </Pressable>
              </View>
              <Text style={styles.subtitle}>
                Why are you reporting this comment?
              </Text>
              {REPORT_REASONS.map((r) => {
                const selected = reportType === r.type;
                return (
                  <Pressable
                    key={r.type}
                    onPress={() => handleSelectReason(r.label, r.type)}
                    style={[
                      styles.radioItem,
                      selected && styles.radioItemSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.radio,
                        selected && styles.radioSelected,
                      ]}
                    >
                      {selected && <View style={styles.radioDot} />}
                    </View>
                    <Text style={styles.radioText}>{r.label}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={handleContinue}
                style={[
                  styles.continueBtn,
                  !reportType && styles.continueBtnDisabled,
                ]}
                disabled={!reportType}
              >
                <Text
                  style={[
                    styles.continueText,
                    !reportType && styles.continueTextDisabled,
                  ]}
                >
                  Continue
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.header}>
                <Pressable onPress={handleBack} style={styles.backBtn}>
                  <Text style={styles.backArrow}>{"\u2190"}</Text>
                </Pressable>
                <Text style={styles.title}>Report Comment</Text>
                <Pressable onPress={handleClose}>
                  <Text style={styles.close}>{"\u2715"}</Text>
                </Pressable>
              </View>
              <View style={styles.reasonChip}>
                <Text style={styles.reasonChipText}>{reason}</Text>
              </View>

              <Text style={styles.label}>Tell us more</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the issue (at least 5 characters)"
                placeholderTextColor={colors.textDim}
                value={details}
                onChangeText={setDetails}
                multiline
                textAlignVertical="top"
              />

              <Pressable
                onPress={handleSubmit}
                style={[
                  styles.submitBtn,
                  submitting && { opacity: 0.5 },
                ]}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.submitText}>Submit Report</Text>
                )}
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default memo(CommentReportModal);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
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
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  radioItem: {
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
  radioItemSelected: {
    borderColor: colors.accentFaded,
    backgroundColor: colors.accentFaded,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textFaint,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  radioSelected: {
    borderColor: colors.accent,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  radioText: {
    color: colors.text,
    fontSize: 15,
    flex: 1,
    lineHeight: 21,
  },
  continueBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 24,
  },
  continueBtnDisabled: {
    backgroundColor: colors.border,
  },
  continueText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  continueTextDisabled: {
    color: colors.textFaint,
  },
  backBtn: {
    padding: 4,
    marginRight: 4,
  },
  backArrow: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: "600",
  },
  reasonChip: {
    backgroundColor: colors.accentFaded,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  reasonChipText: {
    color: colors.accentLight,
    fontSize: 14,
    fontWeight: "500",
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 8,
    marginTop: 16,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textArea: {
    minHeight: 110,
    paddingTop: 12,
  },
  submitBtn: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 24,
  },
  submitText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
