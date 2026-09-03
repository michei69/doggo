import type { Persona, PersonaGroup, Pronouns } from "../../../types/api";

export function pronounLabel(p: Pronouns): string {
    return `${p.subjective}/${p.objective}`;
}

export type { ShowAlert } from "../../../components/common/CustomAlert";

export type DragState =
    | { type: "persona"; index: number; item: Persona; startY: number }
    | { type: "group"; index: number; item: PersonaGroup; startY: number }
    | null;
