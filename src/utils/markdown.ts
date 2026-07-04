export function htmlToMarkdown(text?: string): string {
    return text
        ? text
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
              .replace(/<b>(.*?)<\/b>/gi, "**$1**")
              .replace(/<em>(.*?)<\/em>/gi, "*$1*")
              .replace(/<i>(.*?)<\/i>/gi, "*$1*")
              .replace(/<u>(.*?)<\/u>/gi, "__$1__")
              .replace(/<br\s*\/?>/gi, "\n\n")
              .replace(/<p[^>]*>/gi, "")
              .replace(/<\/p>/gi, "\n\n")
              .replace(/<[^>]*>/g, "")
        : "";
}

export function stripHtml(text?: string): string {
    return text
        ? text
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]*>/g, "")
        : "";
}

import type { Pronouns } from "../types/api";

export function replaceTags(
    text: string | null | undefined,
    personaName?: string,
    characterChatName?: string,
    pronouns?: Pronouns | null,
): string {
    let result = (text ?? "")
        .replace(/{{user}}/gi, personaName ?? "user")
        .replace(/(?<!\w)anon(?=(?:[^\w']|$)|'s)/gi, personaName ?? "user")
        .replace(/{{char}}/gi, characterChatName ?? "Character");

    if (pronouns) {
        result = result
            .replace(/{{subj}}/gi, pronouns.subjective)
            .replace(/{{subject}}/gi, pronouns.subjective)
            .replace(/{{obj}}/gi, pronouns.objective)
            .replace(/{{object}}/gi, pronouns.objective)
            .replace(/{{poss}}/gi, pronouns.possessive)
            .replace(/{{possessive}}/gi, pronouns.possessive)
            .replace(/{{posadj}}/gi, pronouns.possessivePronoun)
            .replace(/{{poss-adj}}/gi, pronouns.possessivePronoun)
            .replace(/{{reflexive}}/gi, pronouns.reflexive);
    }

    return result;
}

const anonRegex = /(?<!\\w)Anon(?=(?:[^\\w']|$)|'s)/g
export const escapeRegex = (thing: string) => thing.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
export const generify = (thing: string, charName: string) =>
    thing?.replaceAll(anonRegex, "{{user}}").replaceAll(new RegExp(`(?<!\\w)${escapeRegex(charName)}(?=(?:[^\\w']|$)|'s)`, 'g'), "{{char}}");
export const cleanTags = (thing: string, personaTag: string) =>
    thing
        .replace(
            new RegExp(
                `<${personaTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}>`,
                "i",
            ),
            "",
        )
        .replace(
            new RegExp(
                `</${personaTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}>`,
                "i",
            ),
            "",
        )
        .trim();
