import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import type { LinkingOptions } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { getToastConfig } from "../utils/toast";
import { useAuthStore } from "../stores/authStore";
import { useChatStore } from "../stores/chatStore";
import { colors } from "../utils/colors";
import type { RootStackParamList } from "./types";
import AuthStack from "./AuthStack";
import MainTabs from "./MainTabs";

const Stack = createNativeStackNavigator<RootStackParamList>();

function parseQueryString(queryString: string): Record<string, string> {
  if (!queryString) return {};
  const params: Record<string, string> = {};
  for (const part of queryString.split("&")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) {
      params[decodeURIComponent(part)] = "";
    } else {
      const key = decodeURIComponent(part.slice(0, eqIdx));
      const value = decodeURIComponent(part.slice(eqIdx + 1));
      params[key] = value;
    }
  }
  return params;
}

function getStateFromPath(path: string) {
  const qIdx = path.indexOf("?");
  const cleanPath = qIdx === -1 ? path : path.slice(0, qIdx);
  const queryString = qIdx === -1 ? "" : path.slice(qIdx + 1);
  const params = parseQueryString(queryString);

  // /search or /search/:tag
  if (cleanPath.startsWith("/search")) {
    const tag = cleanPath.replace("/search/", "");
    return {
      routes: [
        {
          name: "MainTabs",
          state: {
            routes: [
              {
                name: "DiscoverTab",
                state: {
                  routes: [
                    {
                      name: "CharacterSearch",
                      params: {
                        ...params,
                        ...(tag ? { tag } : {}),
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    };
  }

  // /profiles/:uuid_:name
  if (cleanPath.startsWith("/profiles/")) {
    const parts = cleanPath.replace("/profiles/", "").split("_");
    const uuid = parts[0];
    const name = parts.slice(1).join("_") || uuid;
    return {
      routes: [
        {
          name: "MainTabs",
          state: {
            routes: [
              {
                name: "DiscoverTab",
                state: {
                  routes: [
                    {
                      name: "CreatorScreen",
                      params: { userId: uuid, userName: name },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    };
  }

  // /characters/:uuid_:name
  if (cleanPath.startsWith("/characters/")) {
    const parts = cleanPath.replace("/characters/", "").split("_");
    const uuid = parts[0];
    const name = parts.slice(1).join("_") || uuid;
    return {
      routes: [
        {
          name: "MainTabs",
          state: {
            routes: [
              {
                name: "DiscoverTab",
                state: {
                  routes: [
                    {
                      name: "CharacterScreen",
                      params: {
                        characterId: uuid,
                        characterName: name,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    };
  }

  // /my_chats -> navigate to ChatsTab
  if (cleanPath === "/my_chats" || cleanPath === "/my_chats/") {
    return {
      routes: [
        {
          name: "MainTabs",
          state: {
            routes: [{ name: "ChatsTab" }],
          },
        },
      ],
    };
  }

  // /create_character -> navigate to CreateTab
  if (
    cleanPath === "/create_character" ||
    cleanPath === "/create_character/"
  ) {
    return {
      routes: [
        {
          name: "MainTabs",
          state: {
            routes: [{ name: "CreateTab" }],
          },
        },
      ],
    };
  }

  // Default: chats list
  return {
    routes: [
      {
        name: "MainTabs",
        state: {
          routes: [{ name: "ChatsTab" }],
        },
      },
    ],
  };
}

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ["https://janitorai.com", "janitorai://"],
  getStateFromPath,
  config: {
    screens: {
      AuthStack: {
        screens: {},
      },
      MainTabs: {
        screens: {
          DiscoverTab: {
            screens: {
              CharacterSearch: "search",
              CreatorScreen: "profiles/:uuid_:name",
              CharacterScreen: "characters/:uuid_:name",
            },
          },
        },
      },
    },
  },
};

export default function AppNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const initialize = useAuthStore((s) => s.initialize);
  const loadChatLayout = useChatStore((s) => s.loadChatLayout);
  const loadAutoFormatSettings = useChatStore((s) => s.loadAutoFormatSettings);
  const loadChatCentered = useChatStore((s) => s.loadChatCentered);

  useEffect(() => {
    initialize();
    loadChatLayout();
    loadAutoFormatSettings();
    loadChatCentered();
  }, [initialize, loadChatLayout, loadAutoFormatSettings, loadChatCentered]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer linking={linking}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="MainTabs" component={MainTabs} />
          ) : (
            <Stack.Screen name="AuthStack" component={AuthStack} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <Toast config={getToastConfig()} />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
});
