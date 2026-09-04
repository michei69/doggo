export function uuidv4(): string {
    // SAFETY: globalThis.crypto is the WebCrypto API when the engine provides
    // it; if absent this is undefined, so the optional-call below is guarded.
    const c = globalThis.crypto as Crypto | undefined;
    if (c?.randomUUID) return c.randomUUID();
    // RFC 4122 v4 fallback. Not crypto-secure, but unique enough for a
    // client-generated proxy-config id.
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
        const r = (Math.random() * 16) | 0;
        const v = ch === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
