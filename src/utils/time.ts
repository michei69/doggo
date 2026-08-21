function formatShortRelative(
    date: Date,
    now: Date,
    dayThreshold: number,
): string | null {
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHrs < 24) return `${diffHrs}h`;
    if (diffDays < dayThreshold) return `${diffDays}d`;
    return null;
}

export function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    return formatShortRelative(date, now, 7) ?? date.toLocaleDateString();
}

function formatRelativeExtended(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const short = formatShortRelative(date, now, 30);
    if (short !== null) return short;

    const months =
        (now.getFullYear() - date.getFullYear()) * 12 +
        (now.getMonth() - date.getMonth());
    if (months < 12) return `${months}mo`;
    const years = Math.floor(months / 12);
    return `${years}y`;
}

function formatAbsolute(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

/** Format a date string. Mode 'relative' → "3d", "2mo", "1y". Mode 'absolute' → "January 15, 2024". */
export function formatDate(
    dateStr: string,
    mode: "relative" | "absolute",
): string {
    return mode === "relative" ? formatRelativeExtended(dateStr) : formatAbsolute(dateStr);
}
