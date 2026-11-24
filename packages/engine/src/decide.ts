import { matchGlob } from "./glob";
import { matchValue } from "./matchers";
import type {
  Action,
  Condition,
  Decision,
  JsonValue,
  Label,
  MatchContext,
  Policy,
  Rule,
} from "./types";
import type { ToolDef } from "./world-types";

export type DecideInput = {
  tool: ToolDef;
  args: Record<string, JsonValue>;
  executedCalls: number;
  changedTools: string[];
  sessionLabels: Label[];
  match: MatchContext;
};

function matchesCondition(
  condition: Condition,
  input: DecideInput,
): boolean {
  if (
    condition.tool !== undefined &&
    !matchGlob(condition.tool, input.tool.name, false)
  ) {
    return false;
  }
  if (
    condition.tool_tag !== undefined &&
    !input.tool.tags.includes(condition.tool_tag)
  ) {
    return false;
  }
  if (condition.args !== undefined) {
    for (const [key, matcher] of Object.entries(condition.args)) {
      const value = input.args[key];
      if (value === undefined || !matchValue(matcher, value, input.match)) {
        return false;
      }
    }
  }
  if (condition.any_arg !== undefined) {
    let matched = false;
    for (const value of Object.values(input.args)) {
      if (matchValue(condition.any_arg, value, input.match)) {
        matched = true;
        break;
      }
    }
    if (!matched) {
      return false;
    }
  }
  if (
    condition.tool_changed !== undefined &&
    input.changedTools.includes(input.tool.name) !== condition.tool_changed
  ) {
    return false;
  }
  if (
    condition.max_calls !== undefined &&
    input.executedCalls < condition.max_calls
  ) {
    return false;
  }
  if (condition.session_has !== undefined) {
    for (const label of condition.session_has) {
      if (!input.sessionLabels.includes(label)) {
        return false;
      }
    }
  }
  return true;
}

function ruleApplies(rule: Rule, input: DecideInput): boolean {
  if (!matchesCondition(rule.when, input)) {
    return false;
  }
  if (rule.unless !== undefined && matchesCondition(rule.unless, input)) {
    return false;
  }
  return true;
}

function createRuleDecision(
  action: Action,
  matchingRules: Rule[],
): Decision {
  const ruleNames = matchingRules.map((rule) => rule.name);
  const firstRule = matchingRules[0];
  if (firstRule === undefined) {
    return {
      action,
      ruleNames,
      reason: "",
    };
  }
  const reason =
    firstRule.say !== undefined
      ? firstRule.say
      : 'Rule "' + firstRule.name + '" matched';
  return {
    action,
    ruleNames,
    reason,
  };
}

export function decidePolicy(
  policy: Policy,
  input: DecideInput,
): Decision {
  const appliedRules: Rule[] = [];
  for (const rule of policy.rules) {
    if (ruleApplies(rule, input)) {
      appliedRules.push(rule);
    }
  }

  const denyRules = appliedRules.filter((rule) => rule.do === "deny");
  if (denyRules.length > 0) {
    return createRuleDecision("deny", denyRules);
  }

  const askRules = appliedRules.filter((rule) => rule.do === "ask");
  if (askRules.length > 0) {
    return createRuleDecision("ask", askRules);
  }

  const allowRules = appliedRules.filter((rule) => rule.do === "allow");
  if (allowRules.length > 0) {
    return createRuleDecision("allow", allowRules);
  }

  return {
    action: policy.default,
    ruleNames: [],
    reason: "Default: " + policy.default,
  };
}
