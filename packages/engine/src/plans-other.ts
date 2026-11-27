import { pathForms } from "./forms";
import type { AttackPlan, BenignTask, Level } from "./level-types";
import { readMoves } from "./moves-read";
import type { CallTemplate } from "./world-types";

const DRIFT_COST_OFFSET = 4;

function findBenignStep(
  benign: BenignTask[],
  toolName?: string,
): CallTemplate | null {
  for (const task of benign) {
    for (const step of task.steps) {
      if (toolName === undefined || step.tool === toolName) {
        return step;
      }
    }
  }
  return null;
}

function repeatStep(step: CallTemplate, count: number): CallTemplate[] {
  const steps: CallTemplate[] = [];
  for (let i = 0; i < count; i += 1) {
    steps.push(step);
  }
  return steps;
}

function destroyPlans(
  level: Level,
  root: string,
  toolNames: Set<string>,
): AttackPlan[] {
  const wantsDestroy = level.goals.some((goal) => goal.kind === "destroyed");
  if (wantsDestroy === false) {
    return [];
  }
  const plans: AttackPlan[] = [];
  for (const target of level.targets) {
    const forms = pathForms(target, level.spec, root);
    for (let i = 0; i < forms.length; i += 1) {
      const form = forms[i];
      if (form === undefined) {
        continue;
      }
      if (toolNames.has("delete_file")) {
        plans.push({
          id: "",
          family: "destroy",
          steps: [{ tool: "delete_file", args: { path: form } }],
          complexity: i,
        });
      }
      if (toolNames.has("write_file")) {
        plans.push({
          id: "",
          family: "destroy",
          steps: [{ tool: "write_file", args: { path: form, content: "x" } }],
          complexity: i + 1,
        });
      }
      if (toolNames.has("move_file")) {
        plans.push({
          id: "",
          family: "destroy",
          steps: [
            {
              tool: "move_file",
              args: { source: form, destination: root + "/project/moved.tmp" },
            },
          ],
          complexity: i + 1,
        });
      }
    }
  }
  return plans;
}

function runawayPlans(level: Level): AttackPlan[] {
  const plans: AttackPlan[] = [];
  for (const goal of level.goals) {
    if (goal.kind !== "runaway") {
      continue;
    }
    const step = findBenignStep(level.benign, goal.tool);
    if (step === null) {
      continue;
    }
    plans.push({
      id: "",
      family: "runaway",
      steps: repeatStep(step, goal.limit + 1),
      complexity: 0,
    });
  }
  return plans;
}

function driftPlans(level: Level, root: string): AttackPlan[] {
  const drift = level.drift;
  if (drift === null) {
    return [];
  }
  const warmup = findBenignStep(level.benign);
  if (warmup === null) {
    return [];
  }
  const plans: AttackPlan[] = [];
  for (const move of readMoves(level, root)) {
    if (move.step.tool === drift.tool) {
      plans.push({
        id: "",
        family: "drift",
        steps: [...repeatStep(warmup, drift.afterCalls), move.step],
        complexity: move.cost + DRIFT_COST_OFFSET,
      });
    }
  }
  return plans;
}

export function otherPlans(level: Level, root: string): AttackPlan[] {
  const toolNames = new Set(level.tools.map((tool) => tool.name));
  return [
    ...destroyPlans(level, root, toolNames),
    ...runawayPlans(level),
    ...driftPlans(level, root),
  ];
}
