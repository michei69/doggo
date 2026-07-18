const ELLA_BASE = "https://ella.janitorai.com";

export function botAvatarUrl(filename: string, width?: number): string {
    const base = `${ELLA_BASE}/bot-avatars/${filename}`;
    return width ? `${base}?width=${width}` : base;
}
export function avatarUrl(filename: string, width?: number): string {
    const base = `${ELLA_BASE}/avatars/${filename}`;
    return width ? `${base}?width=${width}` : base;
}

export function assetUrl(path: string): string {
    return `${ELLA_BASE}/${path}`;
}
