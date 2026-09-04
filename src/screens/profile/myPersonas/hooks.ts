import {
    useState,
    useCallback,
    useRef,
    useMemo,
    type Dispatch,
    type SetStateAction,
} from "react";
import { View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSharedValue } from "react-native-reanimated";
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
import type { UserProfile, Persona, PersonaGroup } from "../../../types/api";
import { type ShowAlert, type DragState } from "./personaUtils";
import { useTabSwipe as useSharedTabSwipe } from "../../../hooks/useTabSwipe";

export function useTabSwipe(screenWidth: number) {
    const [tab, setTab] = useState<"personas" | "groups">("personas");
    const handleChangeTab = useCallback(
        (index: number) => setTab(index === 0 ? "personas" : "groups"),
        [],
    );
    const {
        tabIndicator,
        translateX,
        tabRowWidth,
        snapToTab: snapToTabIndex,
        panGesture: basePanGesture,
        contentTranslateStyle,
        handleTabRowLayout,
    } = useSharedTabSwipe({
        tabCount: 2,
        screenWidth,
        pageWidthMode: "row",
        activeIndex: tab === "personas" ? 0 : 1,
        onChangeIndex: handleChangeTab,
    });

    const snapToTab = useCallback(
        (t: "personas" | "groups") => snapToTabIndex(t === "personas" ? 0 : 1),
        [snapToTabIndex],
    );

    const panGesture = useMemo(
        () =>
            basePanGesture.onEnd((event) => {
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
        [basePanGesture, translateX, tabRowWidth, snapToTab],
    );

    return {
        tab,
        tabIndicator,
        snapToTab,
        panGesture,
        handleTabRowLayout,
        contentTranslateStyle,
    };
}

function useSheetModal<T>() {
    const [visible, setVisible] = useState(false);
    const [editing, setEditing] = useState<T | undefined>();
    const [session, setSession] = useState(0);

    const openCreate = useCallback(() => {
        setEditing(undefined);
        setSession((s) => s + 1);
        setVisible(true);
    }, []);

    const openEdit = useCallback((item: T) => {
        setEditing(item);
        setSession((s) => s + 1);
        setVisible(true);
    }, []);

    const close = useCallback(() => {
        setVisible(false);
    }, []);

    return {
        visible,
        setVisible,
        editing,
        session,
        openCreate,
        openEdit,
        close,
    };
}

function useDeleteConfirmAlert({
    onDelete,
    onDeleted,
    errorMessage,
    showAlert,
    dismissAlert,
}: {
    onDelete: (id: string) => Promise<boolean>;
    onDeleted: (id: string) => void;
    errorMessage: string;
    showAlert: ShowAlert;
    dismissAlert: () => void;
}) {
    const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
    const deletingIdRef = useRef<string | null>(null);

    const handleDeleteRequested = useCallback((id: string) => {
        deletingIdRef.current = id;
        setDeleteAlertVisible(true);
    }, []);

    const handleDelete = useCallback(async () => {
        const deletingId = deletingIdRef.current;
        if (!deletingId) return;
        try {
            await onDelete(deletingId);
            onDeleted(deletingId);
        } catch {
            showAlert("Error", errorMessage, [
                { text: "OK", onPress: dismissAlert },
            ]);
        } finally {
            setDeleteAlertVisible(false);
            deletingIdRef.current = null;
        }
    }, [onDelete, onDeleted, showAlert, dismissAlert, errorMessage]);

    return {
        deleteAlertVisible,
        setDeleteAlertVisible,
        handleDeleteRequested,
        handleDelete,
    };
}

export function usePersonaSheet(
    profile: UserProfile | null,
    setProfile: Dispatch<SetStateAction<UserProfile | null>>,
    setPersonas: Dispatch<SetStateAction<Persona[]>>,
    showAlert: ShowAlert,
    dismissAlert: () => void,
) {
    const [sheetMode, setSheetMode] = useState<"create" | "edit" | "editMain">(
        "create",
    );
    const {
        visible: editModalVisible,
        setVisible: setEditModalVisible,
        editing: editingPersona,
        session: sheetSession,
        openCreate,
        openEdit,
        close: handlePersonaSheetClose,
    } = useSheetModal<Persona>();

    const openEditMain = useCallback(() => {
        if (!profile) return;
        setSheetMode("editMain");
        openCreate();
    }, [profile, openCreate]);

    const openEditPersona = useCallback(
        (p: Persona) => {
            setSheetMode("edit");
            openEdit(p);
        },
        [openEdit],
    );

    const openCreatePersona = useCallback(() => {
        setSheetMode("create");
        openCreate();
    }, [openCreate]);

    const handlePersonaSaved = useCallback(async () => {
        setEditModalVisible(false);
        try {
            const [p, ps] = await Promise.all([
                getMyProfile(),
                getMyPersonas(),
            ]);
            setProfile(p);
            setPersonas(ps);
        } catch {}
    }, [setProfile, setPersonas, setEditModalVisible]);

    const handlePersonaDeleted = useCallback(
        (id: string) => {
            setPersonas((prev) => prev.filter((p) => p.id !== id));
            setEditModalVisible(false);
        },
        [setPersonas, setEditModalVisible],
    );

    const {
        deleteAlertVisible,
        setDeleteAlertVisible,
        handleDeleteRequested: handlePersonaDeleteRequested,
        handleDelete,
    } = useDeleteConfirmAlert({
        onDelete: deletePersona,
        onDeleted: handlePersonaDeleted,
        errorMessage: "Failed to delete persona",
        showAlert,
        dismissAlert,
    });

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
    const {
        visible: groupModalVisible,
        setVisible: setGroupModalVisible,
        editing: editingGroup,
        session: groupSheetSession,
        openCreate: openCreateGroup,
        openEdit: openEditGroup,
        close: handleGroupSheetClose,
    } = useSheetModal<PersonaGroup>();

    const handleGroupSaved = useCallback(async () => {
        setGroupModalVisible(false);
        try {
            const gs = await getPersonaGroups();
            setPersonaGroups(gs);
        } catch {}
    }, [setPersonaGroups, setGroupModalVisible]);

    const handleGroupDeleted = useCallback(
        (id: string) => {
            setPersonaGroups((prev) => prev.filter((g) => g.id !== id));
            setGroupModalVisible(false);
        },
        [setPersonaGroups, setGroupModalVisible],
    );

    const {
        deleteAlertVisible: deleteGroupAlert,
        setDeleteAlertVisible: setDeleteGroupAlert,
        handleDeleteRequested: handleGroupDeleteRequested,
        handleDelete: handleDeleteGroup,
    } = useDeleteConfirmAlert({
        onDelete: deletePersonaGroup,
        onDeleted: handleGroupDeleted,
        errorMessage: "Failed to delete group",
        showAlert,
        dismissAlert,
    });

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
            if (toIdx < 0 || toIdx >= personas.length || toIdx === fromIdx)
                return;
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

export function useMyPersonasData() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [personaGroups, setPersonaGroups] = useState<PersonaGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            const [p, ps, gs] = await Promise.all([
                getMyProfile(),
                getMyPersonas(),
                getPersonaGroups().catch(() => []),
            ]);
            setProfile(p);
            setPersonas(ps);
            setPersonaGroups(gs);
            setError(null);
        } catch (err: any) {
            setError(err?.message || "Failed to load personas");
        }
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

    const handleRetry = useCallback(async () => {
        setError(null);
        setLoading(true);
        await loadData();
        setLoading(false);
    }, [loadData]);

    return {
        profile,
        setProfile,
        personas,
        setPersonas,
        personaGroups,
        setPersonaGroups,
        loading,
        refreshing,
        error,
        handleRefresh,
        handleRetry,
    };
}
