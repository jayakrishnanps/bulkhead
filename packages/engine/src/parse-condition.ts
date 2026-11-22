import {
  ARG_KEY_PREFIX,
  CONDITION_KEYS,
  MAX_ARG_NAME_LENGTH,
} from "./constants";
import {
  isLabelList,
  isNonEmptyString,
  isRecord,
  isWholeNumber,
} from "./guards";
import { parseMatcher } from "./parse-matcher";
import type { Condition, Matcher } from "./types";

function isConditionKey(
  key: string,
): key is (typeof CONDITION_KEYS)[number] {
  for (const item of CONDITION_KEYS) {
    if (key === item) {
      return true;
    }
  }
  return false;
}

function parseConditionField(
  key: (typeof CONDITION_KEYS)[number],
  raw: unknown,
  where: string,
  errors: string[],
  result: Condition,
): void {
  if (key === "tool") {
    if (isNonEmptyString(raw)) {
      result.tool = raw;
    } else {
      errors.push(where + ": " + key + " has a bad value");
    }
    return;
  }
  if (key === "tool_tag") {
    if (isNonEmptyString(raw)) {
      result.tool_tag = raw;
    } else {
      errors.push(where + ": " + key + " has a bad value");
    }
    return;
  }
  if (key === "tool_changed") {
    if (typeof raw === "boolean") {
      result.tool_changed = raw;
    } else {
      errors.push(where + ": " + key + " has a bad value");
    }
    return;
  }
  if (key === "max_calls") {
    if (isWholeNumber(raw, 1)) {
      result.max_calls = raw;
    } else {
      errors.push(where + ": " + key + " has a bad value");
    }
    return;
  }
  if (key === "session_has") {
    if (isLabelList(raw)) {
      result.session_has = raw;
    } else {
      errors.push(where + ": " + key + " has a bad value");
    }
    return;
  }
  if (key === "any_arg") {
    const matcher = parseMatcher(raw, where + " any_arg", errors);
    if (matcher !== null) {
      result.any_arg = matcher;
    }
  }
}

function parseArgField(
  key: string,
  raw: unknown,
  where: string,
  errors: string[],
  argsMap: Record<string, Matcher>,
): void {
  const name = key.slice(ARG_KEY_PREFIX.length);
  if (name.length < 1 || name.length > MAX_ARG_NAME_LENGTH) {
    errors.push(where + ': bad argument name "' + key + '"');
    return;
  }
  const matcher = parseMatcher(raw, where + " " + key, errors);
  if (matcher !== null) {
    argsMap[name] = matcher;
  }
}

export function parseCondition(
  value: unknown,
  where: string,
  errors: string[],
): Condition | null {
  if (value === undefined || value === null) {
    return {};
  }
  if (isRecord(value) === false) {
    errors.push(where + ": must be a mapping");
    return null;
  }

  const initialErrors = errors.length;
  const result: Condition = {};
  const argsMap: Record<string, Matcher> = {};
  let hasArgs = false;

  for (const [key, raw] of Object.entries(value)) {
    if (key.startsWith(ARG_KEY_PREFIX)) {
      parseArgField(key, raw, where, errors, argsMap);
      hasArgs = true;
      continue;
    }
    if (isConditionKey(key)) {
      parseConditionField(key, raw, where, errors, result);
      continue;
    }
    errors.push(where + ': unknown key "' + key + '"');
  }

  if (hasArgs && Object.keys(argsMap).length > 0) {
    result.args = argsMap;
  }

  if (errors.length > initialErrors) {
    return null;
  }

  return result;
}
