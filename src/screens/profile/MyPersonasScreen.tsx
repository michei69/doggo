import {
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  BackHandler,
} from "react-native";
import Animated from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import CustomAlert, {
  type AlertButton,
} from "../../components/common/CustomAlert";
import { useAuthStore } from "../../stores/authStore";
import {
  getMyProfile,
  getMyPersonas,
  getPersonaGroups,
} from "../../api/profile";
import type {
  UserProfile,
  Persona,
  PersonaGroup,
} from "../../types/api";
import type { ProfileStackParamList } from "../../navigation/types";
import { colors } from "../../utils/colors";
import { avatarUrl } from "../../utils/assets";
import {
  useTabSwipe,
  usePersonaSheet,
  useGroupSheet,
  useDragReorder,
} from "./myPersonas/hooks";
import {
  ScreenHeader,
  TabBar,
  PersonasPanel,
  GroupsPanel,
  DragOverlay,
  SheetsAndAlerts,
} from "./myPersonas/components";

type Nav = NativeStackNavigationProp<ProfileStackParamList, "MyPersonas">;

export default function MyPersonasScreen() {
  const { goBack } = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [personaGroups, setPersonaGroups] = useState<PersonaGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertButtons, setAlertButtons] = useState<AlertButton[]>([]);

  const showAlert = useCallback(
    (title: string, message: string, buttons: AlertButton[]) => {
      setAlertTitle(title);
      setAlertMessage(message);
      setAlertButtons(buttons);
      setAlertVisible(true);
    },
    [setAlertTitle, setAlertMessage, setAlertButtons, setAlertVisible],
  );

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
  } = usePersonaSheet(profile, setProfile, setPersonas, showAlert, () => setAlertVisible(false));
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
  } = useGroupSheet(setPersonaGroups, showAlert, () => setAlertVisible(false));
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
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        buttons={alertButtons}
        onDismiss={() => setAlertVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { flex: 1 },
  contentSliding: { flex: 1, flexDirection: "row" },
});
