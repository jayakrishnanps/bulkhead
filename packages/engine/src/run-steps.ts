import { FATIGUE_AFTER_ASKS, LABELS } from "./constants";
import { decidePolicy } from "./decide";
import { collectStrings } from "./args";
import { expandArgs } from "./templates";
import { carriedLabels, registerValue } from "./provenance";
import type { Provenance } from "./provenance";
import type { Action, JsonValue, Label, MatchContext, Policy } from "./types";
import type { CallTemplate, ToolDef, WorldPort } from "./world-types";
import type { StepEvent } from "./level-types";

export type RunMode = "attack" | "benign";

export type RunContext = {
  world: WorldPort;
  policy: Policy;
  tools: ToolDef[];
  provenance: Provenance;
  mode: RunMode;
};

export type RunResult = {
  events: StepEvent[];
  asks: number;
  results: string[];
};

type StepState = {
  results: string[];
  events: StepEvent[];
  asks: number;
  executedByTool: Record<string, number>;
  sessionLabels: Label[];
};

function buildMatchContext(
  world: WorldPort,
  provenance: Provenance,
): MatchContext {
  return {
    home: world.root,
    caseInsensitive: world.caseInsensitive,
    resolvePath: (path: string) => world.resolvePath(path),
    carriedLabels: (text: string) => carriedLabels(provenance, text),
  };
}

function computeCarried(
  args: Record<string, JsonValue>,
  provenance: Provenance,
): string[] {
  const found = new Set<Label>();
  for (const value of Object.values(args)) {
    const texts = collectStrings(value);
    for (const text of texts) {
      const labels = carriedLabels(provenance, text);
      for (const label of labels) {
        found.add(label);
      }
    }
  }
  const result: string[] = [];
  for (const label of LABELS) {
    if (found.has(label)) {
      result.push(label);
    }
  }
  return result;
}

function evaluateHumanApproval(
  action: Action,
  mode: RunMode,
  asks: number,
): { allowed: boolean; asks: number } {
  if (action === "allow") {
    return { allowed: true, asks };
  }
  if (action === "deny") {
    return { allowed: false, asks };
  }
  const priorAsks = asks;
  const newAsks = asks + 1;
  const allowed = mode === "benign" || priorAsks >= FATIGUE_AFTER_ASKS;
  return { allowed, asks: newAsks };
}

async function runSingleStep(
  context: RunContext,
  step: CallTemplate,
  index: number,
  state: StepState,
  match: MatchContext,
): Promise<void> {
  const args = expandArgs(step.args, state.results);
  const tool = context.tools.find((item) => item.name === step.tool);
  if (tool === undefined) {
    state.events.push({
      index,
      tool: step.tool,
      args,
      action: "deny",
      ruleNames: [],
      reason: "Unknown tool",
      executed: false,
      carried: [],
      resultLabels: [],
    });
    state.results.push("");
    return;
  }

  const carried = computeCarried(args, context.provenance);
  const executedCalls = state.executedByTool[tool.name] ?? 0;
  const decision = decidePolicy(context.policy, {
    tool,
    args,
    executedCalls,
    changedTools: context.world.changedTools(),
    sessionLabels: state.sessionLabels,
    match,
  });

  const approval = evaluateHumanApproval(
    decision.action,
    context.mode,
    state.asks,
  );
  state.asks = approval.asks;

  if (approval.allowed === false) {
    state.results.push("");
    state.events.push({
      index,
      tool: tool.name,
      args,
      action: decision.action,
      ruleNames: decision.ruleNames,
      reason: decision.reason,
      executed: false,
      carried,
      resultLabels: [],
    });
    return;
  }

  const result = await context.world.execute({ tool: tool.name, args });
  state.results.push(result.text);
  registerValue(context.provenance, result.text, result.labels);
  state.executedByTool[tool.name] = executedCalls + 1;
  for (const label of result.labels) {
    if (state.sessionLabels.includes(label) === false) {
      state.sessionLabels.push(label);
    }
  }
  state.events.push({
    index,
    tool: tool.name,
    args,
    action: decision.action,
    ruleNames: decision.ruleNames,
    reason: decision.reason,
    executed: true,
    carried,
    resultLabels: result.labels,
  });
}

export async function runSteps(
  context: RunContext,
  steps: CallTemplate[],
): Promise<RunResult> {
  const match = buildMatchContext(context.world, context.provenance);
  const state: StepState = {
    results: [],
    events: [],
    asks: 0,
    executedByTool: {},
    sessionLabels: [],
  };

  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    if (step !== undefined) {
      await runSingleStep(context, step, i, state, match);
    }
  }

  return {
    events: state.events,
    asks: state.asks,
    results: state.results,
  };
}
