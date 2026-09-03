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

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

async function extractErrorMessage(response: Response): Promise<string> {
    const fallback = `HTTP ${response.status}`;
    try {
        const body: unknown = await response.json();
        if (typeof body === "object" && body !== null) {
            if (
                "message" in body &&
                typeof body.message === "string" &&
                body.message
            ) {
                return body.message;
            }
            if ("error" in body) {
                const error = body.error;
                if (typeof error === "string" && error) {
                    return error;
                }
                if (
                    typeof error === "object" &&
                    error !== null &&
                    "message" in error &&
                    typeof error.message === "string" &&
                    error.message
                ) {
                    return error.message;
                }
            }
        }
    } catch {
        // non-JSON error body, keep status message
    }
    return fallback;
}

function extractStreamContent(value: unknown): string {
    if (!isRecord(value)) return "";
    const choices = value.choices;
    if (!Array.isArray(choices)) return "";
    const first = choices[0];
    if (!isRecord(first)) return "";
    const message = first.message;
    if (!isRecord(message)) return "";
    const content = message.content;
    return typeof content === "string" ? content : "";
}

interface StreamRequestOptions {
    url: string;
    body: unknown;
    signal?: AbortSignal;
    headers: Record<string, string>;
    callbacks: SSECallbacks;
    onJson: (json: unknown) => Promise<void>;
    onStream?: (response: Response) => Promise<void>;
}

export async function streamRequest({
    url,
    body,
    signal,
    headers,
    callbacks,
    onJson,
    onStream,
}: StreamRequestOptions): Promise<void> {
    let response: Response;
    console.log("[API]", "POST", url);
    try {
        response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal,
        });
        console.log("[API]", response.status, "POST", url);
    } catch (err: unknown) {
        console.log(
            "[API] ERR",
            "NO_RESPONSE",
            "POST",
            url,
            err instanceof Error ? err.message : String(err),
        );
        if (signal?.aborted) return;
        callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        return;
    }

    if (!response.ok) {
        const message = await extractErrorMessage(response);
        if (signal?.aborted) return;
        callbacks.onError(new Error(message));
        return;
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json") || !response.body) {
        const json: unknown = await response.json();
        await onJson(json);
        return;
    }

    if (onStream) {
        await onStream(response);
        return;
    }

    const reader = response.body.getReader();
    await readSSEStream(
        reader,
        signal ?? new AbortController().signal,
        callbacks,
    );
}

class SSEClient {
    private abortController: AbortController | null = null;

    async streamChat(
        apiUrl: string,
        apiKey: string,
        model: string,
        messages: Array<{ role: string; content: string }>,
        callbacks: SSECallbacks,
        enableReasoning?: boolean,
        prefill?: string,
    ): Promise<void> {
        this.abort();
        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        const baseUrl = apiUrl.replace(/\/+$/, "");
        const url = baseUrl.endsWith("/chat/completions")
            ? baseUrl
            : `${baseUrl}/chat/completions`;

        const thinkingParam = {
            type: enableReasoning
                ? ("enabled" as const)
                : ("disabled" as const),
        };

        const body: Record<string, unknown> = {
            model,
            messages,
            stream: true,
            thinking: thinkingParam,
        };
        if (prefill) {
            // Assistant prefill: the model continues from this text.
            body.prefill = prefill;
        }

        try {
            await streamRequest({
                url,
                body,
                signal,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                callbacks,
                onJson: async (json: unknown) => {
                    callbacks.onComplete(extractStreamContent(json));
                },
            });
        } catch (error: unknown) {
            if (!(error instanceof Error) || error.name !== "AbortError") {
                callbacks.onError(
                    error instanceof Error ? error : new Error(String(error)),
                );
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
