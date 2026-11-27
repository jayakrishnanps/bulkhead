import { isRecord } from "./guards";
import type { LintWarning } from "./level-types";
import type { Condition, Matcher, Policy, Rule } from "./types";

const CATCH_ALL_PATTERNS = new Set(["**", "*", "**/*"]);

function canonical(value: unknown): string {
  if (Array.isArray(value)) {
    return "[" + value.map((item) => canonical(item)).join(",") + "]";
  }
  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    const parts: string[] = [];
    for (const key of keys) {
      const entry = value[key];
      if (entry !== undefined) {
        parts.push(JSON.stringify(key) + ":" + canonical(entry));
      }
    }
    return "{" + parts.join(",") + "}";
  }
  return JSON.stringify(value) ?? "null";
}

function canonicalCondition(condition: Condition | undefined): string {
  if (condition === undefined) {
    return "undefined";
  }
  return canonical(condition);
}

function ruleSignature(rule: Rule): string {
  return canonicalCondition(rule.when) + "|" + canonicalCondition(rule.unless);
}

function checkDefaults(policy: Policy): LintWarning[] {
  const warnings: LintWarning[] = [];
  if (policy.default === "allow") {
    const hasStop = policy.rules.some(
      (rule) => rule.do === "deny" || rule.do === "ask",
    );
    if (hasStop === false) {
      warnings.push({
        rule: null,
        message: "The policy allows everything: it has no deny or ask rule.",
      });
    }
  }
  if (policy.default === "deny") {
    const hasAllow = policy.rules.some((rule) => rule.do === "allow");
    if (hasAllow === false) {
      warnings.push({
        rule: null,
        message: "The policy denies everything: it has no allow rule.",
      });
    }
  }
  return warnings;
}

function checkEmptyRules(rules: Rule[]): LintWarning[] {
  const warnings: LintWarning[] = [];
  for (const rule of rules) {
    if (Object.keys(rule.when).length === 0 && rule.unless === undefined) {
      warnings.push({
        rule: rule.name,
        message: "Matches every call.",
      });
    }
  }
  return warnings;
}

function collectMatcherPatterns(matcher: Matcher): string[] {
  const patterns: string[] = [];
  const targets = [matcher.glob, matcher.iglob, matcher.resolved_glob];
  for (const target of targets) {
    if (target === undefined) {
      continue;
    }
    if (Array.isArray(target)) {
      for (const item of target) {
        patterns.push(item);
      }
    } else {
      patterns.push(target);
    }
  }
  return patterns;
}

function collectConditionMatchers(
  condition: Condition | undefined,
): Matcher[] {
  if (condition === undefined) {
    return [];
  }
  const matchers: Matcher[] = [];
  if (condition.args !== undefined) {
    for (const matcher of Object.values(condition.args)) {
      matchers.push(matcher);
    }
  }
  if (condition.any_arg !== undefined) {
    matchers.push(condition.any_arg);
  }
  return matchers;
}

function checkCatchAllPatterns(rules: Rule[]): LintWarning[] {
  const warnings: LintWarning[] = [];
  for (const rule of rules) {
    const matchers = [
      ...collectConditionMatchers(rule.when),
      ...collectConditionMatchers(rule.unless),
    ];
    for (const matcher of matchers) {
      for (const pattern of collectMatcherPatterns(matcher)) {
        if (CATCH_ALL_PATTERNS.has(pattern)) {
          warnings.push({
            rule: rule.name,
            message: 'The pattern "' + pattern + '" matches every path.',
          });
        }
      }
    }
  }
  return warnings;
}

function checkShadowedAllows(rules: Rule[]): LintWarning[] {
  const warnings: LintWarning[] = [];
  const denyRules = rules.filter((rule) => rule.do === "deny");
  for (const rule of rules) {
    if (rule.do !== "allow") {
      continue;
    }
    const sig = ruleSignature(rule);
    const matchingDeny = denyRules.find(
      (denyRule) => ruleSignature(denyRule) === sig,
    );
    if (matchingDeny !== undefined) {
      warnings.push({
        rule: rule.name,
        message:
          'Never takes effect: deny rule "' +
          matchingDeny.name +
          '" covers the same calls.',
      });
    }
  }
  return warnings;
}

function checkDuplicateRules(rules: Rule[]): LintWarning[] {
  const warnings: LintWarning[] = [];
  for (let i = 0; i < rules.length; i += 1) {
    const current = rules[i];
    if (current === undefined) {
      continue;
    }
    const sig = ruleSignature(current);
    for (let j = 0; j < i; j += 1) {
      const earlier = rules[j];
      if (
        earlier !== undefined &&
        earlier.do === current.do &&
        ruleSignature(earlier) === sig
      ) {
        warnings.push({
          rule: current.name,
          message: 'Repeats rule "' + earlier.name + '".',
        });
        break;
      }
    }
  }
  return warnings;
}

export function lintPolicy(policy: Policy): LintWarning[] {
  return [
    ...checkDefaults(policy),
    ...checkEmptyRules(policy.rules),
    ...checkCatchAllPatterns(policy.rules),
    ...checkShadowedAllows(policy.rules),
    ...checkDuplicateRules(policy.rules),
  ];
}

export function findUnusedRules(
  policy: Policy,
  hits: string[],
): LintWarning[] {
  const hitSet = new Set(hits);
  const warnings: LintWarning[] = [];
  for (const rule of policy.rules) {
    if (hitSet.has(rule.name) === false) {
      warnings.push({
        rule: rule.name,
        message: "Never applied in any test.",
      });
    }
  }
  return warnings;
}
