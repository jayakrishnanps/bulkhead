import { describe, expect, it } from "vitest";
import { scoreRun } from "../src/score";
import type { Level, TraceVerdict } from "../src/types";

function makeVerdict(
  kind: "attack" | "normal",
  passed: boolean,
  asks = 0,
): TraceVerdict {
  return {
    traceId: "test-trace",
    kind,
    passed,
    asks,
    failure: passed ? null : "Failed",
    outcomes: [],
  };
}

function makeLevel(parRules: number): Level {
  return {
    id: "test-level",
    chapter: 1,
    order: 1,
    title: "Test Level",
    story: "Test story",
    learn: "Test learn",
    hints: ["hint 1", "hint 2", "hint 3"],
    tools: [],
    world: {
      home: "/home/dev",
      projectRoot: "/home/dev/project",
      safeDomains: [],
      evilDomains: [],
    },
    sensitivePaths: [],
    mutators: [],
    parRules,
    attack: [],
    normal: [],
  };
}

describe("scoreRun", () => {
  it("gives 100 points, cleared true, and 3 stars when all pass with no asks", () => {
    const level = makeLevel(2);
    const attack = [makeVerdict("attack", true)];
    const normal = [makeVerdict("normal", true, 0)];
    const score = scoreRun(level, 2, attack, normal);
    expect(score.total).toBe(100);
    expect(score.cleared).toBe(true);
    expect(score.stars).toBe(3);
  });

  it("gives 95 points, cleared true, and 2 stars when normal has 2 asks", () => {
    const level = makeLevel(2);
    const attack = [makeVerdict("attack", true)];
    const normal = [makeVerdict("normal", true, 2)];
    const score = scoreRun(level, 2, attack, normal);
    expect(score.total).toBe(95);
    expect(score.cleared).toBe(true);
    expect(score.stars).toBe(2);
  });

  it("gives 98 points, cleared true, and 3 stars when 1 rule over par", () => {
    const level = makeLevel(2);
    const attack = [makeVerdict("attack", true)];
    const normal = [makeVerdict("normal", true, 0)];
    const score = scoreRun(level, 3, attack, normal);
    expect(score.total).toBe(98);
    expect(score.cleared).toBe(true);
    expect(score.stars).toBe(3);
  });

  it("calculates 75% attacks stopped, cleared false, 0 stars, and 89 points", () => {
    const level = makeLevel(2);
    const attack = [
      makeVerdict("attack", true),
      makeVerdict("attack", true),
      makeVerdict("attack", true),
      makeVerdict("attack", false),
    ];
    const normal = [makeVerdict("normal", true, 0)];
    const score = scoreRun(level, 2, attack, normal);
    expect(score.attacksStoppedPct).toBe(75);
    expect(score.cleared).toBe(false);
    expect(score.stars).toBe(0);
    expect(score.total).toBe(89);
  });

  it("reports 100% for both attack and normal when lists are empty", () => {
    const level = makeLevel(2);
    const score = scoreRun(level, 2, [], []);
    expect(score.attacksStoppedPct).toBe(100);
    expect(score.normalAllowedPct).toBe(100);
  });
});
