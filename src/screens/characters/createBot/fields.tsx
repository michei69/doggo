import { memo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  TextInput as RNTextInput,
  Modal,
} from "react-native";
import Avatar from "../../../components/common/Avatar";
import Button from "../../../components/common/Button";
import { colors } from "../../../utils/colors";
import { EnrichedMarkdownText } from "react-native-enriched-markdown";
import { markdownStyle } from "../../../utils/markdownStyle";
import type { TagEntry } from "./botFormState";

function AvatarPicker({
  uri,
  name,
  uploading,
  onPress,
}: {
  uri: string;
  name: string;
  uploading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.avatarRow}>
      <View style={styles.avatarWrap}>
        <Avatar uri={uri} name={name} size={80} />
      </View>
      <View style={styles.avatarTextCol}>
        <Text style={styles.avatarLabel}>Avatar</Text>
        <Text style={styles.avatarHint}>
          {uploading ? "Uploading..." : "Tap to upload (256×256)"}
        </Text>
      </View>
      {uploading && <ActivityIndicator color={colors.accent} size="small" />}
    </Pressable>
  );
}

export const AvatarPickerMemo = memo(AvatarPicker);

function MultilineField({
  label,
  value,
  placeholder,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDimAlt}
        multiline
        textAlignVertical="top"
        style={[styles.input, styles.multilineInput]}
      />
    </View>
  );
}

export const MultilineFieldMemo = memo(MultilineField);

function FirstMessageEditor({
  value,
  index,
  count,
  onChange,
  onPreview,
  onAdd,
  onDelete,
  onPrev,
  onNext,
}: {
  value: string;
  index: number;
  count: number;
  onChange: (index: number, value: string) => void;
  onPreview: () => void;
  onAdd: () => void;
  onDelete: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.label}>
          First Messages ({index + 1}/{count})
        </Text>
        <View style={styles.firstMsgActions}>
          <Pressable onPress={onPreview} style={styles.previewBtn}>
            <Text style={styles.previewBtnText}>Preview</Text>
          </Pressable>
          {count < 10 && (
            <Pressable onPress={onAdd} style={styles.addBtn}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </Pressable>
          )}
          {count > 1 && (
            <Pressable onPress={onDelete} style={styles.removeBtn}>
              <Text style={styles.removeBtnText}>- Del</Text>
            </Pressable>
          )}
        </View>
      </View>
      <View style={styles.firstMsgRow}>
        <RNTextInput
          value={value}
          onChangeText={(v) => onChange(index, v)}
          placeholder={`Message ${index + 1}`}
          placeholderTextColor={colors.textDimAlt}
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.firstMsgInput]}
        />
      </View>
      {count > 1 && (
        <View style={styles.firstMsgNav}>
          <Pressable
            onPress={onPrev}
            disabled={index === 0}
            style={[styles.navBtn, index === 0 && styles.navBtnDisabled]}
          >
            <Text
              style={[
                styles.navBtnText,
                index === 0 && styles.navBtnTextDisabled,
              ]}
            >
              ← Prev
            </Text>
          </Pressable>
          <Pressable
            onPress={onNext}
            disabled={index >= count - 1}
            style={[
              styles.navBtn,
              index >= count - 1 && styles.navBtnDisabled,
            ]}
          >
            <Text
              style={[
                styles.navBtnText,
                index >= count - 1 && styles.navBtnTextDisabled,
              ]}
            >
              Next →
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export const FirstMessageEditorMemo = memo(FirstMessageEditor);

function ContentRatingToggle({
  isNsfw,
  onSelectLimited,
  onSelectLimitless,
}: {
  isNsfw: boolean;
  onSelectLimited: () => void;
  onSelectLimitless: () => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>Content Rating</Text>
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleOption, !isNsfw && styles.toggleActive]}
          onPress={onSelectLimited}
        >
          <Text
            style={[styles.toggleText, !isNsfw && styles.toggleTextActive]}
          >
            Limited
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleOption, isNsfw && styles.toggleActive]}
          onPress={onSelectLimitless}
        >
          <Text style={[styles.toggleText, isNsfw && styles.toggleTextActive]}>
            Limitless
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export const ContentRatingToggleMemo = memo(ContentRatingToggle);

function TagEditor({
  customTags,
  selectedCount,
  tagSearch,
  selectedTagIdsSet,
  filteredTags,
  onRemoveTag,
  onAddTag,
  onToggleTag,
  onSearchChange,
}: {
  customTags: string[];
  selectedCount: number;
  tagSearch: string;
  selectedTagIdsSet: Set<number>;
  filteredTags: TagEntry[];
  onRemoveTag: (tag: string) => void;
  onAddTag: () => void;
  onToggleTag: (tagId: number) => void;
  onSearchChange: (text: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>
        Tags ({customTags.length + selectedCount}/10)
      </Text>

      {customTags.length > 0 && (
        <View style={styles.chipRow}>
          {customTags.map((tag) => (
            <Pressable
              key={`custom-${tag}`}
              style={styles.chipSelected}
              onPress={() => onRemoveTag(tag)}
            >
              <Text style={styles.chipSelectedText}>{tag} ✕</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.customTagRow}>
        <RNTextInput
          value={tagSearch}
          onChangeText={onSearchChange}
          placeholder="Add custom tag..."
          placeholderTextColor={colors.textDimAlt}
          style={[styles.input, styles.customTagInput]}
          onSubmitEditing={onAddTag}
          returnKeyType="done"
        />
        <Pressable onPress={onAddTag} style={styles.addTagBtn}>
          <Text style={styles.addTagBtnText}>Add</Text>
        </Pressable>
      </View>

      {filteredTags.length > 0 && (
        <View style={styles.chipRow}>
          {filteredTags.map((tag) => {
            const selected = selectedTagIdsSet.has(tag.id);
            return (
              <Pressable
                key={tag.id}
                style={selected ? styles.chipSelected : styles.chip}
                onPress={() => onToggleTag(tag.id)}
              >
                <Text
                  style={
                    selected ? styles.chipSelectedText : styles.chipText
                  }
                >
                  {tag.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export const TagEditorMemo = memo(TagEditor);

function SaveBar({
  isEditMode,
  saving,
  onSave,
  onReset,
}: {
  isEditMode: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <>
      <Button
        title={isEditMode ? "Save Changes" : "Create Bot"}
        onPress={onSave}
        loading={saving}
        style={styles.saveBtn}
      />
      <Button
        title="Reset"
        onPress={onReset}
        variant="outline"
        style={styles.resetBtn}
      />
    </>
  );
}

export const SaveBarMemo = memo(SaveBar);

function PreviewModal({
  visible,
  message,
  index,
  onClose,
  onLinkPress,
}: {
  visible: boolean;
  message: string;
  index: number;
  onClose: () => void;
  onLinkPress: ({ url }: { url: string }) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.previewOverlay}>
        <View style={styles.previewModal}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>
              Preview: Message {index + 1}
            </Text>
            <Pressable onPress={onClose}>
              <Text style={styles.previewClose}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.previewScroll}>
            <View style={styles.previewBubble}>
              <EnrichedMarkdownText
                markdown={message}
                markdownStyle={markdownStyle}
                onLinkPress={onLinkPress}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export const PreviewModalMemo = memo(PreviewModal);

const styles = StyleSheet.create({
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  avatarWrap: {
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.accent,
    overflow: "hidden",
  },
  avatarTextCol: {
    flex: 1,
  },
  avatarLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  avatarHint: {
    color: colors.textMuted,
    fontSize: 13,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 6,
    fontWeight: "500",
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 100,
    paddingTop: 14,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  firstMsgActions: {
    flexDirection: "row",
    gap: 8,
  },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: colors.accentFaded,
    borderRadius: 8,
  },
  previewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  previewBtnText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  addBtnText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  firstMsgRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  firstMsgInput: {
    flex: 1,
    minHeight: 60,
    paddingTop: 10,
  },
  removeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: colors.dangerLight,
    borderRadius: 8,
  },
  removeBtnText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "700",
  },
  firstMsgNav: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
  },
  navBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  navBtnTextDisabled: {
    color: colors.textDimAlt,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewModal: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    width: "90%",
    maxHeight: "70%",
    padding: 20,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  previewTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  previewClose: {
    color: colors.textFaint,
    fontSize: 18,
    padding: 4,
  },
  previewScroll: {
    maxHeight: "100%",
  },
  previewBubble: {
    backgroundColor: colors.background,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  toggleActive: {
    backgroundColor: colors.accent,
  },
  toggleText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: "600",
  },
  toggleTextActive: {
    color: colors.text,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  chipSelected: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.accentFaded,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  chipSelectedText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  customTagRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  customTagInput: {
    flex: 1,
  },
  addTagBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.accent,
    borderRadius: 12,
    justifyContent: "center",
  },
  addTagBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  saveBtn: {
    marginTop: 12,
  },
  resetBtn: {
    marginTop: 12,
  },
});
