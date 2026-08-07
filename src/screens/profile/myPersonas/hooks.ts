import {
  useState,
  useCallback,
  useRef,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react";
import { View } from "react-native";
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Gesture } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import {
  getMyProfile,
  getMyPersonas,
  deletePersona,
  reorderPersonas,
  getPersonaGroups,
  deletePersonaGroup,
  reorderPersonaGroups,
} from "../../../api/profile";
import type {
  UserProfile,
  Persona,
  PersonaGroup,
} from "../../../types/api";
import { type ShowAlert, type DragState } from "./personaUtils";

export function useTabSwipe(screenWidth: number) {
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

export function usePersonaSheet(
  profile: UserProfile | null,
  setProfile: Dispatch<SetStateAction<UserProfile | null>>,
  setPersonas: Dispatch<SetStateAction<Persona[]>>,
  showAlert: ShowAlert,
  dismissAlert: () => void,
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
      showAlert("Error", "Failed to delete persona", [{ text: "OK", onPress: dismissAlert }]);
    } finally {
      setDeleteAlertVisible(false);
      deletingIdRef.current = null;
    }
  }, [setPersonas, showAlert, dismissAlert]);

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

export function useGroupSheet(
  setPersonaGroups: Dispatch<SetStateAction<PersonaGroup[]>>,
  showAlert: ShowAlert,
  dismissAlert: () => void,
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
      showAlert("Error", "Failed to delete group", [{ text: "OK", onPress: dismissAlert }]);
    } finally {
      setDeleteGroupAlert(false);
      deletingGroupIdRef.current = null;
    }
  }, [setPersonaGroups, showAlert, dismissAlert]);

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

export function useDragReorder(
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
