import { storage } from "./storage";
import { getUserAgent } from "./userAgent";

export async function buildAuthHeaders(
    options: {
        contentType?: string;
    } = {},
): Promise<Record<string, string>> {
    const [token, cfClearance, cfBm] = await Promise.all([
        storage.getAccessToken(),
        storage.getCfClearance(),
        storage.getCfBm(),
    ]);
    const headers: Record<string, string> = {};
    if (options.contentType) headers["Content-Type"] = options.contentType;
    if (token) headers.Authorization = `Bearer ${token}`;
    const cookies: string[] = [];
    if (cfClearance) cookies.push(`cf_clearance=${cfClearance}`);
    if (cfBm) cookies.push(`__cf_bm=${cfBm}`);
    if (cookies.length > 0) headers.Cookie = cookies.join("; ");
    const ua = getUserAgent();
    if (ua) headers["User-Agent"] = ua;
    return headers;
}
