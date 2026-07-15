import { useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Linking } from "react-native";

export function useNavigateToJanitorLink() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  return useCallback(
    ({ url }: { url: string }) => {
      try {
        const parsed = new URL(url);
        if (parsed.hostname !== "janitorai.com") {
          Linking.openURL(url);
          return;
        }

        const path = parsed.pathname;
        const query = Object.fromEntries(parsed.searchParams.entries());

        // /characters/:uuid_:name
        const charMatch = path.match(/^\/characters\/(.+)$/);
        if (charMatch) {
          const parts = charMatch[1].split("_");
          const id = parts[0];
          const name = parts.slice(1).join("_") || id;
          navigation.navigate("MainTabs", {
            screen: "DiscoverTab",
            params: { screen: "CharacterScreen", params: { characterId: id, characterName: name } },
          });
          return;
        }

        // /profiles/:uuid_:name
        const profMatch = path.match(/^\/profiles\/(.+)$/);
        if (profMatch) {
          const parts = profMatch[1].split("_");
          const id = parts[0];
          const name = parts.slice(1).join("_") || id;
          navigation.navigate("MainTabs", {
            screen: "DiscoverTab",
            params: { screen: "CreatorScreen", params: { userId: id, userName: name } },
          });
          return;
        }

        // /search or /search/:tag
        if (path.startsWith("/search")) {
          const params: any = { ...query };
          const tag = path.replace("/search/", "");
          if (tag && tag !== "search") params.tag = tag;
          navigation.navigate("MainTabs", {
            screen: "DiscoverTab",
            params: { screen: "CharacterSearch", params },
          });
          return;
        }

        // /my_chats
        if (path === "/my_chats") {
          navigation.navigate("MainTabs", { screen: "ChatsTab" });
          return;
        }

        // /create_character
        if (path === "/create_character") {
          navigation.navigate("MainTabs", { screen: "CreateTab" });
          return;
        }

        // Default: open in browser
        Linking.openURL(url);
      } catch {
        Linking.openURL(url);
      }
    },
    [navigation],
  );
}
