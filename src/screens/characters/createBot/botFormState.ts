import { storage } from "../../../utils/storage";

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
