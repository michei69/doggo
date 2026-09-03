const ELLA_BASE = "https://ella.janitorai.com";

/**
 * Shared thumbnail width used by all avatar-sized images.
 * Using one width keeps cache keys consistent across list sizes.
 */
export const AVATAR_THUMB_WIDTH = 128;

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
