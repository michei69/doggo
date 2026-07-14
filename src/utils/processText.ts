export interface ProcessTextOptions {
    /** Narration wrapper style: "" (none), "*" (italic), "**" (bold), "***" (italic+bold) */
    wrapper: string;
    /** Remove <thought>, <think>, <system>, <response> tags */
    removeTags: boolean;
}

const DEFAULT_OPTIONS: ProcessTextOptions = {
    wrapper: "*",
    removeTags: true,
};

/**
 * Post-process bot message text: strip XML tags, normalize quotes,
 * and wrap narration lines with a markdown wrapper.
 */
export function processText(
    text: string,
    options: Partial<ProcessTextOptions> = {},
): string {
    const { wrapper, removeTags } = { ...DEFAULT_OPTIONS, ...options };

    let processed = text;

    if (removeTags) {
        processed = processed
            .replace(
                /\n?\s*<(thought|thoughts)>[\s\S]*?<\/(thought|thoughts)>\s*\n?/g,
                "",
            )
            .replace(/<(system|response)>|<\/response>/g, "")
            .replace(/\n?\s*<think>[\s\S]*?<\/think>\s*\n?/g, "")
            .replace("</think>", "");
    }

    if (wrapper === "") return processed;

    const normalized = processed.replace(/[«"„‟⹂❞❝\u201c\u201d\u2018\u2019\u201a\u201b\u2039\u203a\u00bb]/g, '"');
    const lines = normalized.split("\n");

    return lines
        .map((line) => {
            const trimmed = line.trim();
            if (trimmed === "") return "";
            const clean = trimmed.replace(/\*/g, "");

            if (clean.includes('"') || clean.includes("`")) {
                const fragments = clean.split(/("[\s\S]*?"|`[\s\S]*?`)/);
                return fragments
                    .map((frag) => {
                        if (
                            (frag.startsWith('"') && frag.endsWith('"')) ||
                            (frag.startsWith("`") && frag.endsWith("`"))
                        ) {
                            return frag;
                        }
                        return frag.trim() !== ""
                            ? `${wrapper}${frag.trim()}${wrapper}`
                            : "";
                    })
                    .filter(Boolean)
                    .join(" ");
            }

            return `${wrapper}${clean}${wrapper}`;
        })
        .join("\n");
}

const scenarioRegex = /<Scenario>(.*)<\/Scenario>/gms;
export function processSystemMessage(prompt: string, characterName: string) {
    return {
        personality: prompt
            .matchAll(
                new RegExp(
                    `<${characterName}'s Persona>(.*)</${characterName}'s Persona>`,
                    "gms",
                ),
            )
            .next().value?.[1],
        scenario: prompt.matchAll(scenarioRegex).next().value?.[1],
    };
}
