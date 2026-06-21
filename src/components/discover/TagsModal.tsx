import React, {
  useState,
  useMemo,
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
  StyleSheet,
  View,
} from "react-native";
import { colors } from "../../utils/colors";

export interface TagEntry {
  id: string;
  name: string;
  slug: string;
}

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

export default forwardRef<
  TagsModalHandle,
  {
    mergedTags: TagEntry[];
    selectedTagIds: Set<string>;
    onToggleTag: (tagId: string) => void;
    onApply: () => void;
  }
>(({ mergedTags, selectedTagIds, onToggleTag, onApply }, ref) => {
  const [visible, setVisible] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [customTags, setCustomTags] = useState<TagEntry[]>([]);

  useImperativeHandle(ref, () => ({
    open: () => {
      setTagSearch("");
      setVisible(true);
    },
  }));

  const handleClose = useCallback(() => setVisible(false), []);

  const handleApply = useCallback(() => {
    setVisible(false);
    onApply();
  }, [onApply]);

  const handleAddCustomTag = useCallback(() => {
    const trimmed = tagSearch.trim();
    if (!trimmed) return;
    const slug = trimmed.toLowerCase().replace(/\s+/g, "_");
    const id = `top_${slug}`;
    if (!mergedTags.some((t) => t.id === id)) {
      setCustomTags((prev) => {
        if (prev.some((t) => t.id === id)) return prev;
        return [...prev, { id, name: trimmed, slug }];
      });
    }
    onToggleTag(id);
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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[styles.content, styles.tagsContent]}
          onPress={() => {}}
        >
          <Text style={styles.title}>Filter Tags</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search tags..."
              placeholderTextColor={colors.textDim}
              value={tagSearch}
              onChangeText={setTagSearch}
              autoCorrect={false}
            />
            <Pressable
              style={[
                styles.addBtn,
                !tagSearch.trim() && styles.addBtnDisabled,
              ]}
              onPress={handleAddCustomTag}
            >
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.tagsScroll}
            contentContainerStyle={styles.tagsGrid}
          >
            {filteredTags.map((tag) => {
              const selected = selectedTagIds.has(tag.id);
              const isCustom = tag.id.startsWith("top_");
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
                  onPress={() => onToggleTag(tag.id)}
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
          </ScrollView>
          <Pressable style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyText}>Apply</Text>
          </Pressable>
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
    maxWidth: 500,
  },
  tagsContent: {
    maxHeight: "70%",
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
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
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
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
    backgroundColor: "rgba(124, 92, 231, 0.3)",
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
