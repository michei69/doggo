import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
    createProxyConfig,
    deleteProxyConfig,
    getApiSettings,
    updateProxyConfig,
} from "../../../api/settings";
import { uuidv4 } from "../../../utils/uuid";
import type {
    ApiProxyConfig,
    ApiSettingsSettings,
    ProxyEditForm,
    ShowAlert,
} from "./types";

export function useProxyEditor({
    proxyConfigs,
    setProxyConfigs,
    setSettings,
    showAlert,
    dismissAlert,
    setIsDirty,
}: {
    proxyConfigs: ApiProxyConfig[];
    setProxyConfigs: Dispatch<SetStateAction<ApiProxyConfig[]>>;
    setSettings: Dispatch<SetStateAction<ApiSettingsSettings>>;
    showAlert: ShowAlert;
    dismissAlert: () => void;
    setIsDirty: Dispatch<SetStateAction<boolean>>;
}) {
    const [editingProxyId, setEditingProxyId] = useState<string | null>(null);
    const [isCreatingProxy, setIsCreatingProxy] = useState(false);
    const [editForm, setEditForm] = useState<ProxyEditForm>({
        name: "",
        model: "",
        api_url: "",
        api_key: "",
        prompt_id: null,
    });
    const [showApiKey, setShowApiKey] = useState(false);
    const [proxySaving, setProxySaving] = useState(false);
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
    const [promptSelectorVisible, setPromptSelectorVisible] = useState(false);

    const selectProxy = useCallback(
        (id: string) => {
            setSettings((s) => ({ ...s, selected_proxy_config_id: id }));
            setIsDirty(true);
        },
        [setSettings, setIsDirty],
    );

    const openEdit = useCallback((proxy: ApiProxyConfig) => {
        setEditingProxyId(proxy.id);
        setIsCreatingProxy(false);
        setEditForm({
            name: proxy.name,
            model: proxy.model,
            api_url: proxy.api_url,
            api_key: proxy.api_key,
            prompt_id: proxy.prompt?.id ?? null,
        });
        setShowApiKey(false);
    }, []);

    const openAdd = useCallback(() => {
        setEditingProxyId("__new__");
        setIsCreatingProxy(true);
        setEditForm({ name: "", model: "", api_url: "", api_key: "", prompt_id: null });
        setShowApiKey(false);
    }, []);

    const closeEdit = useCallback(() => {
        setEditingProxyId(null);
        setIsCreatingProxy(false);
    }, []);

    const saveEdit = useCallback(async () => {
        if (!editingProxyId) return;
        setProxySaving(true);
        try {
            if (isCreatingProxy) {
                await createProxyConfig({
                    api_key: editForm.api_key,
                    api_url: editForm.api_url,
                    client_id: uuidv4(),
                    model: editForm.model,
                    name: editForm.name,
                    prompt_id: editForm.prompt_id,
                });
                // Refetch so the list matches server truth (id, position,
                // prompt materialization). Appending the raw response risks a
                // duplicate id / stale shape -> React key collision.
                const apiSettings = await getApiSettings();
                setProxyConfigs(apiSettings.proxy_configs);
            } else {
                const updated = await updateProxyConfig(editingProxyId, {
                    api_key: editForm.api_key,
                    api_url: editForm.api_url,
                    model: editForm.model,
                    name: editForm.name,
                    prompt_id: editForm.prompt_id,
                });
                setProxyConfigs((prev) =>
                    prev.map((p) => (p.id === editingProxyId ? updated : p)),
                );
            }
            setEditingProxyId(null);
            setIsCreatingProxy(false);
        } catch (err: any) {
            showAlert("Error", err.message || "Failed to save proxy", [
                { text: "OK", onPress: dismissAlert },
            ]);
        } finally {
            setProxySaving(false);
        }
    }, [editingProxyId, isCreatingProxy, editForm, setProxyConfigs, showAlert, dismissAlert]);

    const duplicateProxy = useCallback(
        async (proxy: ApiProxyConfig) => {
            if (duplicatingId) return;
            setDuplicatingId(proxy.id);
            try {
                await createProxyConfig({
                    api_key: proxy.api_key,
                    api_url: proxy.api_url,
                    client_id: uuidv4(),
                    model: proxy.model,
                    name: `${proxy.name} (Copy)`,
                    prompt_id: proxy.prompt?.id ?? null,
                });
                // Refetch from the server so the new entry shows up even if
                // the create response is a wrapper/204 or the server assigns
                // its own position/id. The list is server truth.
                const apiSettings = await getApiSettings();
                setProxyConfigs(apiSettings.proxy_configs);
                setSettings((s) => ({
                    ...s,
                    selected_proxy_config_id:
                        s.selected_proxy_config_id || apiSettings.settings.selected_proxy_config_id,
                }));
            } catch (err: any) {
                showAlert("Error", err.message || "Failed to duplicate proxy", [
                    { text: "OK", onPress: dismissAlert },
                ]);
            } finally {
                setDuplicatingId(null);
            }
        },
        [setProxyConfigs, setSettings, showAlert, dismissAlert, duplicatingId],
    );

    const deleteProxy = useCallback(
        (proxy: ApiProxyConfig) => {
            showAlert("Delete Proxy", `Delete "${proxy.name}"?`, [
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        dismissAlert();
                        try {
                            await deleteProxyConfig(proxy.id);
                            setProxyConfigs((prev) => prev.filter((p) => p.id !== proxy.id));
                            setSettings((s) => ({
                                ...s,
                                selected_proxy_config_id:
                                    s.selected_proxy_config_id === proxy.id
                                        ? (proxyConfigs.find((p) => p.id !== proxy.id)?.id ?? "")
                                        : s.selected_proxy_config_id,
                            }));
                        } catch (err: any) {
                            showAlert("Error", err.message || "Failed to delete proxy", [
                                { text: "OK", onPress: dismissAlert },
                            ]);
                        }
                    },
                },
                { text: "Cancel", style: "cancel", onPress: dismissAlert },
            ]);
        },
        [showAlert, dismissAlert, proxyConfigs, setProxyConfigs, setSettings],
    );

    const copyJson = useCallback(
        (proxy: ApiProxyConfig) => {
            showAlert("Proxy JSON", JSON.stringify(proxy, null, 2), [
                { text: "OK", onPress: dismissAlert },
            ]);
        },
        [showAlert, dismissAlert],
    );

    const openPromptSelector = useCallback(
        () => setPromptSelectorVisible(true),
        [],
    );
    const closePromptSelector = useCallback(
        () => setPromptSelectorVisible(false),
        [],
    );

    return {
        editingProxyId,
        isCreatingProxy,
        editForm,
        setEditForm,
        showApiKey,
        setShowApiKey,
        proxySaving,
        duplicatingId,
        promptSelectorVisible,
        selectProxy,
        openEdit,
        openAdd,
        closeEdit,
        saveEdit,
        duplicateProxy,
        deleteProxy,
        copyJson,
        openPromptSelector,
        closePromptSelector,
    };
}
