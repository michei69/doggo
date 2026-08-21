import {
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import type React from "react";
import {
  Pressable,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { colors } from "../../utils/colors";
import type { TagEntry } from "../../types/api";
import CenteredModal from "../../components/common/CenteredModal";
import { centeredModalStyles } from "../../components/common/centeredModalStyles";
import { useModalHandle } from "../../hooks/useModalHandle";

export interface TagsModalHandle {
  open: () => void;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

function tagColor(label: string, selected: boolean): object {
  const h = ((hashStr(label) % 360) + 360) % 360;
  if (selected) {
    return {
      backgroundColor: `hsla(${h}, 70%, 40%, 0.35)`,
      borderColor: `hsl(${h}, 60%, 60%)`,
    };
  }
  return {
    backgroundColor: `hsla(${h}, 70%, 40%, 0.12)`,
    borderColor: `hsla(${h}, 60%, 45%, 0.25)`,
  };
}

function tagTextColor(label: string, selected: boolean): string {
  const h = ((hashStr(label) % 360) + 360) % 360;
  return selected ? `hsl(${h}, 65%, 78%)` : `hsl(${h}, 55%, 68%)`;
}

export default function TagsModal({
  mergedTags,
  selectedTagIds,
  onToggleTag,
  onApply,
  ref,
}: {
  mergedTags: TagEntry[];
  selectedTagIds: Set<string>;
  onToggleTag: (tagId: string) => void;
  onApply: () => void;
} & { ref?: React.Ref<TagsModalHandle> }) {
  const [tagSearch, setTagSearch] = useState("");
  const [customTags, setCustomTags] = useState<TagEntry[]>([]);
  // Custom tags get negative ids (server tags are positive). Server-provided
  // top custom tags use -(index + 1); in-modal custom tags use <= -1001.
  const customIdRef = useRef(0);

  const { visible, close } = useModalHandle(ref, () => {
    setTagSearch("");
  });

  const handleApply = useCallback(() => {
    close();
    onApply();
  }, [close, onApply]);

  const handleAddCustomTag = useCallback(() => {
    const trimmed = tagSearch.trim();
    if (!trimmed) return;
    const slug = trimmed.toLowerCase().replace(/\s+/g, "_");
    if (!mergedTags.some((t) => t.id < 0 && t.slug === slug)) {
      const customId = --customIdRef.current - 1000;
      setCustomTags((prev) => {
        if (prev.some((t) => t.slug === slug)) return prev;
        return [...prev, { id: customId, name: trimmed, slug }];
      });
    }
    onToggleTag(`top_${slug}`);
    setTagSearch("");
  }, [tagSearch, onToggleTag, mergedTags]);

  const allTagList = useMemo(
    () => [...customTags, ...mergedTags],
    [customTags, mergedTags],
  );

  const filteredTags = useMemo(() => {
    if (!tagSearch.trim()) return allTagList;
    const q = tagSearch.toLowerCase();
    return allTagList.filter(
      (t) =>
        t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q),
    );
  }, [allTagList, tagSearch]);

  return (
    <CenteredModal
      visible={visible}
      onClose={close}
      title="Filter Tags"
      hideCloseButton
      contentStyle={styles.tagsContent}
    >
      <View style={styles.searchRow}>
        <TextInput
          style={centeredModalStyles.input}
          placeholder="Search tags..."
          placeholderTextColor={colors.textDim}
          value={tagSearch}
          onChangeText={setTagSearch}
          autoCorrect={false}
        />
        <Pressable
          style={[
            centeredModalStyles.addBtn,
            !tagSearch.trim() && centeredModalStyles.addBtnDisabled,
          ]}
          onPress={handleAddCustomTag}
        >
          <Text style={centeredModalStyles.addBtnText}>Add</Text>
        </Pressable>
      </View>
      <ScrollView style={styles.tagsScroll}>
        <View style={styles.tagsGrid}>
          {filteredTags.map((tag) => {
            const isCustom = tag.id < 0;
            const toggleId = isCustom ? `top_${tag.slug}` : String(tag.id);
            const selected = selectedTagIds.has(toggleId);
            const label = isCustom ? `#${tag.name}` : tag.name;
            const pillColor = isCustom ? tagColor(tag.slug, selected) : null;
            const textColor = isCustom
              ? tagTextColor(tag.slug, selected)
              : null;

            return (
              <Pressable
                key={tag.id}
                style={[
                  styles.pill,
                  selected && styles.pillSelected,
                  selected && !isCustom && styles.pillSelectedDefault,
                  pillColor,
                ]}
                onPress={() => onToggleTag(toggleId)}
              >
                <Text
                  style={[
                    styles.pillText,
                    selected && styles.pillTextSelected,
                    selected && !isCustom && styles.pillTextSelectedDefault,
                    textColor ? { color: textColor } : null,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <Pressable style={styles.applyButton} onPress={handleApply}>
        <Text style={styles.applyText}>Apply</Text>
      </Pressable>
    </CenteredModal>
  );
}

const styles = StyleSheet.create({
  tagsContent: {
    maxWidth: 500,
    maxHeight: "70%",
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tagsScroll: {
    maxHeight: 300,
  },
  tagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillSelected: {
    borderColor: colors.accent,
  },
  pillSelectedDefault: {
    backgroundColor: colors.accentStrong,
  },
  pillText: {
    color: colors.textFaint,
    fontSize: 13,
  },
  pillTextSelected: {
    color: colors.text,
  },
  pillTextSelectedDefault: {
    color: colors.text,
  },
  applyButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  applyText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
});
