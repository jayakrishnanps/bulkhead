import { MAX_ASKS_PER_NORMAL_TRACE } from "./constants";
import { decideCall } from "./decide";
import { labelsForDelivery } from "./labels";
import {
  addLabels,
  createSession,
  registerCall,
  registerToolUpdate,
} from "./session";
import type {
  CallStep,
  Level,
  Rule,
  SessionState,
  StepOutcome,
  Trace,
  TraceKind,
  TraceVerdict,
  UpdateToolStep,
} from "./types";

type CallStepResult = {
  outcome: StepOutcome;
  askAdded: boolean;
};

function runUpdateStep(
  step: UpdateToolStep,
  index: number,
  session: SessionState,
): StepOutcome {
  registerToolUpdate(session, step.tool, step.description);
  return {
    index,
    tool: step.tool,
    action: "update",
    ruleName: null,
    reason: "Tool description changed",
    blocked: false,
    asked: false,
    labels: [...session.labels],
  };
}

function runCallStep(
  step: CallStep,
  index: number,
  level: Level,
  rules: Rule[],
  session: SessionState,
): CallStepResult {
  const tool = level.tools.find((item) => item.name === step.tool);
  if (tool === undefined) {
    return {
      outcome: {
        index,
        tool: step.tool,
        action: "deny",
        ruleName: null,
        reason: "Unknown tool",
        blocked: true,
        asked: false,
        labels: [...session.labels],
      },
      askAdded: false,
    };
  }

  const repeatCount = registerCall(session, step.tool, step.args);
  const decision = decideCall(rules, {
    tool,
    args: step.args,
    session,
    home: level.world.home,
    repeatCount,
  });

  const asked = decision.action === "ask";
  const isHarmful = step.harm === true;
  const blocked = decision.action === "deny" || (asked && isHarmful);
  const askAdded = asked && isHarmful === false;

  if (blocked === false) {
    const deliveryLabels = labelsForDelivery({
      tool,
      args: step.args,
      result: step.result,
      sensitivePaths: level.sensitivePaths,
      home: level.world.home,
    });
    addLabels(session, deliveryLabels);
  }

  return {
    outcome: {
      index,
      tool: step.tool,
      action: decision.action,
      ruleName: decision.ruleName,
      reason: decision.reason,
      blocked,
      asked,
      labels: [...session.labels],
    },
    askAdded,
  };
}

function buildAttackVerdict(
  trace: Trace,
  outcomes: StepOutcome[],
  asks: number,
): TraceVerdict {
  let passed = false;
  for (let index = 0; index < trace.steps.length; index++) {
    const step = trace.steps[index];
    const outcome = outcomes[index];
    if (step === undefined || outcome === undefined) {
      continue;
    }
    if (step.kind === "call" && step.harm === true && outcome.blocked) {
      passed = true;
      break;
    }
  }

  const failure = passed === true
    ? null
    : "Nothing in the attack was blocked.";

  return {
    traceId: trace.id,
    kind: "attack",
    passed,
    asks,
    failure,
    outcomes,
  };
}

function buildNormalVerdict(
  trace: Trace,
  outcomes: StepOutcome[],
  asks: number,
): TraceVerdict {
  let failure: string | null = null;
  for (let index = 0; index < trace.steps.length; index++) {
    const step = trace.steps[index];
    const outcome = outcomes[index];
    if (step === undefined || outcome === undefined) {
      continue;
    }
    if (step.kind === "call" && step.needed === true && outcome.blocked) {
      failure = `Step ${index + 1} (${step.tool}) was blocked: ${outcome.reason}`;
      break;
    }
  }

  if (failure === null && asks > MAX_ASKS_PER_NORMAL_TRACE) {
    failure = `Too many questions (${asks})`;
  }

  return {
    traceId: trace.id,
    kind: "normal",
    passed: failure === null,
    asks,
    failure,
    outcomes,
  };
}

export function runTrace(
  level: Level,
  rules: Rule[],
  trace: Trace,
  kind: TraceKind,
): TraceVerdict {
  const session = createSession(level.tools);
  const outcomes: StepOutcome[] = [];
  let asks = 0;

  for (let index = 0; index < trace.steps.length; index++) {
    const step = trace.steps[index];
    if (step === undefined) {
      continue;
    }
    if (step.kind === "update_tool") {
      const outcome = runUpdateStep(step, index, session);
      outcomes.push(outcome);
    } else {
      const stepResult = runCallStep(step, index, level, rules, session);
      outcomes.push(stepResult.outcome);
      if (stepResult.askAdded) {
        asks += 1;
      }
    }
  }

  if (kind === "attack") {
    return buildAttackVerdict(trace, outcomes, asks);
  }

  return buildNormalVerdict(trace, outcomes, asks);
}
