import { generateAlpha } from "../api/chats";
import { sseClient } from "../api/sse";
import { useChatStore } from "../stores/chatStore";
import { storage } from "./storage";
import { loadChatUserConfig } from "./chatConfig";
import type { ChatMessage } from "../types/api";

function buildChatSummaryPrompt({
    characterName,
    userName,
    summary,
    messages,
}: {
    characterName: string;
    userName: string;
    summary: string;
    messages: ChatMessage[];
}): string {
    const conversationLog = messages
        .map(
            (message) =>
                `${message.is_bot ? characterName : userName}: ${message.message}`,
        )
        .join("\n");

    let prompt = `You are compacting the conversation between ${characterName} and ${userName} into a persistent Memory document. This Memory will stand in place of older messages for future prompts, anything not captured here is forgotten forever. Record every fact the conversation still depends on.

Structure the document with short UPPERCASE section headers you think fit, each followed by terse bullet points. Cover everything that matters: established facts, pivotal moments, current state, unresolved threads, and the dynamic of the conversation itself.

Rules:
- Concrete facts only: names, decisions, promises, secrets, items, locations, numbers, and time skips matter.
- Use exact wording for names, nicknames, titles, and quoted promises. Do not paraphrase them.
- Only what was actually said or happend: do not invent, infer, or embellish.
- Use present tense for the current state, past tense for what happened.
- No commentary or prose outside the sections
- Output ONLY the Memory document`;

    if (summary.trim().length > 0) {
        prompt += `\n\nPrevious summary:\n${summary}`;
    }

    prompt += `\n\nConversation log:\n${conversationLog}`;
    return prompt;
}

function stripThinkingText(text: string): string {
    return text
        .replace(/<thinking>[\s\S]*?<\/thinking>/g, "")
        .replace(/<thought>[\s\S]*?<\/thought>/g, "")
        .replace(/<think>[\s\S]*?<\/think>/g, "")
        .trim();
}

export async function generateChatSummary({
    chatId,
    characterId,
    fromMessageId,
}: {
    chatId: number;
    characterId: string;
    fromMessageId?: number | null;
}): Promise<string> {
    const detail = useChatStore.getState().activeChatDetail;
    if (!detail) {
        throw new Error("Chat not loaded");
    }

    const allMessages = useChatStore.getState().messages;
    const messages = fromMessageId
        ? allMessages.filter((message) => message.id >= fromMessageId)
        : allMessages;

    const characterName = detail.character.chat_name || detail.character.name;
    const activePersona =
        detail.chat.persona_id != null
            ? detail.personas.find(
                  (persona) => persona.id === detail.chat.persona_id,
              )
            : detail.personas[0];
    const userName = activePersona?.name ?? "user";

    const prompt = buildChatSummaryPrompt({
        characterName,
        userName,
        summary: detail.chat.summary ?? "",
        messages,
    });

    const { profile, selectedProxy, userConfig, apiUrl, apiKey, model } =
        await loadChatUserConfig();

    const localData = await storage.getChatLocalData(chatId);
    if (localData?.local_mode) {
        if (!apiUrl || !apiKey || !model) {
            throw new Error("No proxy configured for local mode");
        }

        return await new Promise<string>((resolve, reject) => {
            sseClient.streamChat(
                apiUrl,
                apiKey,
                model,
                [{ role: "user", content: prompt }],
                {
                    onToken: () => {},
                    onThinking: () => {},
                    onComplete: (message) =>
                        resolve(stripThinkingText(message)),
                    onError: (error) => reject(error),
                },
                false,
            );
        });
    }

    const body = {
        chat: {
            character_id: characterId,
            id: detail.chat.id,
            persona_id: detail.chat.persona_id,
            summary: detail.chat.summary ?? "",
            summary_chat_id: detail.chat.summary_chat_id,
            user_id: detail.chat.user_id,
        },
        chatMessages: [
            {
                chat_id: chatId,
                created_at: new Date().toISOString(),
                id: -Date.now(),
                is_bot: false,
                is_main: true,
                message: prompt,
                character_id: characterId,
                persona_id: detail.chat.persona_id,
            },
        ],
        clientPlatform: "web",
        forcedPromptGenerationCacheRefetch: {
            character: false,
            chat: false,
            profile: false,
            script: false,
        },
        generateMode: "NEW",
        generateType: "CHAT",
        personas: detail.personas,
        profile: {
            id: profile.id,
            name: profile.name,
            user_name: profile.user_name,
        },
        profiles: detail.personas.map((persona) => ({
            appearance: persona.appearance,
            id: persona.id,
            name: persona.name,
            type: "persona",
        })),
        userConfig: {
            ...userConfig,
            proxyConfigurations: undefined,
            openAIKey: null,
            selectedProxyConfigId: undefined,
            bio_preview_images: undefined,
            claudeApiKey: null,
        },
    };

    return await new Promise<string>((resolve, reject) => {
        generateAlpha(
            body,
            new AbortController().signal,
            {
                onToken: () => {},
                onThinking: () => {},
                onComplete: (message) => resolve(stripThinkingText(message)),
                onError: (error) => reject(error),
            },
            selectedProxy?.apiUrl,
            selectedProxy?.apiKey,
            selectedProxy?.model,
        ).catch(reject);
    });
}
