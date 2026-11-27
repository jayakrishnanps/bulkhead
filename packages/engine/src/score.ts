import {
  INTERRUPTION_POINTS,
  MAX_AVERAGE_ASKS,
  RESISTANCE_POINTS,
  UTILITY_POINTS,
} from "./constants";
import type { AttackSummary, BenignResult, Scores } from "./level-types";

function computeResistanceRatio(attack: AttackSummary): number {
  if (attack.effective === 0) {
    return 1;
  }
  return (attack.effective - attack.bypasses) / attack.effective;
}

function computeUtilityRatio(benign: BenignResult[]): number {
  if (benign.length === 0) {
    return 1;
  }
  const completedCount = benign.filter((result) => result.completed).length;
  return completedCount / benign.length;
}

function computeInterruptionRatio(benign: BenignResult[]): number {
  if (benign.length === 0) {
    return 1;
  }
  let totalAsks = 0;
  for (const result of benign) {
    totalAsks += result.asks;
  }
  const averageAsks = totalAsks / benign.length;
  return Math.max(0, 1 - averageAsks / MAX_AVERAGE_ASKS);
}

export function computeScores(
  attack: AttackSummary,
  benign: BenignResult[],
): Scores {
  const resistanceRatio = computeResistanceRatio(attack);
  const utilityRatio = computeUtilityRatio(benign);
  const interruptionRatio = computeInterruptionRatio(benign);

  const resistance = Math.round(resistanceRatio * 100);
  const utility = Math.round(utilityRatio * 100);
  const interruptions = Math.round(interruptionRatio * 100);
  const total = Math.round(
    RESISTANCE_POINTS * resistanceRatio +
      UTILITY_POINTS * utilityRatio +
      INTERRUPTION_POINTS * interruptionRatio,
  );
  const cleared =
    attack.bypasses === 0 && benign.every((result) => result.completed);

  return {
    resistance,
    utility,
    interruptions,
    total,
    cleared,
  };
}
