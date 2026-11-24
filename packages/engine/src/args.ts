import type { JsonValue } from "./types";

function collectStringsInto(value: JsonValue, result: string[]): void {
  if (typeof value === "string") {
    result.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringsInto(item, result);
    }
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) {
      collectStringsInto(child, result);
    }
  }
}

export function collectStrings(value: JsonValue): string[] {
  const result: string[] = [];
  collectStringsInto(value, result);
  return result;
}
