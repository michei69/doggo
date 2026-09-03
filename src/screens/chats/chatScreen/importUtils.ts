import type { ChatMessage } from "../../../types/api";

export function validateMessagesImport(
    raw: string,
): { valid: true; messages: ChatMessage[] } | { valid: false; error: string } {
    let data: unknown;
    try {
        data = JSON.parse(raw);
    } catch {
        return {
            valid: false,
            error: "Invalid JSON: could not parse the input.",
        };
    }
    if (!Array.isArray(data)) {
        return {
            valid: false,
            error: "Invalid format: expected a JSON array.",
        };
    }
    const messages: ChatMessage[] = [];
    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (typeof item !== "object" || item === null) {
            return {
                valid: false,
                error: `Item ${i}: expected an object, got ${typeof item}.`,
            };
        }
        if (typeof item.is_bot !== "boolean") {
            return {
                valid: false,
                error: `Item ${i}: "is_bot" must be a boolean.`,
            };
        }
        if (typeof item.is_main !== "boolean") {
            return {
                valid: false,
                error: `Item ${i}: "is_main" must be a boolean.`,
            };
        }
        if (typeof item.message !== "string") {
            return {
                valid: false,
                error: `Item ${i}: "message" must be a string.`,
            };
        }
        messages.push({
            id: -(i + 1),
            chat_id: 0,
            created_at: new Date().toISOString(),
            is_bot: item.is_bot,
            is_main: item.is_main,
            message: item.message,
            metadata: "metadata" in item ? item.metadata : null,
            rating: null,
        });
    }
    return { valid: true, messages };
}
