import { storage } from "../../../utils/storage";
import type { CharacterDetail } from "../../../types/api";

export interface BotFormState {
    avatar: string;
    name: string;
    chat_name: string;
    description: string;
    personality: string;
    scenario: string;
    example_dialogs: string;
    first_messages: string[];
    is_nsfw: boolean;
    tag_ids: number[];
    custom_tags: string[];
    editCharacterId?: string;
}

export const EMPTY_FORM: BotFormState = {
    avatar: "",
    name: "",
    chat_name: "",
    description: "",
    personality: "",
    scenario: "",
    example_dialogs: "",
    first_messages: [""],
    is_nsfw: false,
    tag_ids: [],
    custom_tags: [],
};

export function characterToBotFormState(
    char: CharacterDetail,
    characterId: string,
): BotFormState {
    return {
        avatar: char.avatar ?? "",
        name: char.name ?? "",
        chat_name: char.chat_name ?? "",
        description: char.description ?? "",
        personality: char.personality ?? "",
        scenario: char.scenario ?? "",
        example_dialogs: char.example_dialogs ?? "",
        first_messages:
            char.first_messages.length > 0 ? char.first_messages : [""],
        is_nsfw: char.is_nsfw,
        tag_ids: char.tags.map((t) => t.id),
        custom_tags: char.custom_tags ?? [],
        editCharacterId: characterId,
    };
}

export function persistForm(form: BotFormState, isEditMode: boolean): void {
    if (isEditMode) {
        storage.setEditBotState(form);
    } else {
        storage.setCreateBotState(form);
    }
}

export function clearPersistedForm(isEditMode: boolean): void {
    if (isEditMode) {
        storage.removeEditBotState();
    } else {
        storage.removeCreateBotState();
    }
}
