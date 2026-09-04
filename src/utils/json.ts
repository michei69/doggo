export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };

/** Narrow a parsed value to a JSON object; fields are a known JsonValue union. */
export function isRecord(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null;
}

/** Narrow a parsed value to a string. */
export function isString(value: unknown): value is string {
    return typeof value === "string";
}

/** Narrow a parsed value to a boolean. */
export function isBoolean(value: unknown): value is boolean {
    return typeof value === "boolean";
}
