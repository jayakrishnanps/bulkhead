import { MATCHER_KEYS } from "./constants";
import {
  isLabelList,
  isNonEmptyString,
  isNonEmptyStringList,
  isRecord,
  isWholeNumber,
} from "./guards";
import type { Matcher } from "./types";

function isMatcherKey(key: string): key is (typeof MATCHER_KEYS)[number] {
  for (const item of MATCHER_KEYS) {
    if (key === item) {
      return true;
    }
  }
  return false;
}

function parseStringMatcher(
  key: string,
  value: unknown,
): Matcher | null {
  if (
    isNonEmptyString(value) === false &&
    isNonEmptyStringList(value) === false
  ) {
    return null;
  }
  if (key === "glob") {
    return { glob: value };
  }
  if (key === "iglob") {
    return { iglob: value };
  }
  if (key === "resolved_glob") {
    return { resolved_glob: value };
  }
  if (key === "equals") {
    return { equals: value };
  }
  if (key === "contains") {
    return { contains: value };
  }
  return null;
}

function parseDomainMatcher(
  key: string,
  value: unknown,
): Matcher | null {
  if (isNonEmptyStringList(value) === false) {
    return null;
  }
  if (key === "domain_in") {
    return { domain_in: value };
  }
  if (key === "domain_not_in") {
    return { domain_not_in: value };
  }
  return null;
}

export function parseMatcher(
  value: unknown,
  where: string,
  errors: string[],
): Matcher | null {
  if (isRecord(value) === false) {
    errors.push(where + ": a matcher needs exactly one key");
    return null;
  }
  const keys = Object.keys(value);
  if (keys.length !== 1) {
    errors.push(where + ": a matcher needs exactly one key");
    return null;
  }
  const key = keys[0];
  if (key === undefined) {
    errors.push(where + ": a matcher needs exactly one key");
    return null;
  }
  if (isMatcherKey(key) === false) {
    errors.push(where + ': unknown matcher "' + key + '"');
    return null;
  }

  const rawValue = value[key];

  if (
    key === "glob" ||
    key === "iglob" ||
    key === "resolved_glob" ||
    key === "equals" ||
    key === "contains"
  ) {
    const matcher = parseStringMatcher(key, rawValue);
    if (matcher === null) {
      errors.push(where + ": " + key + " has a bad value");
      return null;
    }
    return matcher;
  }

  if (key === "domain_in" || key === "domain_not_in") {
    const matcher = parseDomainMatcher(key, rawValue);
    if (matcher === null) {
      errors.push(where + ": " + key + " has a bad value");
      return null;
    }
    return matcher;
  }

  if (key === "longer_than") {
    if (isWholeNumber(rawValue, 0) === false) {
      errors.push(where + ": " + key + " has a bad value");
      return null;
    }
    return { longer_than: rawValue };
  }

  if (key === "carries") {
    if (isLabelList(rawValue) === false) {
      errors.push(where + ": " + key + " has a bad value");
      return null;
    }
    return { carries: rawValue };
  }

  return null;
}
