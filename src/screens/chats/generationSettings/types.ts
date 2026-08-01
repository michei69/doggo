import type { AlertButton } from "../../../components/common/CustomAlert";
import type {
    ApiProxyConfig,
    ApiSettingsGeneration,
    ApiSettingsSettings,
    PromptLibraryItem,
} from "../../../types/api";

export type GenSettings = ApiSettingsGeneration;
export type UpdateGen = (patch: Partial<ApiSettingsGeneration>) => void;
export type ShowAlert = (
    title: string,
    message: string,
    buttons: AlertButton[],
) => void;
export type ProxyEditForm = {
    name: string;
    model: string;
    api_url: string;
    api_key: string;
    prompt_id: string | null;
};
export type PromptEditForm = { name: string; content: string };

export type {
    ApiProxyConfig,
    ApiSettingsGeneration,
    ApiSettingsSettings,
    PromptLibraryItem,
};
