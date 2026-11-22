import type { JsonValue } from "./types";

const PLACEHOLDER_RE = /\{\{r(\d+)((?:\|[^}|]*)*)\}\}/g;

type Transform = (text: string, ...args: string[]) => string;

const TRANSFORMS = new Map<string, Transform>([
  [
    "base64",
    (text) => {
      const bytes = new TextEncoder().encode(text);
      let binary = "";
      for (const byte of bytes) {
        binary += String.fromCharCode(byte);
      }
      return btoa(binary);
    },
  ],
  [
    "base64url",
    (text) => {
      const bytes = new TextEncoder().encode(text);
      let binary = "";
      for (const byte of bytes) {
        binary += String.fromCharCode(byte);
      }
      return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    },
  ],
  [
    "hex",
    (text) => {
      const bytes = new TextEncoder().encode(text);
      let result = "";
      for (const byte of bytes) {
        result += byte.toString(16).padStart(2, "0");
      }
      return result;
    },
  ],
  ["urlenc", (text) => encodeURIComponent(text)],
  [
    "slice",
    (text, startStr, lengthStr) => {
      const start = parseInt(startStr, 10);
      const length = parseInt(lengthStr, 10);
      return text.slice(start, start + length);
    },
  ],
  ["upper", (text) => text.toUpperCase()],
]);

function applyTransform(text: string, part: string): string {
  const colonIndex = part.indexOf(":");
  if (colonIndex === -1) {
    const fn = TRANSFORMS.get(part);
    if (fn === undefined) {
      return text;
    }
    return fn(text);
  }
  const name = part.slice(0, colonIndex);
  const rest = part.slice(colonIndex + 1);
  const args = rest.split(":");
  const fn = TRANSFORMS.get(name);
  if (fn === undefined) {
    return text;
  }
  return fn(text, ...args);
}

function applyTransforms(text: string, transformStr: string): string {
  if (transformStr === "") {
    return text;
  }
  const parts = transformStr.slice(1).split("|");
  let result = text;
  for (const part of parts) {
    result = applyTransform(result, part);
  }
  return result;
}

export function expandTemplate(template: string, results: string[]): string {
  return template.replace(PLACEHOLDER_RE, (_match, indexStr, transformStr) => {
    const index = parseInt(indexStr, 10);
    const base = results[index] ?? "";
    return applyTransforms(base, transformStr);
  });
}

export function expandValue(value: JsonValue, results: string[]): JsonValue {
  if (typeof value === "string") {
    return expandTemplate(value, results);
  }
  if (Array.isArray(value)) {
    return value.map((item) => expandValue(item, results));
  }
  if (value !== null && typeof value === "object") {
    const result: { [key: string]: JsonValue } = {};
    for (const key of Object.keys(value)) {
      const child = value[key];
      if (child !== undefined) {
        result[key] = expandValue(child, results);
      }
    }
    return result;
  }
  return value;
}
