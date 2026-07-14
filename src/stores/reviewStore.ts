import type { EmojiDef } from "../types/api";
import { fetchEmojiDefinitions } from "../api/reviews";

let emojiDefinitions: EmojiDef[] | null = null;

export async function getEmojiDefinitions(): Promise<EmojiDef[]> {
    if (emojiDefinitions !== null) {
        return emojiDefinitions;
    }
    const response = await fetchEmojiDefinitions();
    emojiDefinitions = response.all;
    return emojiDefinitions;
}

export function clearEmojiDefinitions(): void {
    emojiDefinitions = null;
}
