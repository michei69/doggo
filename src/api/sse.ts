export interface SSECallbacks {
    onToken: (token: string) => void;
    onThinking: (thinking: string) => void;
    onComplete: (fullMessage: string) => void;
    onError: (error: Error) => void;
}

export async function readSSEStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    signal: AbortSignal,
    callbacks: SSECallbacks,
): Promise<void> {
    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";
    let inThinking = false;
    let thinkingContent = "";
    let reasoningContent = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                if (!line.trim() || !line.startsWith("data: ")) continue;
                const data = line.slice(6).trim();
                if (data === "[DONE]") continue;

                try {
                    const parsed = JSON.parse(data);
                    const delta = parsed.choices?.[0]?.delta;

                    const reasoning = delta?.reasoning_content;
                    if (reasoning) {
                        reasoningContent += reasoning;
                        callbacks.onThinking(reasoningContent);
                    }

                    const content = delta?.content;
                    if (content) {
                        fullContent += content;
                        callbacks.onToken(content);

                        let remaining = content;
                        while (remaining.length > 0) {
                            if (!inThinking) {
                                const openIdx = remaining.indexOf("<thinking>");
                                if (openIdx !== -1) {
                                    inThinking = true;
                                    remaining = remaining.slice(openIdx + 10);
                                    thinkingContent = "";
                                } else {
                                    break;
                                }
                            } else {
                                const closeIdx =
                                    remaining.indexOf("</thinking>");
                                if (closeIdx !== -1) {
                                    thinkingContent += remaining.slice(
                                        0,
                                        closeIdx,
                                    );
                                    callbacks.onThinking(thinkingContent);
                                    inThinking = false;
                                    remaining = remaining.slice(closeIdx + 11);
                                } else {
                                    thinkingContent += remaining;
                                    callbacks.onThinking(thinkingContent);
                                    break;
                                }
                            }
                        }
                    }
                } catch {
                    // skip invalid JSON
                }
            }
        }
        callbacks.onComplete(fullContent);
    } catch (error: any) {
        if (signal.aborted) return;
        callbacks.onError(error);
    }
}

export class SSEClient {
    private abortController: AbortController | null = null;

    async streamChat(
        apiUrl: string,
        apiKey: string,
        model: string,
        messages: Array<{ role: string; content: string }>,
        callbacks: SSECallbacks,
    ): Promise<void> {
        this.abort();
        this.abortController = new AbortController();

        const baseUrl = apiUrl.replace(/\/+$/, "");
        const url = baseUrl.endsWith("/chat/completions") ? baseUrl : `${baseUrl}/chat/completions`;

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({ model, messages, stream: true }),
                signal: this.abortController.signal,
            });

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`,
                );
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No response body");

            await readSSEStream(reader, this.abortController.signal, callbacks);
        } catch (error: any) {
            if (error.name !== "AbortError") {
                callbacks.onError(error);
            }
        } finally {
            this.abortController = null;
        }
    }

    abort(): void {
        this.abortController?.abort();
        this.abortController = null;
    }
}

export const sseClient = new SSEClient();
