import type { BenignResult, BenignTask, Level } from "./level-types";
import { createProvenance } from "./provenance";
import { runSteps } from "./run-steps";
import type { RunResult } from "./run-steps";
import type { Policy } from "./types";
import type { WorldPort } from "./world-types";

export type BenignRun = {
  results: BenignResult[];
  ruleHits: string[];
};

function evaluateTaskRun(
  task: BenignTask,
  run: RunResult,
  maxAsks: number,
): BenignResult {
  const blocked = run.events.find((event) => event.executed === false);
  const tooManyAsks = run.asks > maxAsks;
  const completed = blocked === undefined && tooManyAsks === false;
  const blockedStep = blocked !== undefined ? blocked.index : null;
  let reason: string | null = null;
  if (blocked !== undefined) {
    reason = blocked.reason;
  } else if (tooManyAsks) {
    reason = "Too many questions (" + run.asks + ")";
  }
  return {
    taskId: task.id,
    title: task.title,
    completed,
    asks: run.asks,
    blockedStep,
    reason,
  };
}

function collectRuleHits(
  run: RunResult,
  seen: Set<string>,
  ruleHits: string[],
): void {
  for (const event of run.events) {
    for (const name of event.ruleNames) {
      if (seen.has(name) === false) {
        seen.add(name);
        ruleHits.push(name);
      }
    }
  }
}

export async function runBenignDetailed(options: {
  level: Level;
  policy: Policy;
  world: WorldPort;
}): Promise<BenignRun> {
  const results: BenignResult[] = [];
  const seen = new Set<string>();
  const ruleHits: string[] = [];
  for (const task of options.level.benign) {
    await options.world.reset();
    const provenance = createProvenance();
    const run = await runSteps(
      {
        world: options.world,
        policy: options.policy,
        tools: options.level.tools,
        provenance,
        mode: "benign",
      },
      task.steps,
    );
    collectRuleHits(run, seen, ruleHits);
    results.push(evaluateTaskRun(task, run, options.level.maxAsksPerTask));
  }
  return { results, ruleHits };
}

export async function runBenign(options: {
  level: Level;
  policy: Policy;
  world: WorldPort;
}): Promise<BenignResult[]> {
  const detailed = await runBenignDetailed(options);
  return detailed.results;
}
