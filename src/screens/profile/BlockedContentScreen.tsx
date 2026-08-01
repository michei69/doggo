import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  Keyboard,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ScreenHeader from "../../components/common/ScreenHeader";
import CustomAlert from "../../components/common/CustomAlert";
import { useAlert } from "../../hooks/useAlert";
import { colors } from "../../utils/colors";
import { getBlockedContent, updateBlockedContent } from "../../api/profile";
import { getTagSuggestions, getTags } from "../../api/characters";
import type { BlockedContent, CharacterTag } from "../../types/api";
import type { ProfileStackParamList } from "../../navigation/types";
import { scheduleOnRN } from "react-native-worklets";

type Nav = NativeStackNavigationProp<ProfileStackParamList, "BlockedContent">;

type Tab = "creators" | "characters" | "tags";

const TABS: { key: Tab; label: string }[] = [
  { key: "creators", label: "Creators" },
  { key: "characters", label: "Characters" },
  { key: "tags", label: "Tags" },
];

const TAB_COUNT = TABS.length;

function tabIndex(tab: Tab): number {
  return TABS.findIndex((t) => t.key === tab);
}

function useTabSwipe({
  activeTab,
  screenWidth,
  onChangeTab,
}: {
  activeTab: Tab;
  screenWidth: number;
  onChangeTab: (tab: Tab) => void;
}) {
  const tabIndicator = useSharedValue(0);
  const tabRowWidth = useSharedValue(1);
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const snapToTab = useCallback(
    (t: Tab) => {
      const idx = tabIndex(t);
      onChangeTab(t);
      translateX.value = withTiming(-idx * screenWidth, { duration: 250 });
      tabIndicator.value = withTiming(
        idx * (tabRowWidth.value / TAB_COUNT),
        { duration: 250 },
      );
    },
    [translateX, tabIndicator, tabRowWidth, screenWidth, onChangeTab],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-10, 10])
        .onBegin(() => {
          startX.value = translateX.value;
        })
        .onUpdate((event) => {
          const maxOffset = -(TAB_COUNT - 1) * screenWidth;
          const raw = startX.value + event.translationX;
          const clamped = Math.max(maxOffset, Math.min(0, raw));
          translateX.value = clamped;
          const progress = -clamped / screenWidth;
          tabIndicator.value = (progress / TAB_COUNT) * tabRowWidth.value;
        })
        .onEnd((event) => {
          const velocity = event.velocityX ?? 0;
          const currentIdx = Math.round(-translateX.value / screenWidth);

          if (velocity > 300) {
            const target = Math.max(0, currentIdx - 1);
            scheduleOnRN(snapToTab, TABS[target].key);
          } else if (velocity < -300) {
            const target = Math.min(TAB_COUNT - 1, currentIdx + 1);
            scheduleOnRN(snapToTab, TABS[target].key);
          } else {
            const idx = Math.max(
              0,
              Math.min(TAB_COUNT - 1, currentIdx),
            );
            scheduleOnRN(snapToTab, TABS[idx].key);
          }
        }),
    [translateX, startX, tabIndicator, tabRowWidth, screenWidth, snapToTab],
  );

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabIndicator.value }],
  }));

  const contentTranslateStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleTabRowLayout = useCallback(
    (width: number) => {
      tabRowWidth.value = width;
      const idx = tabIndex(activeTab);
      tabIndicator.value = idx * (width / TAB_COUNT);
      translateX.value = -idx * screenWidth;
    },
    [activeTab, tabIndicator, translateX, tabRowWidth, screenWidth],
  );

  return {
    snapToTab,
    panGesture,
    indicatorStyle,
    contentTranslateStyle,
    handleTabRowLayout,
  };
}

const SaveButton = React.memo(function SaveButton({
  saving,
  hasChanges,
  onPress,
}: {
  saving: boolean;
  hasChanges: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!hasChanges || saving}
      style={[styles.saveBtn, !hasChanges && styles.saveBtnDisabled]}
    >
      {saving ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : (
        <Text
          style={[
            styles.saveBtnText,
            !hasChanges && styles.saveBtnTextDisabled,
          ]}
        >
          Save
        </Text>
      )}
    </Pressable>
  );
});

const TabBar = React.memo(function TabBar({
  activeTab,
  onSelect,
  onLayout,
  indicatorStyle,
}: {
  activeTab: Tab;
  onSelect: (tab: Tab) => void;
  onLayout: (width: number) => void;
  indicatorStyle: ReturnType<typeof useAnimatedStyle>;
}) {
  return (
    <View
      style={styles.tabRow}
      onLayout={(e) => onLayout(e.nativeEvent.layout.width)}
    >
      {TABS.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => onSelect(tab.key)}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
      <Animated.View style={[styles.tabIndicator, indicatorStyle]} />
    </View>
  );
});

const EmptyState = React.memo(function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
});

function RemoveButton({
  onPress,
}: {
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.removeBtn,
        pressed && { opacity: 0.7 },
      ]}
      onPress={onPress}
    >
      <Text style={styles.removeBtnText}>✕</Text>
    </Pressable>
  );
}

const ItemRows = React.memo(function ItemRows({
  items,
  emptyText,
  onRemove,
}: {
  items: string[];
  emptyText: string;
  onRemove: (item: string) => void;
}) {
  if (items.length === 0) {
    return <EmptyState text={emptyText} />;
  }
  return (
    <>
      {items.map((item) => (
        <View key={item} style={styles.itemRow}>
          <Text style={styles.itemText}>{item}</Text>
          <RemoveButton onPress={() => onRemove(item)} />
        </View>
      ))}
    </>
  );
});

const ItemList = React.memo(function ItemList({
  width,
  items,
  emptyText,
  onRemove,
}: {
  width: number;
  items: string[];
  emptyText: string;
  onRemove: (item: string) => void;
}) {
  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={styles.contentInner}
      keyboardShouldPersistTaps="handled"
    >
      <ItemRows items={items} emptyText={emptyText} onRemove={onRemove} />
    </ScrollView>
  );
});

const AddButton = React.memo(function AddButton({
  onPress,
}: {
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.addBtn,
        pressed && { opacity: 0.7 },
      ]}
      onPress={onPress}
    >
      <Text style={styles.addBtnText}>Add</Text>
    </Pressable>
  );
});

const AutocompleteInput = React.memo(function AutocompleteInput({
  value,
  placeholder,
  onChangeText,
  onSubmit,
  onFocus,
  onBlur,
  showDropdown,
  suggestions,
}: {
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  onFocus?: () => void;
  onBlur: () => void;
  showDropdown: boolean;
  suggestions: { key: string; label: string; onPress: () => void }[];
}) {
  return (
    <View style={styles.autocompleteContainer}>
      <TextInput
        style={styles.addInput}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="done"
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {showDropdown && (
        <View style={styles.suggestionsDropdown}>
          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            style={styles.suggestionsList}
          >
            {suggestions.map((s) => (
              <Pressable
                key={s.key}
                style={({ pressed }) => [
                  styles.suggestionItem,
                  pressed && {
                    backgroundColor: colors.accentFaded,
                  },
                ]}
                onPress={s.onPress}
              >
                <Text style={styles.suggestionText}>{s.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
});

const TagsPanel = React.memo(function TagsPanel({
  width,
  keywords,
  tags,
  allTags,
  inputValue,
  suggestions,
  showSuggestions,
  tagSearchValue,
  showTagSuggestions,
  filteredTagSuggestions,
  onInputChange,
  onSubmitKeyword,
  onAddKeyword,
  onKeywordFocus,
  onKeywordBlur,
  onTagSearchChange,
  onTagBlur,
  onRemoveKeyword,
  onRemoveTag,
  onAddTag,
}: {
  width: number;
  keywords: string[];
  tags: number[];
  allTags: CharacterTag[];
  inputValue: string;
  suggestions: string[];
  showSuggestions: boolean;
  tagSearchValue: string;
  showTagSuggestions: boolean;
  filteredTagSuggestions: CharacterTag[];
  onInputChange: (text: string) => void;
  onSubmitKeyword: () => void;
  onAddKeyword: (keyword: string) => void;
  onKeywordFocus: () => void;
  onKeywordBlur: () => void;
  onTagSearchChange: (text: string) => void;
  onTagBlur: () => void;
  onRemoveKeyword: (keyword: string) => void;
  onRemoveTag: (id: number) => void;
  onAddTag: (tag: CharacterTag) => void;
}) {
  const keywordSuggestions = useMemo(
    () =>
      suggestions.map((s) => ({
        key: s,
        label: s,
        onPress: () => onAddKeyword(s),
      })),
    [suggestions, onAddKeyword],
  );

  const tagSuggestions = useMemo(
    () =>
      filteredTagSuggestions.map((tag) => ({
        key: String(tag.id),
        label: tag.name,
        onPress: () => onAddTag(tag),
      })),
    [filteredTagSuggestions, onAddTag],
  );

  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={styles.contentInner}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.sectionTitle}>Custom Tags</Text>
      <View style={styles.addRow}>
        <AutocompleteInput
          value={inputValue}
          placeholder="Search custom tags..."
          onChangeText={onInputChange}
          onSubmit={onSubmitKeyword}
          onFocus={onKeywordFocus}
          onBlur={onKeywordBlur}
          showDropdown={showSuggestions}
          suggestions={keywordSuggestions}
        />
        <AddButton onPress={onSubmitKeyword} />
      </View>

      <ItemRows
        items={keywords}
        emptyText="No blocked custom tags"
        onRemove={onRemoveKeyword}
      />

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Tags</Text>
      <View style={styles.addRow}>
        <AutocompleteInput
          value={tagSearchValue}
          placeholder="Search tags..."
          onChangeText={onTagSearchChange}
          onBlur={onTagBlur}
          showDropdown={showTagSuggestions && filteredTagSuggestions.length > 0}
          suggestions={tagSuggestions}
        />
      </View>

      {tags.length === 0 ? (
        <EmptyState text="No blocked tags" />
      ) : (
        tags.map((id) => {
          const tag = allTags.find((t) => t.id === id);
          return (
            <View key={String(id)} style={styles.itemRow}>
              <Text style={styles.itemText}>
                {tag ? tag.name : `#${id}`}
              </Text>
              <RemoveButton onPress={() => onRemoveTag(id)} />
            </View>
          );
        })
      )}
    </ScrollView>
  );
});

export default function BlockedContentScreen() {
  const { goBack } = useNavigation<Nav>();
  const { alert, showAlert, dismissAlert } = useAlert();

  const [activeTab, setActiveTab] = useState<Tab>("creators");
  const [blocked, setBlocked] = useState<BlockedContent>({
    bots: [],
    creators: [],
    keywords: [],
    tags: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allTags, setAllTags] = useState<CharacterTag[]>([]);
  const [tagSearchValue, setTagSearchValue] = useState("");
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  const initialRef = useRef<BlockedContent | null>(null);
  const suggestTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { width: screenWidth } = useWindowDimensions();

  const {
    snapToTab,
    panGesture,
    indicatorStyle,
    contentTranslateStyle,
    handleTabRowLayout,
  } = useTabSwipe({ activeTab, screenWidth, onChangeTab: setActiveTab });

  const loadBlockedContent = useCallback(async () => {
    try {
      const [data, tags] = await Promise.all([
        getBlockedContent(),
        getTags(),
      ]);
      setBlocked(data);
      setAllTags(tags);
      initialRef.current = JSON.parse(JSON.stringify(data));
    } catch {
      showAlert("Error", "Failed to load blocked content", [{ text: "OK" }]);
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadBlockedContent();
  }, [loadBlockedContent]);

  const hasChanges =
    initialRef.current !== null &&
    JSON.stringify(blocked) !== JSON.stringify(initialRef.current);

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      await updateBlockedContent(blocked);
      initialRef.current = JSON.parse(JSON.stringify(blocked));
      showAlert("Saved", "Blocked content updated", [{ text: "OK" }]);
    } catch {
      showAlert("Error", "Failed to save blocked content", [{ text: "OK" }]);
    } finally {
      setSaving(false);
    }
  }, [blocked, hasChanges, showAlert]);

  const handleAddKeyword = useCallback(
    (keyword: string) => {
      const trimmed = keyword.trim();
      if (!trimmed) return;
      if (blocked.keywords.includes(trimmed)) {
        setInputValue("");
        setShowSuggestions(false);
        return;
      }
      setBlocked((prev) => ({
        ...prev,
        keywords: [...prev.keywords, trimmed],
      }));
      setInputValue("");
      setShowSuggestions(false);
    },
    [blocked.keywords],
  );

  const handleRemoveCreator = useCallback((name: string) => {
    setBlocked((prev) => ({
      ...prev,
      creators: prev.creators.filter((c) => c !== name),
    }));
  }, []);

  const handleRemoveCharacter = useCallback((name: string) => {
    setBlocked((prev) => ({
      ...prev,
      bots: prev.bots.filter((b) => b !== name),
    }));
  }, []);

  const handleRemoveKeyword = useCallback((keyword: string) => {
    setBlocked((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((k) => k !== keyword),
    }));
  }, []);

  const handleRemoveTag = useCallback((id: number) => {
    setBlocked((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== id),
    }));
  }, []);

  const blockedTagsSet = useMemo(() => new Set(blocked.tags), [blocked.tags]);

  const filteredTagSuggestions = useMemo(() => {
    const q = tagSearchValue.trim().toLowerCase();
    if (q.length < 1) return [];
    return allTags
      .filter(
        (t) => t.name.toLowerCase().includes(q) && !blockedTagsSet.has(t.id),
      )
      .slice(0, 20);
  }, [tagSearchValue, allTags, blockedTagsSet]);

  const handleAddTag = useCallback(
    (tag: CharacterTag) => {
      setBlocked((prev) => ({
        ...prev,
        tags: [...prev.tags, tag.id],
      }));
      setTagSearchValue("");
      setShowTagSuggestions(false);
    },
    [],
  );

  const handleInputChange = useCallback(
    (text: string) => {
      setInputValue(text);
      if (activeTab !== "tags") return;

      if (suggestTimeout.current) {
        clearTimeout(suggestTimeout.current);
      }

      const trimmed = text.trim();
      if (trimmed.length < 1) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      suggestTimeout.current = setTimeout(async () => {
        try {
          const result = await getTagSuggestions(trimmed);
          setSuggestions(result.suggestions);
          setShowSuggestions(result.suggestions.length > 0);
        } catch {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }, 300);
    },
    [activeTab],
  );

  const handleSubmitKeyword = useCallback(() => {
    handleAddKeyword(inputValue);
  }, [handleAddKeyword, inputValue]);

  const handleKeywordFocus = useCallback(() => {
    if (suggestions.length > 0) setShowSuggestions(true);
  }, [suggestions]);

  const handleKeywordBlur = useCallback(() => {
    setTimeout(() => setShowSuggestions(false), 200);
  }, []);

  const handleTagSearchChange = useCallback((text: string) => {
    setTagSearchValue(text);
    setShowTagSuggestions(text.trim().length > 0);
  }, []);

  const handleTagBlur = useCallback(() => {
    setTimeout(() => setShowTagSuggestions(false), 200);
  }, []);

  const handleTabPress = useCallback(
    (tab: Tab) => {
      snapToTab(tab);
      setInputValue("");
      setShowSuggestions(false);
      setTagSearchValue("");
      setShowTagSuggestions(false);
      Keyboard.dismiss();
    },
    [snapToTab],
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Blocked Content" onBack={() => goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Blocked Content"
        onBack={() => goBack()}
        rightElement={
          <SaveButton
            saving={saving}
            hasChanges={hasChanges}
            onPress={handleSave}
          />
        }
      />

      <TabBar
        activeTab={activeTab}
        onSelect={handleTabPress}
        onLayout={handleTabRowLayout}
        indicatorStyle={indicatorStyle}
      />

      <GestureDetector gesture={panGesture}>
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.contentSliding,
              { width: screenWidth * TAB_COUNT },
              contentTranslateStyle,
            ]}
          >
            <ItemList
              width={screenWidth}
              items={blocked.creators}
              emptyText="No blocked creators"
              onRemove={handleRemoveCreator}
            />
            <ItemList
              width={screenWidth}
              items={blocked.bots}
              emptyText="No blocked characters"
              onRemove={handleRemoveCharacter}
            />
            <TagsPanel
              width={screenWidth}
              keywords={blocked.keywords}
              tags={blocked.tags}
              allTags={allTags}
              inputValue={inputValue}
              suggestions={suggestions}
              showSuggestions={showSuggestions}
              tagSearchValue={tagSearchValue}
              showTagSuggestions={showTagSuggestions}
              filteredTagSuggestions={filteredTagSuggestions}
              onInputChange={handleInputChange}
              onSubmitKeyword={handleSubmitKeyword}
              onAddKeyword={handleAddKeyword}
              onKeywordFocus={handleKeywordFocus}
              onKeywordBlur={handleKeywordBlur}
              onTagSearchChange={handleTagSearchChange}
              onTagBlur={handleTagBlur}
              onRemoveKeyword={handleRemoveKeyword}
              onRemoveTag={handleRemoveTag}
              onAddTag={handleAddTag}
            />
          </Animated.View>
        </View>
      </GestureDetector>

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        onDismiss={dismissAlert}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.accentFaded,
  },
  saveBtnDisabled: {
    backgroundColor: "transparent",
  },
  saveBtnText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  saveBtnTextDisabled: {
    color: colors.textDim,
  },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    position: "relative",
    backgroundColor: colors.background,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  tabIndicator: {
    position: "absolute",
    bottom: -1,
    left: 0,
    width: "33.33%",
    height: 2,
    backgroundColor: colors.accent,
  },
  tabText: { color: colors.textFaint, fontSize: 14, fontWeight: "600" },
  tabTextActive: { color: colors.accent },
  content: { flex: 1 },
  contentSliding: { flex: 1, flexDirection: "row" },
  contentInner: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  addRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 8,
  },
  autocompleteContainer: {
    flex: 1,
    position: "relative",
  },
  addInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  suggestionsDropdown: {
    position: "absolute",
    top: 44,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  suggestionsList: {
    maxHeight: 180,
    flexGrow: 0,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textDim,
    fontSize: 14,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  itemText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.dangerLight,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  removeBtnText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
});
