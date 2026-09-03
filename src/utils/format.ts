/** Abbreviate number to k/m format. 1234 → "1.2k", 1_500_000 → "1.5m". */
export function formatCount(n: number): string {
    if (n >= 1_000_000) {
        const val = n / 1_000_000;
        return `${val < 10 ? val.toFixed(1) : val.toFixed(0)}m`;
    }
    if (n >= 1_000) {
        const val = n / 1_000;
        return `${val < 10 ? val.toFixed(1) : val.toFixed(0)}k`;
    }
    return String(n);
}
