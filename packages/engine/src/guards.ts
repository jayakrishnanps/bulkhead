import { LABELS } from "./constants";
import type { Label } from "./types";

export function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray(value) === false
  );
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function isNonEmptyStringList(value: unknown): value is string[] {
  if (Array.isArray(value) === false || value.length === 0) {
    return false;
  }
  for (const item of value) {
    if (typeof item !== "string") {
      return false;
    }
  }
  return true;
}

export function isWholeNumber(
  value: unknown,
  minimum: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum
  );
}

function isLabel(value: unknown): value is Label {
  for (const label of LABELS) {
    if (value === label) {
      return true;
    }
  }
  return false;
}

export function isLabelList(value: unknown): value is Label[] {
  if (Array.isArray(value) === false || value.length === 0) {
    return false;
  }
  for (const item of value) {
    if (isLabel(item) === false) {
      return false;
    }
  }
  return true;
}
