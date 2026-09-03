import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  BackHandler,
} from "react-native";
import Animated from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import CustomAlert, {
  type AlertButton,
} from "../../components/common/CustomAlert";
import { useAuthStore } from "../../stores/authStore";
import type { Persona, PersonaGroup } from "../../types/api";
import type { ProfileStackParamList } from "../../navigation/types";
import { colors } from "../../utils/colors";
import { avatarUrl } from "../../utils/assets";
import {
  useTabSwipe,
  usePersonaSheet,
  useGroupSheet,
  useDragReorder,
  useMyPersonasData,
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

  const {
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
  } = useMyPersonasData();
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
  } = usePersonaSheet(profile, setProfile, setPersonas, showAlert, () =>
    setAlertVisible(false),
  );
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

  if (error) {
    return (
      <View style={styles.container}>
        <ScreenHeader goBack={goBack} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={handleRetry}
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 20,
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  content: { flex: 1 },
  contentSliding: { flex: 1, flexDirection: "row" },
});
