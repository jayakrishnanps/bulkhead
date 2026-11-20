import { parseRules } from "./rules";
import { runTrace } from "./run-trace";
import { scoreRun } from "./score";
import type {
  EvaluationResult,
  Level,
  Rule,
  Trace,
  TraceVerdict,
} from "./types";

type HiddenTraces = {
  attack: Trace[];
  normal: Trace[];
};

function collectTraces(
  levelTraces: Trace[],
  hiddenTraces: Trace[] | undefined,
): Trace[] {
  if (hiddenTraces === undefined) {
    return [...levelTraces];
  }
  return [...levelTraces, ...hiddenTraces];
}

function runTraces(
  level: Level,
  rules: Rule[],
  traces: Trace[],
  kind: "attack" | "normal",
): TraceVerdict[] {
  const verdicts: TraceVerdict[] = [];
  for (const trace of traces) {
    verdicts.push(runTrace(level, rules, trace, kind));
  }
  return verdicts;
}

export function evaluateRules(
  level: Level,
  text: string,
  hidden?: HiddenTraces,
): EvaluationResult {
  const parseResult = parseRules(text);
  if (parseResult.ok === false) {
    return {
      ok: false,
      errors: parseResult.errors,
    };
  }

  const rules = parseResult.rules;
  const attackTraces = collectTraces(level.attack, hidden?.attack);
  const normalTraces = collectTraces(level.normal, hidden?.normal);

  const attackVerdicts = runTraces(level, rules, attackTraces, "attack");
  const normalVerdicts = runTraces(level, rules, normalTraces, "normal");

  const score = scoreRun(
    level,
    rules.length,
    attackVerdicts,
    normalVerdicts,
  );

  return {
    ok: true,
    ruleCount: rules.length,
    attack: attackVerdicts,
    normal: normalVerdicts,
    score,
  };
}
