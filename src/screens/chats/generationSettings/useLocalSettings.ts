import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useChatStore } from "../../../stores/chatStore";
import { storage } from "../../../utils/storage";
import { fetchPersonaField } from "../../../utils/systemPrompt";
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
            setLocalPersonality(
                await fetchPersonaField(detail, `${characterName}'s Persona`, "personality"),
            );
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
            setLocalScenario(
                await fetchPersonaField(detail, "Scenario", "scenario"),
            );
        } catch (err: any) {
            showAlert("Error", err.message || "Failed to fetch scenario", [
                { text: "OK", onPress: dismissAlert },
            ]);
        } finally {
            setFetchingScenario(false);
        }
    }, [activeChatId, showAlert, dismissAlert]);

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
