import { getMyProfile } from "../api/profile";
import { storage } from "./storage";

export async function loadChatUserConfig() {
    const profile = await getMyProfile();
    const selectedProxy = profile.config.proxyConfigurations.find(
        (p) => p.id === profile.config.selectedProxyConfigId,
    );

    const userConfig = {
        ...profile.config,
        reverseProxyKey: selectedProxy?.apiKey ?? "",
        openAiModel: selectedProxy?.model ?? profile.config.openAiModel ?? "",
        open_ai_jailbreak_prompt:
            selectedProxy?.jailbreakPrompt ??
            profile.config.open_ai_jailbreak_prompt ??
            "",
    };

    const privacyMode = await storage.getPrivacyMode();
    if (privacyMode) {
        userConfig.open_ai_reverse_proxy = "http://doggy.privacy/";
        userConfig.reverseProxyKey = "redacted";
        userConfig.openAiModel = "doggy-privacy";
    }

    const apiUrl = selectedProxy?.apiUrl || userConfig.open_ai_reverse_proxy;
    const apiKey = selectedProxy?.apiKey || userConfig.reverseProxyKey;
    const model = selectedProxy?.model || userConfig.openAiModel;

    return { profile, selectedProxy, userConfig, apiUrl, apiKey, model };
}
