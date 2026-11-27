import { MAX_PLANS } from "./constants";
import type { AttackPlan, Level } from "./level-types";
import { exfilPlans } from "./plans-exfil";
import { otherPlans } from "./plans-other";

export function generatePlans(level: Level, root: string): AttackPlan[] {
  const all = [...exfilPlans(level, root), ...otherPlans(level, root)];
  const indexed = all.map((plan, index) => ({ plan, index }));
  indexed.sort((a, b) => {
    if (a.plan.complexity !== b.plan.complexity) {
      return a.plan.complexity - b.plan.complexity;
    }
    return a.index - b.index;
  });
  return indexed.slice(0, MAX_PLANS).map((entry, position) => ({
    ...entry.plan,
    id: entry.plan.family + "-" + position,
  }));
}
