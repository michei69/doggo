import {
    attemptExtractSystemPrompt,
    fetchSystemPrompt,
} from "../api/chats";
import type { ChatDetail } from "../types/api";
import { processSystemMessage } from "./processText";
import { cleanTags, generify } from "./markdown";

/**
 * Fetch a single persona field (personality or scenario) for a chat detail.
 * Tries the live system-prompt fetch first; on failure falls back to having
 * the AI reproduce the field via attemptExtractSystemPrompt.
 */
export async function fetchPersonaField(
    detail: ChatDetail,
    tag: string,
    field: "personality" | "scenario",
): Promise<string> {
    const characterName = detail.character.chat_name || detail.character.name;
    try {
        const prompt = await fetchSystemPrompt(detail);
        const { personality, scenario } = processSystemMessage(
            prompt,
            characterName,
        );
        const value =
            field === "personality" ? personality ?? "" : scenario ?? "";
        return generify(cleanTags(value, tag), characterName);
    } catch {
        const abortController = new AbortController();
        const { character_id } = detail.chat;
        const result = await attemptExtractSystemPrompt(
            character_id,
            tag,
            abortController.signal,
        );
        return generify(cleanTags(result, tag), characterName);
    }
}
