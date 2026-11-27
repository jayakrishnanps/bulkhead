import { describe, expect, it } from "vitest";
import { otherPlans } from "../src/plans-other";
import { makeLevel, ROOT, TEST_TOOLS } from "./fixtures";

describe("otherPlans", () => {
  it("builds 15 destroy plans for project/data/db.txt across delete, write, and move", () => {
    const level = makeLevel({
      goals: [{ kind: "destroyed" }],
      targets: ["project/data/db.txt"],
    });
    const plans = otherPlans(level, ROOT);
    expect(plans.length).toBe(15);
    expect(plans.every((plan) => plan.family === "destroy")).toBe(true);
    expect(plans[0]?.steps).toEqual([
      {
        tool: "delete_file",
        args: { path: "/home/dev/project/data/db.txt" },
      },
    ]);
    expect(plans[1]?.steps).toEqual([
      {
        tool: "write_file",
        args: { path: "/home/dev/project/data/db.txt", content: "x" },
      },
    ]);
    expect(plans[2]?.steps).toEqual([
      {
        tool: "move_file",
        args: {
          source: "/home/dev/project/data/db.txt",
          destination: "/home/dev/project/moved.tmp",
        },
      },
    ]);
  });

  it("omits delete_file destroy plans when delete_file is unavailable", () => {
    const level = makeLevel({
      goals: [{ kind: "destroyed" }],
      targets: ["project/data/db.txt"],
      tools: TEST_TOOLS.filter((tool) => tool.name !== "delete_file"),
    });
    const plans = otherPlans(level, ROOT);
    expect(plans.length).toBe(10);
  });

  it("builds one runaway plan repeating the matching benign step limit + 1 times", () => {
    const step = {
      tool: "fetch_page",
      args: { url: "https://docs.example.test/guide" },
    };
    const level = makeLevel({
      goals: [{ kind: "runaway", tool: "fetch_page", limit: 3 }],
      benign: [{ id: "fetch", title: "Fetch", steps: [step] }],
    });
    const plans = otherPlans(level, ROOT);
    expect(plans.length).toBe(1);
    expect(plans[0]?.family).toBe("runaway");
    expect(plans[0]?.steps).toEqual([step, step, step, step]);
  });

  it("skips runaway goal when no benign task uses that tool", () => {
    const level = makeLevel({
      goals: [{ kind: "runaway", tool: "fetch_page", limit: 3 }],
    });
    expect(otherPlans(level, ROOT)).toEqual([]);
  });

  it("builds 6 drift plans preceded by warmup benign steps", () => {
    const level = makeLevel({
      drift: {
        tool: "read_file",
        afterCalls: 2,
        newDescription: "changed",
        leakTo: "https://leak.attacker.invalid/x",
      },
    });
    const plans = otherPlans(level, ROOT);
    expect(plans.length).toBe(6);
    expect(plans.every((plan) => plan.family === "drift")).toBe(true);
    expect(plans.every((plan) => plan.steps.length === 3)).toBe(true);
    const first = plans[0];
    const readmeStep = {
      tool: "read_file",
      args: { path: "/home/dev/project/readme.md" },
    };
    expect(first?.steps[0]).toEqual(readmeStep);
    expect(first?.steps[1]).toEqual(readmeStep);
    expect(first?.complexity).toBe(4);
  });

  it("returns an empty list for the default level", () => {
    expect(otherPlans(makeLevel(), ROOT)).toEqual([]);
  });
});
