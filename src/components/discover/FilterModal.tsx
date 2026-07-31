import React, {
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  ScrollView,
  Switch,
  View,
  StyleSheet,
} from "react-native";
import { colors } from "../../utils/colors";
import {
  INITIAL_FILTERS,
  type FilterOperator,
  type FilterState,
} from "../../utils/discover";

export interface FilterModalHandle {
  open: () => void;
}

function OperatorToggle({
  value,
  onChange,
}: {
  value: FilterOperator;
  onChange: (v: FilterOperator) => void;
}) {
  return (
    <View style={styles.operatorRow}>
      <Pressable
        style={[
          styles.operatorBtn,
          styles.operatorBtnLeft,
          value === "lte" && styles.operatorBtnActive,
        ]}
        onPress={() => onChange("lte")}
      >
        <Text
          style={[
            styles.operatorText,
            value === "lte" && styles.operatorTextActive,
          ]}
        >
          {"\u2264"}
        </Text>
      </Pressable>
      <Pressable
        style={[
          styles.operatorBtn,
          styles.operatorBtnRight,
          value === "gte" && styles.operatorBtnActive,
        ]}
        onPress={() => onChange("gte")}
      >
        <Text
          style={[
            styles.operatorText,
            value === "gte" && styles.operatorTextActive,
          ]}
        >
          {"\u2265"}
        </Text>
      </Pressable>
    </View>
  );
}

export default forwardRef<
  FilterModalHandle,
  { filters: FilterState; onApply: (filters: FilterState) => void }
>(({ filters, onApply }, ref) => {
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState<FilterState>(INITIAL_FILTERS);

  useImperativeHandle(ref, () => ({
    open: () => {
      setPending({ ...filters });
      setVisible(true);
    },
  }));

  const handleClose = useCallback(() => setVisible(false), []);

  const handleApply = useCallback(() => {
    setVisible(false);
    onApply(pending);
  }, [onApply, pending]);

  const handleReset = useCallback(() => {
    setPending({ ...INITIAL_FILTERS });
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[styles.content, styles.filterContent]}
          onPress={() => {}}
        >
          <Text style={styles.title}>Filters</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Messages Count</Text>
            <View style={styles.filterRow}>
              <TextInput
                style={styles.filterInput}
                placeholder="Count"
                placeholderTextColor={colors.textDim}
                keyboardType="numeric"
                value={pending.messages}
                onChangeText={(v) => setPending((p) => ({ ...p, messages: v }))}
              />
              <OperatorToggle
                value={pending.messagesMode}
                onChange={(v) => setPending((p) => ({ ...p, messagesMode: v }))}
              />
            </View>
            <Pressable
              style={styles.clearRow}
              onPress={() => setPending((p) => ({ ...p, messages: "" }))}
            >
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>

            <Text style={styles.sectionLabel}>Tokens Count</Text>
            <View style={styles.filterRow}>
              <TextInput
                style={styles.filterInput}
                placeholder="Count"
                placeholderTextColor={colors.textDim}
                keyboardType="numeric"
                value={pending.tokens}
                onChangeText={(v) => setPending((p) => ({ ...p, tokens: v }))}
              />
              <OperatorToggle
                value={pending.tokensMode}
                onChange={(v) => setPending((p) => ({ ...p, tokensMode: v }))}
              />
            </View>
            <Pressable
              style={styles.clearRow}
              onPress={() => setPending((p) => ({ ...p, tokens: "" }))}
            >
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>
                Proxy: {pending.proxyOnly ? "Only" : "Any"}
              </Text>
              <Switch
                value={pending.proxyOnly}
                onValueChange={(v) =>
                  setPending((p) => ({ ...p, proxyOnly: v }))
                }
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.text}
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>
                {pending.limitlessMode ? "Limited & Limitless" : "Limited Only"}
              </Text>
              <Switch
                value={pending.limitlessMode}
                onValueChange={(v) =>
                  setPending((p) => ({ ...p, limitlessMode: v }))
                }
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.text}
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>
                Profile Picture: {pending.customAvatar ? "Custom" : "Any"}
              </Text>
              <Switch
                value={pending.customAvatar}
                onValueChange={(v) =>
                  setPending((p) => ({ ...p, customAvatar: v }))
                }
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.text}
              />
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetText}>Reset</Text>
            </Pressable>
            <Pressable style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyText}>Apply</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    width: "85%",
    maxWidth: 480,
  },
  filterContent: {
    maxHeight: "85%",
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  sectionLabel: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  filterInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  operatorRow: {
    flexDirection: "row",
    gap: 0,
    borderRadius: 8,
    overflow: "hidden",
  },
  operatorBtn: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  operatorBtnLeft: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  operatorBtnRight: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  operatorBtnActive: {
    backgroundColor: "rgba(124, 92, 231, 0.3)",
    borderColor: colors.accent,
  },
  operatorText: {
    color: colors.textDim,
    fontSize: 16,
    fontWeight: "600",
  },
  operatorTextActive: {
    color: colors.accent,
  },
  clearRow: {
    alignSelf: "flex-end",
    marginBottom: 12,
  },
  clearText: {
    color: colors.accent,
    fontSize: 13,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toggleLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  resetButton: {
    flex: 1,
    backgroundColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  resetText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  applyButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  applyText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
});
