import { memo, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  StyleSheet,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import Avatar from "../../../components/common/Avatar";
import Button from "../../../components/common/Button";
import CustomAlert from "../../../components/common/CustomAlert";
import PersonaSheet from "../PersonaSheet";
import PersonaGroupSheet from "../PersonaGroupSheet";
import type {
  UserProfile,
  Persona,
  PersonaGroup,
} from "../../../types/api";
import { colors } from "../../../utils/colors";
import { avatarUrl } from "../../../utils/assets";
import { pronounLabel, type DragState } from "./personaUtils";

export const ScreenHeader = memo(function ScreenHeader({
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

export const TabBar = memo(function TabBar({
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

export const PersonasPanel = memo(function PersonasPanel({
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
  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={colors.accent}
      />
    ),
    [refreshing, onRefresh],
  );
  return (
    <ScrollView
      style={{ width: screenWidth }}
      contentContainerStyle={styles.contentInner}
      scrollEnabled={scrollEnabled}
      refreshControl={refreshControl}
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

export const GroupsPanel = memo(function GroupsPanel({
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
  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={colors.accent}
      />
    ),
    [refreshing, onRefresh],
  );
  return (
    <ScrollView
      style={{ width: screenWidth }}
      contentContainerStyle={styles.contentInner}
      scrollEnabled={scrollEnabled}
      refreshControl={refreshControl}
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
                            uri={p.avatar ? avatarUrl(p.avatar) : undefined}
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

export const DragOverlay = memo(function DragOverlay({
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

export const SheetsAndAlerts = memo(function SheetsAndAlerts({
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
