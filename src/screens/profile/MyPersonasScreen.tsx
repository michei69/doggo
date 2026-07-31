import {
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
  memo,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  BackHandler,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Avatar from "../../components/common/Avatar";
import Button from "../../components/common/Button";
import CustomAlert from "../../components/common/CustomAlert";
import PersonaSheet from "./PersonaSheet";
import PersonaGroupSheet from "./PersonaGroupSheet";
import { useAuthStore } from "../../stores/authStore";
import {
  getMyProfile,
  getMyPersonas,
  deletePersona,
  reorderPersonas,
  getPersonaGroups,
  deletePersonaGroup,
  reorderPersonaGroups,
} from "../../api/profile";
import type {
  UserProfile,
  Persona,
  PersonaGroup,
  Pronouns,
} from "../../types/api";
import type { ProfileStackParamList } from "../../navigation/types";
import { colors } from "../../utils/colors";
import { avatarUrl } from "../../utils/assets";
import { scheduleOnRN } from "react-native-worklets";

function pronounLabel(p: Pronouns): string {
  return `${p.subjective}/${p.objective}`;
}

type Nav = NativeStackNavigationProp<ProfileStackParamList, "MyPersonas">;

type DragState =
  | { type: "persona"; index: number; item: Persona; startY: number }
  | { type: "group"; index: number; item: PersonaGroup; startY: number }
  | null;

export default function MyPersonasScreen() {
  const { goBack } = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [personaGroups, setPersonaGroups] = useState<PersonaGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

  const {
    tab,
    tabIndicator,
    snapToTab,
    panGesture,
    handleTabRowLayout,
    contentTranslateStyle,
  } = useTabSwipe(screenWidth);
  const {
    editModalVisible,
    setEditModalVisible,
    sheetMode,
    editingPersona,
    sheetSession,
    deleteAlertVisible,
    setDeleteAlertVisible,
    openEditMain,
    openEditPersona,
    openCreatePersona,
    handlePersonaSheetClose,
    handlePersonaSaved,
    handlePersonaDeleteRequested,
    handleDelete,
  } = usePersonaSheet(profile, setProfile, setPersonas);
  const {
    groupModalVisible,
    setGroupModalVisible,
    editingGroup,
    groupSheetSession,
    deleteGroupAlert,
    setDeleteGroupAlert,
    openCreateGroup,
    openEditGroup,
    handleGroupSheetClose,
    handleGroupSaved,
    handleGroupDeleteRequested,
    handleDeleteGroup,
  } = useGroupSheet(setPersonaGroups);
  const {
    drag,
    dragDy,
    dragStartY,
    dragTargetIdx,
    personaCardRefs,
    groupCardRefs,
    handleDragStartPersona,
    handleDragEndPersona,
    handleDragStartGroup,
    handleDragEndGroup,
  } = useDragReorder(personas, personaGroups, setPersonas, setPersonaGroups);

  // Android back button dismisses sheets instead of navigating back
  useEffect(() => {
    const handler = () => {
      if (deleteAlertVisible) {
        setDeleteAlertVisible(false);
        return true;
      }
      if (deleteGroupAlert) {
        setDeleteGroupAlert(false);
        return true;
      }
      if (editModalVisible) {
        setEditModalVisible(false);
        return true;
      }
      if (groupModalVisible) {
        setGroupModalVisible(false);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", handler);
    return () => sub.remove();
  }, [
    editModalVisible,
    groupModalVisible,
    deleteAlertVisible,
    deleteGroupAlert,
    setEditModalVisible,
    setGroupModalVisible,
    setDeleteAlertVisible,
    setDeleteGroupAlert,
  ]);

  const loadData = useCallback(async () => {
    try {
      const [p, ps, gs] = await Promise.all([
        getMyProfile(),
        getMyPersonas(),
        getPersonaGroups().catch(() => [] as PersonaGroup[]),
      ]);
      setProfile(p);
      setPersonas(ps);
      setPersonaGroups(gs);
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        await loadData();
        if (!cancelled) setLoading(false);
      };
      load();
      return () => {
        cancelled = true;
      };
    }, [loadData]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const closePersonaDeleteAlert = useCallback(() => {
    setDeleteAlertVisible(false);
  }, [setDeleteAlertVisible]);

  const closeGroupDeleteAlert = useCallback(() => {
    setDeleteGroupAlert(false);
  }, [setDeleteGroupAlert]);

  const getGroupById = useCallback(
    (groupId: string | null) => {
      if (!groupId) return null;
      return personaGroups.find((g) => g.id === groupId) || null;
    },
    [personaGroups],
  );

  const getPersonasInGroup = useCallback(
    (groupId: string) => personas.filter((p) => p.groupId === groupId),
    [personas],
  );

  const mainAvatar = profile?.avatar ? avatarUrl(profile.avatar) : undefined;
  const mainName =
    profile?.name || user?.user_metadata?.email || user?.email || "User";

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader goBack={goBack} />
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader goBack={goBack} />
      <TabBar
        tab={tab}
        tabIndicator={tabIndicator}
        onSelectTab={snapToTab}
        onLayout={handleTabRowLayout}
      />
      <GestureDetector gesture={panGesture}>
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.contentSliding,
              { width: screenWidth * 2 },
              contentTranslateStyle,
            ]}
          >
            <PersonasPanel
              screenWidth={screenWidth}
              scrollEnabled={!drag}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              mainAvatar={mainAvatar}
              mainName={mainName}
              profile={profile}
              personas={personas}
              drag={drag}
              getGroupById={getGroupById}
              onEditMain={openEditMain}
              onEditPersona={openEditPersona}
              onCreatePersona={openCreatePersona}
              onDragStartPersona={handleDragStartPersona}
              onDragEndPersona={handleDragEndPersona}
              personaCardRefs={personaCardRefs}
              dragDy={dragDy}
              dragTargetIdx={dragTargetIdx}
            />
            <GroupsPanel
              screenWidth={screenWidth}
              scrollEnabled={!drag}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              personaGroups={personaGroups}
              drag={drag}
              getMembers={getPersonasInGroup}
              onEditGroup={openEditGroup}
              onCreateGroup={openCreateGroup}
              onDragStartGroup={handleDragStartGroup}
              onDragEndGroup={handleDragEndGroup}
              groupCardRefs={groupCardRefs}
              dragDy={dragDy}
              dragTargetIdx={dragTargetIdx}
            />
          </Animated.View>
        </View>
      </GestureDetector>
      {drag && (
        <DragOverlay drag={drag} dragStartY={dragStartY} dragDy={dragDy} />
      )}
      <SheetsAndAlerts
        editModalVisible={editModalVisible}
        sheetMode={sheetMode}
        editingPersona={editingPersona}
        sheetSession={sheetSession}
        profile={profile}
        personaGroups={personaGroups}
        deleteAlertVisible={deleteAlertVisible}
        onPersonaSheetClose={handlePersonaSheetClose}
        onPersonaSaved={handlePersonaSaved}
        onPersonaDeleteRequested={handlePersonaDeleteRequested}
        onDeletePersona={handleDelete}
        onCancelDeletePersona={closePersonaDeleteAlert}
        groupModalVisible={groupModalVisible}
        editingGroup={editingGroup}
        groupSheetSession={groupSheetSession}
        deleteGroupAlert={deleteGroupAlert}
        onGroupSheetClose={handleGroupSheetClose}
        onGroupSaved={handleGroupSaved}
        onGroupDeleteRequested={handleGroupDeleteRequested}
        onDeleteGroup={handleDeleteGroup}
        onCancelDeleteGroup={closeGroupDeleteAlert}
      />
    </View>
  );
}

function useTabSwipe(screenWidth: number) {
  const [tab, setTab] = useState<"personas" | "groups">("personas");
  const tabIndicator = useSharedValue(0);
  const tabRowWidth = useSharedValue(1);
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const snapToTab = useCallback(
    (t: "personas" | "groups") => {
      setTab(t);
      const target = t === "personas" ? 0 : -tabRowWidth.value;
      translateX.value = withTiming(target, { duration: 250 });
      tabIndicator.value = withTiming(
        t === "personas" ? 0 : tabRowWidth.value / 2,
        { duration: 250 },
      );
    },
    [translateX, tabIndicator, tabRowWidth],
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
          const raw = startX.value + event.translationX;
          const clamped = Math.max(-tabRowWidth.value, Math.min(0, raw));
          translateX.value = clamped;
          const ratio = -clamped / tabRowWidth.value;
          tabIndicator.value = ratio * (tabRowWidth.value / 2);
        })
        .onEnd((event) => {
          const threshold = tabRowWidth.value * 0.3;
          const velocity = event.velocityX ?? 0;
          if (velocity > 300) {
            scheduleOnRN(snapToTab, "personas");
          } else if (velocity < -300) {
            scheduleOnRN(snapToTab, "groups");
          } else {
            const dist = Math.abs(translateX.value);
            if (dist > threshold) {
              scheduleOnRN(snapToTab, "groups");
            } else {
              scheduleOnRN(snapToTab, "personas");
            }
          }
        }),
    [translateX, startX, tabIndicator, tabRowWidth, snapToTab],
  );

  const handleTabRowLayout = useCallback(
    (width: number) => {
      tabRowWidth.value = width;
      tabIndicator.value = tab === "personas" ? 0 : width / 2;
      translateX.value = tab === "personas" ? 0 : -width;
    },
    [tab, tabIndicator, translateX, tabRowWidth],
  );

  const contentTranslateStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          (translateX.value / Math.max(tabRowWidth.value, 1)) * screenWidth,
      },
    ],
  }));

  return {
    tab,
    tabIndicator,
    snapToTab,
    panGesture,
    handleTabRowLayout,
    contentTranslateStyle,
  };
}

function usePersonaSheet(
  profile: UserProfile | null,
  setProfile: Dispatch<SetStateAction<UserProfile | null>>,
  setPersonas: Dispatch<SetStateAction<Persona[]>>,
) {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit" | "editMain">(
    "create",
  );
  const [editingPersona, setEditingPersona] = useState<Persona | undefined>();
  const [sheetSession, setSheetSession] = useState(0);
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const deletingIdRef = useRef<string | null>(null);

  const openEditMain = useCallback(() => {
    if (!profile) return;
    setSheetMode("editMain");
    setEditingPersona(undefined);
    setSheetSession((s) => s + 1);
    setEditModalVisible(true);
  }, [profile]);

  const openEditPersona = useCallback((p: Persona) => {
    setSheetMode("edit");
    setEditingPersona(p);
    setSheetSession((s) => s + 1);
    setEditModalVisible(true);
  }, []);

  const openCreatePersona = useCallback(() => {
    setSheetMode("create");
    setEditingPersona(undefined);
    setSheetSession((s) => s + 1);
    setEditModalVisible(true);
  }, []);

  const handlePersonaSheetClose = useCallback(() => {
    setEditModalVisible(false);
  }, []);

  const handlePersonaSaved = useCallback(async () => {
    setEditModalVisible(false);
    try {
      const [p, ps] = await Promise.all([getMyProfile(), getMyPersonas()]);
      setProfile(p);
      setPersonas(ps);
    } catch {}
  }, [setProfile, setPersonas]);

  const handlePersonaDeleteRequested = useCallback((personaId: string) => {
    deletingIdRef.current = personaId;
    setDeleteAlertVisible(true);
  }, []);

  const handleDelete = useCallback(async () => {
    const deletingId = deletingIdRef.current;
    if (!deletingId) return;
    try {
      await deletePersona(deletingId);
      setPersonas((prev) => prev.filter((p) => p.id !== deletingId));
      setEditModalVisible(false);
    } catch {
      Alert.alert("Error", "Failed to delete persona");
    } finally {
      setDeleteAlertVisible(false);
      deletingIdRef.current = null;
    }
  }, [setPersonas]);

  return {
    editModalVisible,
    setEditModalVisible,
    sheetMode,
    editingPersona,
    sheetSession,
    deleteAlertVisible,
    setDeleteAlertVisible,
    openEditMain,
    openEditPersona,
    openCreatePersona,
    handlePersonaSheetClose,
    handlePersonaSaved,
    handlePersonaDeleteRequested,
    handleDelete,
  };
}

function useGroupSheet(
  setPersonaGroups: Dispatch<SetStateAction<PersonaGroup[]>>,
) {
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PersonaGroup | undefined>();
  const [groupSheetSession, setGroupSheetSession] = useState(0);
  const [deleteGroupAlert, setDeleteGroupAlert] = useState(false);
  const deletingGroupIdRef = useRef<string | null>(null);

  const openCreateGroup = useCallback(() => {
    setEditingGroup(undefined);
    setGroupSheetSession((s) => s + 1);
    setGroupModalVisible(true);
  }, []);

  const openEditGroup = useCallback((g: PersonaGroup) => {
    setEditingGroup(g);
    setGroupSheetSession((s) => s + 1);
    setGroupModalVisible(true);
  }, []);

  const handleGroupSheetClose = useCallback(() => {
    setGroupModalVisible(false);
  }, []);

  const handleGroupSaved = useCallback(async () => {
    setGroupModalVisible(false);
    try {
      const gs = await getPersonaGroups();
      setPersonaGroups(gs);
    } catch {}
  }, [setPersonaGroups]);

  const handleGroupDeleteRequested = useCallback((groupId: string) => {
    deletingGroupIdRef.current = groupId;
    setDeleteGroupAlert(true);
  }, []);

  const handleDeleteGroup = useCallback(async () => {
    const deletingGroupId = deletingGroupIdRef.current;
    if (!deletingGroupId) return;
    try {
      await deletePersonaGroup(deletingGroupId);
      setPersonaGroups((prev) => prev.filter((g) => g.id !== deletingGroupId));
      setGroupModalVisible(false);
    } catch {
      Alert.alert("Error", "Failed to delete group");
    } finally {
      setDeleteGroupAlert(false);
      deletingGroupIdRef.current = null;
    }
  }, [setPersonaGroups]);

  return {
    groupModalVisible,
    setGroupModalVisible,
    editingGroup,
    groupSheetSession,
    deleteGroupAlert,
    setDeleteGroupAlert,
    openCreateGroup,
    openEditGroup,
    handleGroupSheetClose,
    handleGroupSaved,
    handleGroupDeleteRequested,
    handleDeleteGroup,
  };
}

function useDragReorder(
  personas: Persona[],
  personaGroups: PersonaGroup[],
  setPersonas: Dispatch<SetStateAction<Persona[]>>,
  setPersonaGroups: Dispatch<SetStateAction<PersonaGroup[]>>,
) {
  const [drag, setDrag] = useState<DragState>(null);
  const dragDy = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const dragTargetIdx = useSharedValue(-1);
  const personaCardRefs = useRef<Array<View | null>>([]);
  const groupCardRefs = useRef<Array<View | null>>([]);

  const handleDragStartPersona = useCallback(
    (index: number, p: Persona) => {
      const ref = personaCardRefs.current[index];
      if (ref) {
        ref.measureInWindow((_x, y) => {
          dragStartY.value = y;
          dragDy.value = 0;
          dragTargetIdx.value = index;
          setDrag({ type: "persona", index, item: p, startY: y });
        });
      }
    },
    [dragDy, dragStartY, dragTargetIdx],
  );

  const handleDragEndPersona = useCallback(
    async (fromIdx: number) => {
      const toIdx = dragTargetIdx.value;
      setDrag(null);
      dragDy.value = 0;
      dragStartY.value = 0;
      dragTargetIdx.value = -1;
      if (toIdx < 0 || toIdx >= personas.length || toIdx === fromIdx) return;
      const updated = [...personas];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      setPersonas(updated);
      try {
        await reorderPersonas(
          updated.map((p, i) => ({ id: p.id, order: i + 1 })),
        );
      } catch {
        const ps = await getMyPersonas();
        setPersonas(ps);
      }
    },
    [personas, dragTargetIdx, dragDy, dragStartY, setPersonas],
  );

  const handleDragStartGroup = useCallback(
    (index: number, g: PersonaGroup) => {
      const ref = groupCardRefs.current[index];
      if (ref) {
        ref.measureInWindow((_x, y) => {
          dragStartY.value = y;
          dragDy.value = 0;
          dragTargetIdx.value = index;
          setDrag({ type: "group", index, item: g, startY: y });
        });
      }
    },
    [dragDy, dragStartY, dragTargetIdx],
  );

  const handleDragEndGroup = useCallback(
    async (fromIdx: number) => {
      const toIdx = dragTargetIdx.value;
      setDrag(null);
      dragDy.value = 0;
      dragStartY.value = 0;
      dragTargetIdx.value = -1;
      if (toIdx < 0 || toIdx >= personaGroups.length || toIdx === fromIdx)
        return;
      const updated = [...personaGroups];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      setPersonaGroups(updated);
      try {
        await reorderPersonaGroups(
          updated.map((g, i) => ({ id: g.id, order: i + 1 })),
        );
      } catch {
        const gs = await getPersonaGroups();
        setPersonaGroups(gs);
      }
    },
    [personaGroups, dragTargetIdx, dragDy, dragStartY, setPersonaGroups],
  );

  return {
    drag,
    dragDy,
    dragStartY,
    dragTargetIdx,
    personaCardRefs,
    groupCardRefs,
    handleDragStartPersona,
    handleDragEndPersona,
    handleDragStartGroup,
    handleDragEndGroup,
  };
}

const ScreenHeader = memo(function ScreenHeader({
  goBack,
}: {
  goBack: () => void;
}) {
  return (
    <View style={styles.header}>
      <Pressable onPress={() => goBack()} style={styles.backBtn}>
        <Text style={styles.backText}>{"←"}</Text>
      </Pressable>
      <Text style={styles.headerTitle}>My Personas</Text>
      <View style={styles.backBtn} />
    </View>
  );
});

const TabBar = memo(function TabBar({
  tab,
  tabIndicator,
  onSelectTab,
  onLayout,
}: {
  tab: "personas" | "groups";
  tabIndicator: SharedValue<number>;
  onSelectTab: (t: "personas" | "groups") => void;
  onLayout: (width: number) => void;
}) {
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabIndicator.value }],
  }));

  return (
    <View
      style={styles.tabRow}
      onLayout={(e) => onLayout(e.nativeEvent.layout.width)}
    >
      <Pressable onPress={() => onSelectTab("personas")} style={styles.tab}>
        <Text
          style={[styles.tabText, tab === "personas" && styles.tabTextActive]}
        >
          Personas
        </Text>
      </Pressable>
      <Pressable onPress={() => onSelectTab("groups")} style={styles.tab}>
        <Text style={[styles.tabText, tab === "groups" && styles.tabTextActive]}>
          Persona Groups
        </Text>
      </Pressable>
      <Animated.View style={[styles.tabIndicator, indicatorStyle]} />
    </View>
  );
});

const MainPersonaCard = memo(function MainPersonaCard({
  mainAvatar,
  mainName,
  appearance,
  onEdit,
}: {
  mainAvatar?: string;
  mainName: string;
  appearance: string | undefined;
  onEdit: () => void;
}) {
  return (
    <View style={styles.mainPersonaCard}>
      <Avatar uri={mainAvatar} name={mainName} size={56} />
      <View style={styles.mainPersonaInfo}>
        <Text style={styles.mainPersonaName}>{mainName}</Text>
        <Text style={styles.mainPersonaAppearance} numberOfLines={2}>
          {appearance || "No appearance set"}
        </Text>
      </View>
      <Pressable
        onPress={onEdit}
        style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.editBtnText}>Edit</Text>
      </Pressable>
    </View>
  );
});

const PersonasPanel = memo(function PersonasPanel({
  screenWidth,
  scrollEnabled,
  refreshing,
  onRefresh,
  mainAvatar,
  mainName,
  profile,
  personas,
  drag,
  getGroupById,
  onEditMain,
  onEditPersona,
  onCreatePersona,
  onDragStartPersona,
  onDragEndPersona,
  personaCardRefs,
  dragDy,
  dragTargetIdx,
}: {
  screenWidth: number;
  scrollEnabled: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  mainAvatar?: string;
  mainName: string;
  profile: UserProfile | null;
  personas: Persona[];
  drag: DragState;
  getGroupById: (groupId: string | null) => PersonaGroup | null;
  onEditMain: () => void;
  onEditPersona: (p: Persona) => void;
  onCreatePersona: () => void;
  onDragStartPersona: (index: number, p: Persona) => void;
  onDragEndPersona: (index: number) => void;
  personaCardRefs: { current: Array<View | null> };
  dragDy: SharedValue<number>;
  dragTargetIdx: SharedValue<number>;
}) {
  return (
    <ScrollView
      style={{ width: screenWidth }}
      contentContainerStyle={styles.contentInner}
      scrollEnabled={scrollEnabled}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
        />
      }
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Main Persona</Text>
        <MainPersonaCard
          mainAvatar={mainAvatar}
          mainName={mainName}
          appearance={profile?.profile}
          onEdit={onEditMain}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personas</Text>
        {personas.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No personas yet</Text>
            <Text style={styles.emptySubtext}>
              Create additional personas to use in chats
            </Text>
          </View>
        ) : (
          personas.map((p, i) => {
            const group = getGroupById(p.groupId);
            return (
              <GestureDetector
                key={p.id}
                gesture={Gesture.Exclusive(
                  Gesture.Pan()
                    .activateAfterLongPress(400)
                    .onStart(() => {
                      scheduleOnRN(onDragStartPersona, i, p);
                    })
                    .onUpdate((e) => {
                      dragDy.value = e.translationY;
                      const cardH = 88;
                      dragTargetIdx.value = Math.max(
                        0,
                        Math.min(
                          personas.length - 1,
                          Math.round(i + e.translationY / cardH),
                        ),
                      );
                    })
                    .onEnd(() => {
                      scheduleOnRN(onDragEndPersona, i);
                    }),
                  Gesture.Tap().onEnd(() => {
                    scheduleOnRN(onEditPersona, p);
                  }),
                )}
              >
                <Animated.View
                  ref={(ref: View | null) => {
                    personaCardRefs.current[i] = ref;
                  }}
                  style={[
                    styles.personaCard,
                    drag?.index === i && { opacity: 0.3 },
                  ]}
                >
                  <Avatar
                    uri={p.avatar ? avatarUrl(p.avatar) : undefined}
                    name={p.name}
                    size={48}
                  />
                  <View style={styles.personaCardInfo}>
                    <View style={styles.personaCardNameRow}>
                      <Text style={styles.personaCardName}>{p.name}</Text>
                      {p.pronouns && (
                        <View style={styles.pronounTag}>
                          <Text style={styles.pronounTagText}>
                            {pronounLabel(p.pronouns)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.personaCardAppearance} numberOfLines={1}>
                      {p.appearance || "No appearance"}
                    </Text>
                    {group && (
                      <View
                        style={[
                          styles.groupChip,
                          { backgroundColor: `${group.color}33` },
                        ]}
                      >
                        <Text
                          style={[styles.groupChipText, { color: group.color }]}
                        >
                          {group.name}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.dragHandle}>
                    <Text style={styles.dragHandleText}>{"☰"}</Text>
                  </View>
                </Animated.View>
              </GestureDetector>
            );
          })
        )}
        <Button
          title="Add Persona"
          onPress={onCreatePersona}
          style={styles.addBtn}
        />
      </View>
    </ScrollView>
  );
});

const GroupsPanel = memo(function GroupsPanel({
  screenWidth,
  scrollEnabled,
  refreshing,
  onRefresh,
  personaGroups,
  drag,
  getMembers,
  onEditGroup,
  onCreateGroup,
  onDragStartGroup,
  onDragEndGroup,
  groupCardRefs,
  dragDy,
  dragTargetIdx,
}: {
  screenWidth: number;
  scrollEnabled: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  personaGroups: PersonaGroup[];
  drag: DragState;
  getMembers: (groupId: string) => Persona[];
  onEditGroup: (g: PersonaGroup) => void;
  onCreateGroup: () => void;
  onDragStartGroup: (index: number, g: PersonaGroup) => void;
  onDragEndGroup: (index: number) => void;
  groupCardRefs: { current: Array<View | null> };
  dragDy: SharedValue<number>;
  dragTargetIdx: SharedValue<number>;
}) {
  return (
    <ScrollView
      style={{ width: screenWidth }}
      contentContainerStyle={styles.contentInner}
      scrollEnabled={scrollEnabled}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
        />
      }
    >
      <View style={styles.section}>
        {personaGroups.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No groups</Text>
            <Text style={styles.emptySubtext}>
              Create groups to organize your personas
            </Text>
          </View>
        ) : (
          personaGroups.map((g, i) => {
            const members = getMembers(g.id);
            return (
              <GestureDetector
                key={g.id}
                gesture={Gesture.Exclusive(
                  Gesture.Pan()
                    .activateAfterLongPress(400)
                    .onStart(() => {
                      scheduleOnRN(onDragStartGroup, i, g);
                    })
                    .onUpdate((e) => {
                      dragDy.value = e.translationY;
                      const rowH = 100;
                      dragTargetIdx.value = Math.max(
                        0,
                        Math.min(
                          personaGroups.length - 1,
                          Math.round(i + e.translationY / rowH),
                        ),
                      );
                    })
                    .onEnd(() => {
                      scheduleOnRN(onDragEndGroup, i);
                    }),
                  Gesture.Tap().onEnd(() => {
                    scheduleOnRN(onEditGroup, g);
                  }),
                )}
              >
                <Animated.View
                  ref={(ref: View | null) => {
                    groupCardRefs.current[i] = ref;
                  }}
                  style={[
                    styles.groupCard,
                    drag?.index === i &&
                      drag?.type === "group" && { opacity: 0.3 },
                  ]}
                >
                  <View style={styles.groupCardHeader}>
                    <View
                      style={[styles.groupDot, { backgroundColor: g.color }]}
                    />
                    <Text style={styles.groupCardName}>{g.name}</Text>
                    <Text style={styles.groupCardCount}>
                      {members.length} persona
                      {members.length !== 1 ? "s" : ""}
                    </Text>
                    <View style={styles.dragHandle}>
                      <Text style={styles.dragHandleText}>{"☰"}</Text>
                    </View>
                  </View>
                  {g.description ? (
                    <Text style={styles.groupDesc}>{g.description}</Text>
                  ) : null}
                  {members.length > 0 && (
                    <View style={styles.groupMembers}>
                      {members.map((p) => (
                        <View key={p.id} style={styles.groupMemberRow}>
                          <Avatar
                            uri={
                              p.avatar ? avatarUrl(p.avatar) : undefined
                            }
                            name={p.name}
                            size={28}
                          />
                          <Text style={styles.groupMemberName}>{p.name}</Text>
                          {p.pronouns && (
                            <View style={styles.pronounTagSmall}>
                              <Text style={styles.pronounTagTextSmall}>
                                {pronounLabel(p.pronouns)}
                              </Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                  {members.length === 0 && (
                    <Text style={styles.groupEmptyMembers}>
                      No personas in this group
                    </Text>
                  )}
                </Animated.View>
              </GestureDetector>
            );
          })
        )}
        <Button
          title="Create Group"
          onPress={onCreateGroup}
          style={styles.createGroupBtn}
        />
      </View>
    </ScrollView>
  );
});

const DragOverlay = memo(function DragOverlay({
  drag,
  dragStartY,
  dragDy,
}: {
  drag: Exclude<DragState, null>;
  dragStartY: SharedValue<number>;
  dragDy: SharedValue<number>;
}) {
  const dragOverlayStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    transform: [{ translateY: dragStartY.value + dragDy.value }],
    zIndex: 9999,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  }));

  return (
    <Animated.View style={dragOverlayStyle}>
      {drag.type === "persona" ? (
        <View style={[styles.personaCard, styles.dragCard]}>
          <Avatar
            uri={
              (drag.item as Persona).avatar
                ? avatarUrl((drag.item as Persona).avatar)
                : undefined
            }
            name={(drag.item as Persona).name}
            size={48}
          />
          <View style={styles.personaCardInfo}>
            <View style={styles.personaCardNameRow}>
              <Text style={styles.personaCardName}>
                {(drag.item as Persona).name}
              </Text>
              {(drag.item as Persona).pronouns && (
                <View style={styles.pronounTag}>
                  <Text style={styles.pronounTagText}>
                    {pronounLabel((drag.item as Persona).pronouns!)}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.personaCardAppearance} numberOfLines={1}>
              {(drag.item as Persona).appearance || "No appearance"}
            </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.groupCard, styles.dragCard]}>
          <View
            style={[
              styles.groupDot,
              { backgroundColor: (drag.item as PersonaGroup).color },
            ]}
          />
          <Text style={styles.groupCardName}>
            {(drag.item as PersonaGroup).name}
          </Text>
        </View>
      )}
    </Animated.View>
  );
});

const SheetsAndAlerts = memo(function SheetsAndAlerts({
  editModalVisible,
  sheetMode,
  editingPersona,
  sheetSession,
  profile,
  personaGroups,
  deleteAlertVisible,
  onPersonaSheetClose,
  onPersonaSaved,
  onPersonaDeleteRequested,
  onDeletePersona,
  onCancelDeletePersona,
  groupModalVisible,
  editingGroup,
  groupSheetSession,
  deleteGroupAlert,
  onGroupSheetClose,
  onGroupSaved,
  onGroupDeleteRequested,
  onDeleteGroup,
  onCancelDeleteGroup,
}: {
  editModalVisible: boolean;
  sheetMode: "create" | "edit" | "editMain";
  editingPersona: Persona | undefined;
  sheetSession: number;
  profile: UserProfile | null;
  personaGroups: PersonaGroup[];
  deleteAlertVisible: boolean;
  onPersonaSheetClose: () => void;
  onPersonaSaved: () => void;
  onPersonaDeleteRequested: (personaId: string) => void;
  onDeletePersona: () => void;
  onCancelDeletePersona: () => void;
  groupModalVisible: boolean;
  editingGroup: PersonaGroup | undefined;
  groupSheetSession: number;
  deleteGroupAlert: boolean;
  onGroupSheetClose: () => void;
  onGroupSaved: () => void;
  onGroupDeleteRequested: (groupId: string) => void;
  onDeleteGroup: () => void;
  onCancelDeleteGroup: () => void;
}) {
  return (
    <>
      <PersonaSheet
        key={`${sheetSession}-${sheetMode}-${editingPersona?.id ?? ""}`}
        visible={editModalVisible}
        mode={sheetMode}
        persona={editingPersona}
        profile={profile}
        personaGroups={personaGroups}
        onClose={onPersonaSheetClose}
        onSaved={onPersonaSaved}
        onDeleteRequested={onPersonaDeleteRequested}
      />

      <CustomAlert
        visible={deleteAlertVisible}
        title="Delete Persona"
        message="Are you sure you want to delete this persona? This action cannot be undone."
        buttons={[
          {
            text: "Delete",
            style: "destructive",
            onPress: onDeletePersona,
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: onCancelDeletePersona,
          },
        ]}
        onDismiss={onCancelDeletePersona}
      />

      <PersonaGroupSheet
        key={`${groupSheetSession}-${editingGroup?.id ?? ""}`}
        visible={groupModalVisible}
        group={editingGroup}
        onClose={onGroupSheetClose}
        onSaved={onGroupSaved}
        onDeleteRequested={onGroupDeleteRequested}
      />

      <CustomAlert
        visible={deleteGroupAlert}
        title="Delete Group"
        message="Are you sure you want to delete this group? Personas in this group will not be deleted."
        buttons={[
          {
            text: "Delete",
            style: "destructive",
            onPress: onDeleteGroup,
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: onCancelDeleteGroup,
          },
        ]}
        onDismiss={onCancelDeleteGroup}
      />
    </>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.card,
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backText: { color: colors.accent, fontSize: 24, fontWeight: "600" },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    position: "relative",
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
    width: "50%",
    height: 2,
    backgroundColor: colors.accent,
  },
  tabText: { color: colors.textFaint, fontSize: 14, fontWeight: "600" },
  tabTextActive: { color: colors.accent },
  content: { flex: 1 },
  contentSliding: { flex: 1, flexDirection: "row" },
  contentInner: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 28 },
  sectionTitle: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  mainPersonaCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  mainPersonaInfo: { flex: 1 },
  mainPersonaName: { color: colors.text, fontSize: 16, fontWeight: "700" },
  mainPersonaAppearance: {
    color: colors.textFaint,
    fontSize: 13,
    marginTop: 4,
  },
  editBtn: {
    backgroundColor: colors.accentFaded,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  editBtnText: { color: colors.accent, fontSize: 13, fontWeight: "600" },

  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: { color: colors.textFaint, fontSize: 14 },
  emptySubtext: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },

  personaCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    gap: 10,
  },
  personaCardInfo: { flex: 1 },
  personaCardNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  personaCardName: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
  },
  pronounTag: {
    backgroundColor: colors.accentFaded,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  pronounTagText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "600",
  },
  pronounTagSmall: {
    backgroundColor: colors.accentFaded,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  pronounTagTextSmall: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: "600",
  },
  personaCardAppearance: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: 2,
  },
  groupChip: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 6,
  },
  groupChipText: { fontSize: 11, fontWeight: "600" },
  addBtn: { marginTop: 8 },

  groupCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  groupCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  groupDot: { width: 10, height: 10, borderRadius: 5 },
  groupCardName: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  groupCardCount: { color: colors.textDim, fontSize: 12 },
  groupDesc: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: 6,
    marginBottom: 8,
  },
  groupMembers: { marginTop: 8, gap: 6 },
  groupMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  groupMemberName: { color: colors.textDim, fontSize: 13 },
  groupEmptyMembers: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 8,
    fontStyle: "italic",
  },
  createGroupBtn: { marginTop: 8 },

  dragHandle: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  dragHandleText: {
    color: colors.textDim,
    fontSize: 14,
  },

  dragCard: {
    transform: [{ scale: 1.03 }],
  },
});
