import type { JsonValue } from "./types";

function stringifyArray(value: JsonValue[]): string {
  const items: string[] = [];
  for (const item of value) {
    items.push(stableStringify(item));
  }
  return `[${items.join(",")}]`;
}

function stringifyObject(value: { [key: string]: JsonValue }): string {
  const keys = Object.keys(value).sort();
  const pairs: string[] = [];
  for (const key of keys) {
    const propertyValue = value[key];
    if (propertyValue !== undefined) {
      pairs.push(`${JSON.stringify(key)}:${stableStringify(propertyValue)}`);
    }
  }
  return `{${pairs.join(",")}}`;
}

export function stableStringify(value: JsonValue): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    if (Number.isFinite(value) === false) {
      return "null";
    }
    return String(value);
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return stringifyArray(value);
  }
  return stringifyObject(value);
}
