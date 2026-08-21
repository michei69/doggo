import { Pressable, StyleSheet, Text, View } from "react-native";
import Avatar from "../common/Avatar";
import { botAvatarUrl, avatarUrl } from "../../utils/assets";
import type { ChatListItem } from "../../types/api";
import { colors } from "../../utils/colors";

export function ChatRow({
  item,
  onPress,
  persona,
}: {
  item: ChatListItem;
  onPress: (item: ChatListItem) => void;
  persona?: { name: string; avatar: string };
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && { opacity: 0.7 },
      ]}
      onPress={() => onPress(item)}
    >
      <Avatar
        uri={botAvatarUrl(item.character.avatar)}
        name={item.character.name}
        size={36}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {item.character.name}
        </Text>
        <Text style={styles.meta}>
          {item.chat_count} messages
          {persona?.name ? ` · ${persona.name}` : ""}
        </Text>
      </View>
      {persona?.avatar ? (
        <Avatar uri={avatarUrl(persona.avatar)} name={persona.name} size={28} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  meta: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
});
