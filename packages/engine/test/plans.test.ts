import { describe, expect, it } from "vitest";
import { MAX_PLANS } from "../src/constants";
import { generatePlans } from "../src/plans";
import { makeLevel, ROOT, TEST_TOOLS } from "./fixtures";

describe("generatePlans", () => {
  it("generates 3462 plans with unique ids and non-decreasing complexity", () => {
    const plans = generatePlans(makeLevel(), ROOT);
    expect(plans.length).toBe(3462);
    const ids = new Set(plans.map((plan) => plan.id));
    expect(ids.size).toBe(plans.length);
    for (let i = 1; i < plans.length; i += 1) {
      const previous = plans[i - 1];
      const current = plans[i];
      if (previous !== undefined && current !== undefined) {
        expect(current.complexity).toBeGreaterThanOrEqual(previous.complexity);
      }
    }
  });

  it("assigns complexity 0 and family-prefixed id to the first plan", () => {
    const plans = generatePlans(makeLevel(), ROOT);
    const first = plans[0];
    expect(first?.complexity).toBe(0);
    expect(first?.id.startsWith((first?.family ?? "") + "-")).toBe(true);
  });

  it("caps the generated plans at MAX_PLANS", () => {
    const level = makeLevel({
      targets: [".ssh/id_key", "project/readme.md", "project/src/a.ts"],
    });
    const plans = generatePlans(level, ROOT);
    expect(plans.length).toBe(MAX_PLANS);
  });

  it("includes both read and destroy plans when both goals are active", () => {
    const level = makeLevel({
      goals: [{ kind: "secret_read" }, { kind: "destroyed" }],
      targets: [".ssh/id_key", "project/data/db.txt"],
    });
    const plans = generatePlans(level, ROOT);
    expect(plans.some((plan) => plan.family === "read")).toBe(true);
    expect(plans.some((plan) => plan.family === "destroy")).toBe(true);
  });

  it("uses only tools available in level.tools across all steps", () => {
    const levels = [
      makeLevel(),
      makeLevel({
        tools: TEST_TOOLS.filter(
          (tool) => tool.name === "read_file" || tool.name === "send_http",
        ),
      }),
    ];
    for (const level of levels) {
      const allowed = new Set(level.tools.map((tool) => tool.name));
      for (const plan of generatePlans(level, ROOT)) {
        for (const step of plan.steps) {
          expect(allowed.has(step.tool)).toBe(true);
        }
      }
    }
  });

  it("produces deterministic results across repeated calls", () => {
    const level = makeLevel();
    expect(generatePlans(level, ROOT)).toEqual(generatePlans(level, ROOT));
  });
});
