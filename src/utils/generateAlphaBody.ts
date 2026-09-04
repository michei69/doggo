import type { GenerateAlphaRequestBody, Persona } from "../types/api";

interface BuildGenerateAlphaBodyInput {
    chat: GenerateAlphaRequestBody["chat"];
    chatMessages: GenerateAlphaRequestBody["chatMessages"];
    generateMode: string;
    personas: Persona[];
    profile: { id: string; name: string; user_name: string };
    profiles: Array<{
        appearance: string;
        id: string;
        name: string;
        type: string;
    }>;
    userConfig: GenerateAlphaRequestBody["userConfig"];
}

export function buildGenerateAlphaBody({
    chat,
    chatMessages,
    generateMode,
    personas,
    profile,
    profiles,
    userConfig,
}: BuildGenerateAlphaBodyInput): GenerateAlphaRequestBody {
    return {
        chat,
        chatMessages,
        clientPlatform: "web",
        forcedPromptGenerationCacheRefetch: {
            character: false,
            chat: false,
            profile: false,
            script: false,
        },
        generateMode,
        generateType: "CHAT",
        personas,
        profile,
        profiles,
        userConfig: {
            ...userConfig,
            proxyConfigurations: undefined,
            openAIKey: null,
            selectedProxyConfigId: undefined,
            bio_preview_images: undefined,
            claudeApiKey: null,
        },
    };
}
