import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  createVirtualWorld,
  lintPolicy,
  parsePolicy,
  runBenign,
} from "@bulkhead/engine";
import { LEVELS } from "../src/index";

const policiesDir = fileURLToPath(new URL("../policies/", import.meta.url));

function readPolicy(fileName: string): string {
  return readFileSync(policiesDir + fileName, "utf8");
}

function policyFiles(levelId: string): string[] {
  return readdirSync(policiesDir).filter((name) =>
    name.startsWith(levelId + "."),
  );
}

describe("all levels", () => {
  it("have unique ids and unique orders", () => {
    const ids = LEVELS.map((level) => level.id);
    expect(new Set(ids).size).toBe(ids.length);
    const orders = LEVELS.map((level) => level.order);
    expect(new Set(orders).size).toBe(orders.length);
  });
});

for (const level of LEVELS) {
  describe(level.id, () => {
    it("has valid structure", () => {
      expect(level.hints.length).toBe(3);
      expect(level.benign.length).toBeGreaterThanOrEqual(1);
      expect(level.goals.length).toBeGreaterThanOrEqual(1);

      for (const target of level.targets) {
        expect(level.spec.files[target]).toBeDefined();
      }

      const toolNames = new Set(level.tools.map((tool) => tool.name));
      for (const task of level.benign) {
        for (const step of task.steps) {
          expect(toolNames.has(step.tool)).toBe(true);
        }
      }

      if (level.trigger !== null) {
        expect(toolNames.has(level.trigger.tool)).toBe(true);
      }
    });

    it("has a reference policy file", () => {
      const files = policyFiles(level.id);
      expect(files).toContain(level.id + ".reference.yaml");
    });

    it("completes all benign tasks with default allow", async () => {
      const world = createVirtualWorld({
        spec: level.spec,
        root: "/home/dev",
        drift: level.drift,
      });
      const parseResult = parsePolicy("default: allow");
      if (parseResult.ok === false) {
        throw new Error(parseResult.errors.join("\n"));
      }
      const results = await runBenign({
        level,
        policy: parseResult.policy,
        world,
      });
      for (const result of results) {
        expect(result.completed).toBe(true);
      }
    });

    it("completes all benign tasks with the reference policy and 0 asks, with no lint warnings", async () => {
      const policyText = readPolicy(level.id + ".reference.yaml");
      const parseResult = parsePolicy(policyText);
      if (parseResult.ok === false) {
        throw new Error(parseResult.errors.join("\n"));
      }
      const policy = parseResult.policy;
      expect(lintPolicy(policy)).toEqual([]);

      const world = createVirtualWorld({
        spec: level.spec,
        root: "/home/dev",
        drift: level.drift,
      });
      const results = await runBenign({ level, policy, world });
      for (const result of results) {
        expect(result.completed).toBe(true);
        expect(result.asks).toBe(0);
      }
    });
  });
}
