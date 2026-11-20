import { parse } from "yaml";
import {
  ACTIONS,
  ARG_KEY_PREFIX,
  CONDITION_KEYS,
  LABELS,
  MATCHER_KEYS,
  MAX_ARG_NAME_LENGTH,
  MAX_ERRORS,
  MAX_RULES,
  MAX_RULES_TEXT_LENGTH,
  MAX_RULE_NAME_LENGTH,
  MAX_SAY_LENGTH,
} from "./constants";
import type { Action, Condition, Label, Matcher, ParseResult, Rule } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && Array.isArray(value) === false;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  if (Array.isArray(value) === false || value.length === 0) {
    return false;
  }
  for (const item of value) {
    if (isNonEmptyString(item) === false) {
      return false;
    }
  }
  return true;
}

function isStringOrStringArray(value: unknown): value is string | string[] {
  return isNonEmptyString(value) || isNonEmptyStringArray(value);
}

function isAction(value: unknown): value is Action {
  return ACTIONS.some((action) => action === value);
}

function isLabelArray(value: unknown): value is Label[] {
  if (Array.isArray(value) === false || value.length === 0) {
    return false;
  }
  for (const item of value) {
    const isKnown = LABELS.some((label) => label === item);
    if (isKnown === false) {
      return false;
    }
  }
  return true;
}

function addError(errors: string[], message: string): void {
  if (errors.length < MAX_ERRORS) {
    errors.push(message);
  }
}

function validateMatcher(
  prefix: string,
  argName: string,
  rawMatcher: unknown,
  errors: string[],
): Matcher | undefined {
  if (isRecord(rawMatcher) === false) {
    addError(
      errors,
      `${prefix} Matcher for argument "${argName}" must be an object.`,
    );
    return undefined;
  }
  const keys = Object.keys(rawMatcher);
  if (keys.length !== 1) {
    addError(
      errors,
      `${prefix} Matcher for argument "${argName}" must have exactly one key.`,
    );
    return undefined;
  }
  const matcherKey = keys[0];
  if (matcherKey === undefined) {
    return undefined;
  }
  const isAllowedKey = MATCHER_KEYS.some((key) => key === matcherKey);
  if (isAllowedKey === false) {
    addError(errors, `${prefix} Unknown matcher key "${matcherKey}".`);
    return undefined;
  }
  const rawValue = rawMatcher[matcherKey];

  if (matcherKey === "glob") {
    if (isStringOrStringArray(rawValue) === false) {
      addError(errors, `${prefix} Invalid value for "glob".`);
      return undefined;
    }
    return { glob: rawValue };
  }
  if (matcherKey === "iglob") {
    if (isStringOrStringArray(rawValue) === false) {
      addError(errors, `${prefix} Invalid value for "iglob".`);
      return undefined;
    }
    return { iglob: rawValue };
  }
  if (matcherKey === "equals") {
    if (isStringOrStringArray(rawValue) === false) {
      addError(errors, `${prefix} Invalid value for "equals".`);
      return undefined;
    }
    return { equals: rawValue };
  }
  if (matcherKey === "contains") {
    if (isStringOrStringArray(rawValue) === false) {
      addError(errors, `${prefix} Invalid value for "contains".`);
      return undefined;
    }
    return { contains: rawValue };
  }
  if (matcherKey === "domain_in") {
    if (isNonEmptyStringArray(rawValue) === false) {
      addError(errors, `${prefix} Invalid value for "domain_in".`);
      return undefined;
    }
    return { domain_in: rawValue };
  }
  if (matcherKey === "domain_not_in") {
    if (isNonEmptyStringArray(rawValue) === false) {
      addError(errors, `${prefix} Invalid value for "domain_not_in".`);
      return undefined;
    }
    return { domain_not_in: rawValue };
  }
  if (matcherKey === "longer_than") {
    if (
      typeof rawValue !== "number" ||
      Number.isInteger(rawValue) === false ||
      rawValue < 0
    ) {
      addError(errors, `${prefix} Invalid value for "longer_than".`);
      return undefined;
    }
    return { longer_than: rawValue };
  }
  return undefined;
}

function isAllowedConditionKey(key: string): boolean {
  if (key.startsWith(ARG_KEY_PREFIX)) {
    return true;
  }
  return CONDITION_KEYS.some((conditionKey) => conditionKey === key);
}

function validateCondition(
  prefix: string,
  rawWhen: Record<string, unknown>,
  errors: string[],
): Condition {
  for (const key of Object.keys(rawWhen)) {
    if (isAllowedConditionKey(key) === false) {
      addError(errors, `${prefix} Unknown condition key "${key}".`);
    }
  }

  const condition: Condition = {};

  if (rawWhen.tool !== undefined) {
    if (isNonEmptyString(rawWhen.tool) === false) {
      addError(errors, `${prefix} tool must be a non-empty string.`);
    } else {
      condition.tool = rawWhen.tool;
    }
  }

  if (rawWhen.tool_tag !== undefined) {
    if (isNonEmptyString(rawWhen.tool_tag) === false) {
      addError(errors, `${prefix} tool_tag must be a non-empty string.`);
    } else {
      condition.tool_tag = rawWhen.tool_tag;
    }
  }

  if (rawWhen.session_has !== undefined) {
    if (isLabelArray(rawWhen.session_has) === false) {
      addError(errors, `${prefix} session_has must be a list of labels.`);
    } else {
      condition.session_has = rawWhen.session_has;
    }
  }

  if (rawWhen.tool_changed !== undefined) {
    if (typeof rawWhen.tool_changed !== "boolean") {
      addError(errors, `${prefix} tool_changed must be a boolean.`);
    } else {
      condition.tool_changed = rawWhen.tool_changed;
    }
  }

  if (rawWhen.repeated_over !== undefined) {
    if (
      typeof rawWhen.repeated_over !== "number" ||
      Number.isInteger(rawWhen.repeated_over) === false ||
      rawWhen.repeated_over < 1
    ) {
      addError(
        errors,
        `${prefix} repeated_over must be an integer of at least 1.`,
      );
    } else {
      condition.repeated_over = rawWhen.repeated_over;
    }
  }

  const argsRecord: Record<string, Matcher> = {};
  for (const key of Object.keys(rawWhen)) {
    if (key.startsWith(ARG_KEY_PREFIX)) {
      const argName = key.slice(ARG_KEY_PREFIX.length);
      if (argName.length < 1 || argName.length > MAX_ARG_NAME_LENGTH) {
        addError(
          errors,
          `${prefix} Argument name "${argName}" length must be valid.`,
        );
        continue;
      }
      const matcher = validateMatcher(prefix, argName, rawWhen[key], errors);
      if (matcher !== undefined) {
        argsRecord[argName] = matcher;
      }
    }
  }
  if (Object.keys(argsRecord).length > 0) {
    condition.args = argsRecord;
  }

  return condition;
}

const ALLOWED_RULE_KEYS = new Set(["name", "when", "do", "say"]);

function validateRule(
  ruleIndex: number,
  rawRule: unknown,
  ruleNames: Set<string>,
  errors: string[],
): Rule | undefined {
  const prefix = `Rule ${ruleIndex}:`;
  if (isRecord(rawRule) === false) {
    addError(errors, `${prefix} Rule must be an object.`);
    return undefined;
  }

  for (const key of Object.keys(rawRule)) {
    if (ALLOWED_RULE_KEYS.has(key) === false) {
      addError(errors, `${prefix} Unknown key "${key}".`);
    }
  }

  let ruleName: string | undefined = undefined;
  if (rawRule.name === undefined) {
    addError(errors, `${prefix} name is required.`);
  } else if (typeof rawRule.name !== "string" || rawRule.name.length === 0) {
    addError(errors, `${prefix} name must be a non-empty string.`);
  } else if (rawRule.name.length > MAX_RULE_NAME_LENGTH) {
    addError(
      errors,
      `${prefix} name must be at most ${MAX_RULE_NAME_LENGTH} characters.`,
    );
  } else if (ruleNames.has(rawRule.name)) {
    addError(errors, `${prefix} name must be unique.`);
  } else {
    ruleName = rawRule.name;
    ruleNames.add(ruleName);
  }

  let ruleDo: Action | undefined = undefined;
  if (rawRule.do === undefined) {
    addError(errors, `${prefix} do is required.`);
  } else if (isAction(rawRule.do) === false) {
    addError(errors, `${prefix} do must be one of allow, deny, ask.`);
  } else {
    ruleDo = rawRule.do;
  }

  let ruleSay: string | undefined = undefined;
  if (rawRule.say !== undefined) {
    if (
      typeof rawRule.say !== "string" ||
      rawRule.say.length > MAX_SAY_LENGTH
    ) {
      addError(
        errors,
        `${prefix} say must be a string of at most ${MAX_SAY_LENGTH} characters.`,
      );
    } else {
      ruleSay = rawRule.say;
    }
  }

  let ruleWhen: Condition = {};
  if (rawRule.when !== undefined) {
    if (isRecord(rawRule.when) === false) {
      addError(errors, `${prefix} when must be an object.`);
    } else {
      ruleWhen = validateCondition(prefix, rawRule.when, errors);
    }
  }

  if (ruleName === undefined || ruleDo === undefined) {
    return undefined;
  }
  if (ruleSay !== undefined) {
    return {
      name: ruleName,
      when: ruleWhen,
      do: ruleDo,
      say: ruleSay,
    };
  }
  return {
    name: ruleName,
    when: ruleWhen,
    do: ruleDo,
  };
}

export function parseRules(text: string): ParseResult {
  if (text.length > MAX_RULES_TEXT_LENGTH) {
    return {
      ok: false,
      errors: ["The rules are too long."],
    };
  }

  let parsed: unknown;
  try {
    parsed = parse(text, { maxAliasCount: 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return {
      ok: false,
      errors: [`Invalid YAML: ${message}`],
    };
  }

  if (parsed === null || parsed === undefined) {
    return {
      ok: true,
      rules: [],
    };
  }

  if (isRecord(parsed) === false || Array.isArray(parsed.rules) === false) {
    return {
      ok: false,
      errors: ["Write a list called rules."],
    };
  }

  if (parsed.rules.length > MAX_RULES) {
    return {
      ok: false,
      errors: ["Too many rules."],
    };
  }

  const errors: string[] = [];
  const ruleNames = new Set<string>();
  const rules: Rule[] = [];

  for (let i = 0; i < parsed.rules.length; i += 1) {
    if (errors.length >= MAX_ERRORS) {
      break;
    }
    const rule = validateRule(i + 1, parsed.rules[i], ruleNames, errors);
    if (rule !== undefined) {
      rules.push(rule);
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    rules,
  };
}
