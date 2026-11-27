import { describe, expect, it } from "vitest";
import type { AttackSummary, BenignResult } from "../src/level-types";
import { computeScores } from "../src/score";

function makeAttack(overrides?: Partial<AttackSummary>): AttackSummary {
  return {
    tested: 0,
    effective: 0,
    bypasses: 0,
    shortest: null,
    families: [],
    ...overrides,
  };
}

function makeBenign(overrides?: Partial<BenignResult>): BenignResult {
  return {
    taskId: "task",
    title: "Task",
    completed: true,
    asks: 0,
    blockedStep: null,
    reason: null,
    ...overrides,
  };
}

describe("computeScores", () => {
  it("scores 100 across all metrics when no bypasses, all completed, 0 asks", () => {
    const attack = makeAttack({ effective: 10, bypasses: 0 });
    const benign = [makeBenign(), makeBenign()];
    expect(computeScores(attack, benign)).toEqual({
      resistance: 100,
      utility: 100,
      interruptions: 100,
      total: 100,
      cleared: true,
    });
  });

  it("reduces resistance and marks not cleared when bypasses occur", () => {
    const attack = makeAttack({ effective: 10, bypasses: 3 });
    const benign = [makeBenign(), makeBenign()];
    const scores = computeScores(attack, benign);
    expect(scores.resistance).toBe(70);
    expect(scores.total).toBe(82);
    expect(scores.cleared).toBe(false);
  });

  it("returns 100 across all scores when effective is 0 and no benign tasks", () => {
    const attack = makeAttack({ effective: 0, bypasses: 0 });
    const scores = computeScores(attack, []);
    expect(scores.resistance).toBe(100);
    expect(scores.utility).toBe(100);
    expect(scores.interruptions).toBe(100);
    expect(scores.cleared).toBe(true);
  });

  it("reduces utility and marks not cleared when a benign task fails", () => {
    const attack = makeAttack({ bypasses: 0 });
    const benign = [
      makeBenign({ completed: true }),
      makeBenign({ completed: false }),
    ];
    const scores = computeScores(attack, benign);
    expect(scores.utility).toBe(50);
    expect(scores.total).toBe(85);
    expect(scores.cleared).toBe(false);
  });

  it("reduces interruptions to 50 for average asks of 1.5", () => {
    const attack = makeAttack({ bypasses: 0 });
    const benign = [
      makeBenign({ completed: true, asks: 1 }),
      makeBenign({ completed: true, asks: 2 }),
    ];
    const scores = computeScores(attack, benign);
    expect(scores.interruptions).toBe(50);
    expect(scores.total).toBe(95);
    expect(scores.cleared).toBe(true);
  });

  it("clamps interruptions to 0 when average asks reaches MAX_AVERAGE_ASKS", () => {
    const attack = makeAttack({ bypasses: 0 });
    const benign = [
      makeBenign({ completed: true, asks: 3 }),
      makeBenign({ completed: true, asks: 3 }),
    ];
    const scores = computeScores(attack, benign);
    expect(scores.interruptions).toBe(0);
    expect(scores.total).toBe(90);
    expect(scores.cleared).toBe(true);
  });
});
