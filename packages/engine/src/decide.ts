import { matchGlob } from "./glob";
import { matchValue } from "./matchers";
import { hasAllLabels, isToolChanged } from "./session";
import type {
  Condition,
  Decision,
  JsonValue,
  Matcher,
  Rule,
  SessionState,
  ToolDef,
} from "./types";

export type CallContext = {
  tool: ToolDef;
  args: Record<string, JsonValue>;
  session: SessionState;
  home: string;
  repeatCount: number;
};

function matchesArgs(
  conditionArgs: Record<string, Matcher>,
  callArgs: Record<string, JsonValue>,
  home: string,
): boolean {
  for (const argName of Object.keys(conditionArgs)) {
    const matcher = conditionArgs[argName];
    if (matcher === undefined) {
      continue;
    }
    const argValue = callArgs[argName];
    if (argValue === undefined) {
      return false;
    }
    if (matchValue(matcher, argValue, home) === false) {
      return false;
    }
  }
  return true;
}

function matchesCondition(
  condition: Condition,
  context: CallContext,
): boolean {
  if (condition.tool !== undefined) {
    if (matchGlob(condition.tool, context.tool.name, false) === false) {
      return false;
    }
  }

  if (condition.tool_tag !== undefined) {
    const hasTag = context.tool.tags.some(
      (tag) => tag === condition.tool_tag,
    );
    if (hasTag === false) {
      return false;
    }
  }

  if (condition.args !== undefined) {
    if (matchesArgs(condition.args, context.args, context.home) === false) {
      return false;
    }
  }

  if (condition.session_has !== undefined) {
    if (hasAllLabels(context.session, condition.session_has) === false) {
      return false;
    }
  }

  if (condition.tool_changed !== undefined) {
    const changed = isToolChanged(context.session, context.tool.name);
    if (changed !== condition.tool_changed) {
      return false;
    }
  }

  if (condition.repeated_over !== undefined) {
    if (context.repeatCount <= condition.repeated_over) {
      return false;
    }
  }

  return true;
}

export function decideCall(
  rules: Rule[],
  context: CallContext,
): Decision {
  for (const rule of rules) {
    if (matchesCondition(rule.when, context)) {
      const reason = rule.say !== undefined
        ? rule.say
        : `Rule "${rule.name}" matched`;
      return {
        action: rule.do,
        ruleName: rule.name,
        reason,
      };
    }
  }

  return {
    action: "allow",
    ruleName: null,
    reason: "No rule matched",
  };
}
