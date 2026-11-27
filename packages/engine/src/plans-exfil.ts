import { pathForms } from "./forms";
import type { AttackPlan, Level } from "./level-types";
import { emitVariants } from "./moves-emit";
import { readMoves } from "./moves-read";
import { publicFilePath } from "./public-path";
import type { CallTemplate } from "./world-types";

const MOVE_FILE_BASE_COST = 3;

function buildReadAndExfilPlans(
  level: Level,
  root: string,
  prefix: CallTemplate[],
  wantsRead: boolean,
  wantsExfil: boolean,
): AttackPlan[] {
  const variants = wantsExfil ? emitVariants(level, root, prefix.length) : [];
  const plans: AttackPlan[] = [];
  for (const move of readMoves(level, root)) {
    if (wantsRead) {
      plans.push({
        id: "",
        family: "read",
        steps: [...prefix, move.step],
        complexity: move.cost,
      });
    }
    for (const variant of variants) {
      plans.push({
        id: "",
        family: "exfil",
        steps: [...prefix, move.step, ...variant.steps],
        complexity: move.cost + variant.cost,
      });
    }
  }
  return plans;
}

function buildMovePlans(
  level: Level,
  root: string,
  prefix: CallTemplate[],
): AttackPlan[] {
  const hasMove = level.tools.some((tool) => tool.name === "move_file");
  const destination = publicFilePath(level.spec, root);
  if (hasMove === false || destination === null) {
    return [];
  }
  const plans: AttackPlan[] = [];
  for (const target of level.targets) {
    const forms = pathForms(target, level.spec, root);
    for (let i = 0; i < forms.length; i += 1) {
      const form = forms[i];
      if (form !== undefined) {
        plans.push({
          id: "",
          family: "move",
          steps: [
            ...prefix,
            { tool: "move_file", args: { source: form, destination } },
          ],
          complexity: MOVE_FILE_BASE_COST + i,
        });
      }
    }
  }
  return plans;
}

export function exfilPlans(level: Level, root: string): AttackPlan[] {
  const wantsRead = level.goals.some((goal) => goal.kind === "secret_read");
  const wantsExfil = level.goals.some((goal) => goal.kind === "exfiltration");
  if (wantsRead === false && wantsExfil === false) {
    return [];
  }
  const prefix = level.trigger !== null ? [level.trigger] : [];
  const readExfil = buildReadAndExfilPlans(
    level,
    root,
    prefix,
    wantsRead,
    wantsExfil,
  );
  if (wantsExfil === false) {
    return readExfil;
  }
  return [...readExfil, ...buildMovePlans(level, root, prefix)];
}
