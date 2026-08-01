import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { attemptExtractSystemPrompt, fetchSystemPrompt } from "../../../api/chats";
import { useChatStore } from "../../../stores/chatStore";
import { storage } from "../../../utils/storage";
import { processSystemMessage } from "../../../utils/processText";
import { cleanTags, generify } from "../../../utils/markdown";
import type { ShowAlert } from "./types";

export function useLocalSettings({
    activeChatId,
    showAlert,
    dismissAlert,
    setIsDirty,
}: {
    activeChatId: number | null;
    showAlert: ShowAlert;
    dismissAlert: () => void;
    setIsDirty: Dispatch<SetStateAction<boolean>>;
}) {
    const [localLocalMode, setLocalLocalMode] = useState(false);
    const [localPersonality, setLocalPersonality] = useState("");
    const [localScenario, setLocalScenario] = useState("");
    const [fetchingPersonality, setFetchingPersonality] = useState(false);
    const [fetchingScenario, setFetchingScenario] = useState(false);
    const localLoadedRef = useRef(false);

    // Load per-chat local data
    useEffect(() => {
        if (!activeChatId) return;
        localLoadedRef.current = false;
        let cancelled = false;
        const load = async () => {
            try {
                const data = await storage.getChatLocalData(activeChatId);
                if (cancelled) return;
                if (data) {
                    setLocalLocalMode(data.local_mode);
                    setLocalPersonality(data.personality);
                    setLocalScenario(data.scenario);
                } else {
                    setLocalLocalMode(false);
                    setLocalPersonality("");
                    setLocalScenario("");
                }
            } finally {
                if (!cancelled) localLoadedRef.current = true;
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [activeChatId]);

    // Save per-chat local data on change
    const saveLocalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (!localLoadedRef.current || !activeChatId) return;
        if (saveLocalRef.current) clearTimeout(saveLocalRef.current);
        saveLocalRef.current = setTimeout(() => {
            storage.setChatLocalData(activeChatId, {
                local_mode: localLocalMode,
                personality: localPersonality,
                scenario: localScenario,
            });
        }, 300);
        return () => {
            if (saveLocalRef.current) clearTimeout(saveLocalRef.current);
        };
    }, [localLocalMode, localPersonality, localScenario, activeChatId]);

    const setPersonality = useCallback(
        (v: string) => {
            setLocalPersonality(v);
            setIsDirty(true);
        },
        [setIsDirty],
    );

    const setScenario = useCallback(
        (v: string) => {
            setLocalScenario(v);
            setIsDirty(true);
        },
        [setIsDirty],
    );

    const handleFetchPersonality = useCallback(async () => {
        if (!activeChatId) return;
        setFetchingPersonality(true);
        try {
            const detail = useChatStore.getState().activeChatDetail;
            if (!detail) throw new Error("Chat not loaded");
            const characterName = detail.character.chat_name || detail.character.name;
            try {
                const prompt = await fetchSystemPrompt(detail);
                const { personality } = processSystemMessage(prompt, characterName);
                setLocalPersonality(
                    generify(
                        cleanTags(personality ?? "", `${characterName}'s Persona`),
                        characterName,
                    ),
                );
            } catch {
                const abortController = new AbortController();
                const { character_id } = detail.chat;
                const personaTag = `${characterName}'s Persona`;
                const personaResult = await attemptExtractSystemPrompt(
                    character_id,
                    personaTag,
                    abortController.signal,
                );
                setLocalPersonality(
                    generify(cleanTags(personaResult, personaTag), characterName),
                );
            }
        } catch (err: any) {
            showAlert("Error", err.message || "Failed to fetch personality", [
                { text: "OK", onPress: dismissAlert },
            ]);
        } finally {
            setFetchingPersonality(false);
        }
    }, [activeChatId, showAlert, dismissAlert]);

    const handleFetchScenario = useCallback(async () => {
        if (!activeChatId) return;
        setFetchingScenario(true);
        try {
            const detail = useChatStore.getState().activeChatDetail;
            if (!detail) throw new Error("Chat not loaded");
            const characterName = detail.character.chat_name || detail.character.name;
            try {
                const prompt = await fetchSystemPrompt(detail);
                const { scenario } = processSystemMessage(prompt, characterName);
                setLocalScenario(
                    generify(cleanTags(scenario ?? "", "Scenario"), characterName),
                );
            } catch {
                const abortController = new AbortController();
                const { character_id } = detail.chat;
                const scenario = await attemptExtractSystemPrompt(
                    character_id,
                    "Scenario",
                    abortController.signal,
                );
                setLocalScenario(
                    generify(cleanTags(scenario ?? "", "Scenario"), characterName),
                );
            }
        } catch (err: any) {
            showAlert("Error", err.message || "Failed to fetch scenario", [
                { text: "OK" },
            ]);
        } finally {
            setFetchingScenario(false);
        }
    }, [activeChatId, showAlert]);

    const handleToggleLocalMode = useCallback(
        (v: boolean) => {
            setLocalLocalMode(v);
            setIsDirty(true);
        },
        [setIsDirty],
    );

    return {
        localLocalMode,
        localPersonality,
        localScenario,
        fetchingPersonality,
        fetchingScenario,
        setPersonality,
        setScenario,
        handleFetchPersonality,
        handleFetchScenario,
        handleToggleLocalMode,
    };
}
