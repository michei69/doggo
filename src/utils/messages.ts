import type { ChatMessage } from "../types/api";

export interface MessageGroup {
    messages: ChatMessage[];
    isBot: boolean;
    key: string;
}

export function groupMessages(messages: ChatMessage[]): MessageGroup[] {
    const groups: MessageGroup[] = [];
    let i = 0;
    while (i < messages.length) {
        const current = messages[i];
        if (current.is_bot) {
            const variants: ChatMessage[] = [current];
            i++;
            while (i < messages.length && messages[i].is_bot) {
                variants.push(messages[i]);
                i++;
            }
            groups.push({
                messages: variants,
                isBot: true,
                key: variants.map((m) => String(m.id ?? "")).join("-"),
            });
        } else {
            groups.push({
                messages: [current],
                isBot: false,
                key: String(current.id ?? `msg-${i}`),
            });
            i++;
        }
    }
    return groups;
}
