import {
  ATTACK_POINTS,
  EXTRA_RULE_PENALTY,
  NORMAL_POINTS,
  QUESTION_PENALTY,
  QUESTION_POINTS,
  RULE_POINTS,
  THREE_STAR_SCORE,
  TWO_STAR_SCORE,
} from "./constants";
import type { Level, Score, TraceVerdict } from "./types";

function calculatePercent(verdicts: TraceVerdict[]): number {
  if (verdicts.length === 0) {
    return 100;
  }
  let passedCount = 0;
  for (const verdict of verdicts) {
    if (verdict.passed) {
      passedCount += 1;
    }
  }
  return Math.round((passedCount / verdicts.length) * 100);
}

function calculateAsksOnNormal(normalVerdicts: TraceVerdict[]): number {
  let totalAsks = 0;
  for (const verdict of normalVerdicts) {
    totalAsks += verdict.asks;
  }
  return totalAsks;
}

function calculateQuestionPoints(asksOnNormal: number): number {
  const penalty = QUESTION_PENALTY * asksOnNormal;
  const remaining = QUESTION_POINTS - penalty;
  return Math.max(0, remaining);
}

function calculateRulePoints(ruleCount: number, parRules: number): number {
  if (ruleCount <= parRules) {
    return RULE_POINTS;
  }
  const excessRules = ruleCount - parRules;
  const penalty = EXTRA_RULE_PENALTY * excessRules;
  const remaining = RULE_POINTS - penalty;
  return Math.max(0, remaining);
}

function calculateTotalScore(
  attacksStoppedPct: number,
  normalAllowedPct: number,
  questionPoints: number,
  rulePoints: number,
): number {
  const attackScore = (ATTACK_POINTS * attacksStoppedPct) / 100;
  const normalScore = (NORMAL_POINTS * normalAllowedPct) / 100;
  const combined = attackScore + normalScore + questionPoints + rulePoints;
  return Math.round(combined);
}

function calculateStars(cleared: boolean, total: number): 0 | 1 | 2 | 3 {
  if (cleared === false) {
    return 0;
  }
  if (total >= THREE_STAR_SCORE) {
    return 3;
  }
  if (total >= TWO_STAR_SCORE) {
    return 2;
  }
  return 1;
}

export function scoreRun(
  level: Level,
  ruleCount: number,
  attack: TraceVerdict[],
  normal: TraceVerdict[],
): Score {
  const attacksStoppedPct = calculatePercent(attack);
  const normalAllowedPct = calculatePercent(normal);
  const asksOnNormal = calculateAsksOnNormal(normal);
  const questionPoints = calculateQuestionPoints(asksOnNormal);
  const rulePoints = calculateRulePoints(ruleCount, level.parRules);
  const total = calculateTotalScore(
    attacksStoppedPct,
    normalAllowedPct,
    questionPoints,
    rulePoints,
  );
  const cleared = attacksStoppedPct === 100 && normalAllowedPct === 100;
  const stars = calculateStars(cleared, total);

  return {
    attacksStoppedPct,
    normalAllowedPct,
    asksOnNormal,
    ruleCount,
    total,
    cleared,
    stars,
  };
}
