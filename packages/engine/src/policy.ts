import { parse } from "yaml";
import {
  ACTIONS,
  MAX_ERRORS,
  MAX_RULES,
  MAX_RULES_TEXT_LENGTH,
  MAX_RULE_NAME_LENGTH,
  MAX_SAY_LENGTH,
  POLICY_DEFAULTS,
  RULE_KEYS,
} from "./constants";
import { isRecord } from "./guards";
import { parseCondition } from "./parse-condition";
import type {
  Action,
  Condition,
  PolicyDefault,
  PolicyParseResult,
  Rule,
} from "./types";

function addError(errors: string[], message: string): void {
  if (errors.length < MAX_ERRORS) {
    errors.push(message);
  }
}

function isPolicyDefault(value: unknown): value is PolicyDefault {
  for (const item of POLICY_DEFAULTS) {
    if (value === item) {
      return true;
    }
  }
  return false;
}

function isAction(value: unknown): value is Action {
  for (const item of ACTIONS) {
    if (value === item) {
      return true;
    }
  }
  return false;
}

function isRuleKey(key: string): key is (typeof RULE_KEYS)[number] {
  for (const item of RULE_KEYS) {
    if (key === item) {
      return true;
    }
  }
  return false;
}

function parseRule(
  rawRule: unknown,
  n: number,
  names: Set<string>,
  errors: string[],
): Rule | null {
  if (isRecord(rawRule) === false) {
    addError(errors, "Rule " + n + ": must be a mapping");
    return null;
  }

  for (const key of Object.keys(rawRule)) {
    if (isRuleKey(key) === false) {
      addError(errors, "Rule " + n + ': unknown key "' + key + '"');
    }
  }

  let name: string | undefined;
  if (rawRule.name === undefined) {
    addError(errors, "Rule " + n + ": name is required");
  } else if (
    typeof rawRule.name !== "string" ||
    rawRule.name.length === 0
  ) {
    addError(errors, "Rule " + n + ": name must be a non-empty string");
  } else if (rawRule.name.length > MAX_RULE_NAME_LENGTH) {
    addError(
      errors,
      "Rule " + n + ": name must be at most " + MAX_RULE_NAME_LENGTH + " characters",
    );
  } else if (names.has(rawRule.name)) {
    addError(errors, "Rule " + n + ": name must be unique");
  } else {
    name = rawRule.name;
    names.add(name);
  }

  let ruleDo: Action | undefined;
  if (rawRule.do === undefined) {
    addError(errors, "Rule " + n + ": do is required");
  } else if (isAction(rawRule.do) === false) {
    addError(errors, "Rule " + n + ": do must be one of allow, deny, ask");
  } else {
    ruleDo = rawRule.do;
  }

  let say: string | undefined;
  if (rawRule.say !== undefined) {
    if (
      typeof rawRule.say !== "string" ||
      rawRule.say.length > MAX_SAY_LENGTH
    ) {
      addError(
        errors,
        "Rule " + n + ": say must be a string of at most " + MAX_SAY_LENGTH + " characters",
      );
    } else {
      say = rawRule.say;
    }
  }

  let when: Condition = {};
  if (rawRule.when !== undefined) {
    const cond = parseCondition(rawRule.when, "Rule " + n + " when", errors);
    if (cond !== null) {
      when = cond;
    }
  }

  let unless: Condition | undefined;
  if (rawRule.unless !== undefined) {
    const cond = parseCondition(
      rawRule.unless,
      "Rule " + n + " unless",
      errors,
    );
    if (cond !== null) {
      unless = cond;
    }
  }

  if (name === undefined || ruleDo === undefined) {
    return null;
  }

  const rule: Rule = {
    name,
    do: ruleDo,
    when,
  };
  if (unless !== undefined) {
    rule.unless = unless;
  }
  if (say !== undefined) {
    rule.say = say;
  }
  return rule;
}

export function parsePolicy(text: string): PolicyParseResult {
  if (text.length > MAX_RULES_TEXT_LENGTH) {
    return {
      ok: false,
      errors: ["The policy is too long."],
    };
  }

  let parsed: unknown;
  try {
    parsed = parse(text, { maxAliasCount: 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return {
      ok: false,
      errors: ["Invalid YAML: " + message],
    };
  }

  if (parsed === null || parsed === undefined) {
    return {
      ok: true,
      policy: {
        default: "allow",
        rules: [],
      },
    };
  }

  if (isRecord(parsed) === false) {
    return {
      ok: false,
      errors: ["The policy must be a mapping."],
    };
  }

  const errors: string[] = [];

  for (const key of Object.keys(parsed)) {
    if (key !== "default" && key !== "rules") {
      addError(errors, 'unknown key "' + key + '"');
    }
  }

  let policyDefault: PolicyDefault = "allow";
  if (parsed.default !== undefined) {
    if (isPolicyDefault(parsed.default)) {
      policyDefault = parsed.default;
    } else {
      addError(errors, "default must be allow or deny");
    }
  }

  let rawRules: unknown[] = [];
  if (parsed.rules !== undefined) {
    if (Array.isArray(parsed.rules) === false) {
      addError(errors, "rules must be a list");
      return {
        ok: false,
        errors: errors.slice(0, MAX_ERRORS),
      };
    }
    if (parsed.rules.length > MAX_RULES) {
      addError(errors, "Too many rules.");
      return {
        ok: false,
        errors: errors.slice(0, MAX_ERRORS),
      };
    }
    rawRules = parsed.rules;
  }

  const names = new Set<string>();
  const rules: Rule[] = [];
  for (let i = 0; i < rawRules.length; i++) {
    if (errors.length >= MAX_ERRORS) {
      break;
    }
    const rule = parseRule(rawRules[i], i + 1, names, errors);
    if (rule !== null) {
      rules.push(rule);
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors: errors.slice(0, MAX_ERRORS),
    };
  }

  return {
    ok: true,
    policy: {
      default: policyDefault,
      rules,
    },
  };
}
