import { Platform, StyleSheet, View } from "react-native";
import {
  getFocusedRouteNameFromRoute,
  type RouteProp,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SheetPortalHost from "../components/common/SheetPortalHost";
import { colors } from "../utils/colors";
import { MessageCircle, Compass, SquarePen, User } from "lucide-react-native";
import type {
  ChatsStackParamList,
  CharactersStackParamList,
  ProfileStackParamList,
  CreateStackParamList,
  MainTabParamList,
} from "./types";
import ChatListScreen from "../screens/chats/ChatListScreen";
import ChatScreen from "../screens/chats/ChatScreen";
import GenerationSettingsScreen from "../screens/chats/GenerationSettingsScreen";
import CharacterSearchScreen from "../screens/characters/CharacterSearchScreen";
import CharacterScreen from "../screens/characters/CharacterScreen";
import SwipeDiscoverScreen from "../screens/characters/SwipeDiscoverScreen";
import WebBrowserScreen from "../screens/characters/WebBrowserScreen";
import CreateBotScreen from "../screens/characters/CreateBotScreen";
import CreatorScreen from "../screens/profile/CreatorScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import MyPersonasScreen from "../screens/profile/MyPersonasScreen";
import SettingsScreen from "../screens/profile/SettingsScreen";
import BlockedContentScreen from "../screens/profile/BlockedContentScreen";
import HiddenCharactersScreen from "../screens/profile/HiddenCharactersScreen";
import MyCharactersScreen from "../screens/profile/MyCharactersScreen";

const ChatsStack = createNativeStackNavigator<ChatsStackParamList>();

function ChatsStackNavigator() {
  return (
    <ChatsStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <ChatsStack.Screen name="ChatList" component={ChatListScreen} />
      <ChatsStack.Screen name="ChatScreen" component={ChatScreen} />
      <ChatsStack.Screen name="ChatCharacter" component={CharacterScreen} />
      <ChatsStack.Screen
        name="GenerationSettings"
        component={GenerationSettingsScreen}
      />
      <ChatsStack.Screen name="CreatorScreen" component={CreatorScreen} />
    </ChatsStack.Navigator>
  );
}

const CharactersStack = createNativeStackNavigator<CharactersStackParamList>();

function CharactersStackNavigator() {
  return (
    <CharactersStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <CharactersStack.Screen
        name="CharacterSearch"
        component={CharacterSearchScreen}
      />
      <CharactersStack.Screen
        name="CharacterScreen"
        component={CharacterScreen}
      />
      <CharactersStack.Screen name="CreatorScreen" component={CreatorScreen} />
      <CharactersStack.Screen
        name="SwipeDiscover"
        component={SwipeDiscoverScreen}
      />
      <CharactersStack.Screen
        name="WebBrowser"
        component={WebBrowserScreen}
        options={{ presentation: "fullScreenModal" }}
      />
    </CharactersStack.Navigator>
  );
}

const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
      <ProfileStack.Screen name="BlockedContent" component={BlockedContentScreen} />
      <ProfileStack.Screen name="HiddenCharacters" component={HiddenCharactersScreen} />
      <ProfileStack.Screen name="MyPersonas" component={MyPersonasScreen} />
      <ProfileStack.Screen name="MyCharacters" component={MyCharactersScreen} />
      <ProfileStack.Screen
        name="ProfileCharacterScreen"
        component={CharacterScreen}
      />
      <ProfileStack.Screen
        name="ProfileCreatorScreen"
        component={CreatorScreen}
      />
    </ProfileStack.Navigator>
  );
}

const CreateStack = createNativeStackNavigator<CreateStackParamList>();

function CreateStackNavigator() {
  return (
    <CreateStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <CreateStack.Screen name="CreateBot" component={CreateBotScreen} />
      <CreateStack.Screen
        name="CreateCharacterScreen"
        component={CharacterScreen}
      />
    </CreateStack.Navigator>
  );
}

function getTabBarVisibility(
  route: Partial<RouteProp<MainTabParamList, "ChatsTab">> | Partial<RouteProp<MainTabParamList, "DiscoverTab">>,
): object {
  const routeName = getFocusedRouteNameFromRoute(route);
  if (
    routeName === "ChatScreen" ||
    routeName === "ChatCharacter" ||
    routeName === "GenerationSettings" ||
    routeName === "CreatorScreen" ||
    routeName === "SwipeDiscover" ||
    routeName === "WebBrowser"
  ) {
    return { display: "none" as const };
  }
  return {};
}

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  const baseTabBarStyle = {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 56 + bottomInset,
    paddingBottom: bottomInset,
    paddingTop: 6,
  };

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="ChatsTab"
        component={ChatsStackNavigator}
        options={({ route }) => ({
          tabBarLabel: "Chats",
          tabBarIcon: ({ color, size }) => (
            <MessageCircle color={color} size={size || 22} />
          ),
          tabBarStyle: {
            ...baseTabBarStyle,
            ...getTabBarVisibility(route),
          },
        })}
      />
      <Tab.Screen
        name="DiscoverTab"
        component={CharactersStackNavigator}
        options={({ route }) => ({
          tabBarLabel: "Discover",
          tabBarIcon: ({ color, size }) => (
            <Compass color={color} size={size || 22} />
          ),
          tabBarStyle: {
            ...baseTabBarStyle,
            ...getTabBarVisibility(route),
          },
        })}
      />
      <Tab.Screen
        name="CreateTab"
        component={CreateStackNavigator}
        options={{
          tabBarLabel: "Create",
          tabBarIcon: ({ color, size }) => (
            <SquarePen color={color} size={size || 22} />
          ),
          tabBarStyle: baseTabBarStyle,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size || 22} />
          ),
          tabBarStyle: baseTabBarStyle,
        }}
      />
    </Tab.Navigator>
      <SheetPortalHost />
    </View>
  );
}
