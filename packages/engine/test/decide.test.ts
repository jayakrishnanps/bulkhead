import { describe, expect, it } from "vitest";
import { decideCall } from "../src/decide";
import {
  addLabels,
  createSession,
  registerToolUpdate,
} from "../src/session";
import type { Rule, ToolDef } from "../src/types";

describe("decideCall", () => {
  const home = "/home/dev";
  const defaultTool: ToolDef = {
    name: "read_file",
    tags: ["reads_files"],
    description: "Read a file from disk",
  };

  it("selects the first matching rule when multiple rules match", () => {
    const rules: Rule[] = [
      { name: "first-rule", when: {}, do: "deny" },
      { name: "second-rule", when: {}, do: "allow" },
    ];
    const decision = decideCall(rules, {
      tool: defaultTool,
      args: {},
      session: createSession([]),
      home,
      repeatCount: 1,
    });
    expect(decision.ruleName).toBe("first-rule");
    expect(decision.action).toBe("deny");
  });

  it("returns allow with null ruleName when no rule matches", () => {
    const rules: Rule[] = [
      { name: "other-tool", when: { tool: "bash" }, do: "deny" },
    ];
    const decision = decideCall(rules, {
      tool: defaultTool,
      args: {},
      session: createSession([]),
      home,
      repeatCount: 1,
    });
    expect(decision.action).toBe("allow");
    expect(decision.ruleName).toBeNull();
    expect(decision.reason).toBe("No rule matched");
  });

  it("matches tool glob patterns correctly", () => {
    const rules: Rule[] = [
      { name: "read-wildcard", when: { tool: "read_*" }, do: "deny" },
    ];
    const matchingDecision = decideCall(rules, {
      tool: defaultTool,
      args: {},
      session: createSession([]),
      home,
      repeatCount: 1,
    });
    expect(matchingDecision.action).toBe("deny");

    const nonMatchingTool: ToolDef = {
      name: "write_file",
      tags: [],
      description: "Write a file to disk",
    };
    const nonMatchingDecision = decideCall(rules, {
      tool: nonMatchingTool,
      args: {},
      session: createSession([]),
      home,
      repeatCount: 1,
    });
    expect(nonMatchingDecision.action).toBe("allow");
  });

  it("matches tool tag requirements", () => {
    const rules: Rule[] = [
      {
        name: "tagged-rule",
        when: { tool_tag: "reads_files" },
        do: "deny",
      },
    ];
    const matchingDecision = decideCall(rules, {
      tool: defaultTool,
      args: {},
      session: createSession([]),
      home,
      repeatCount: 1,
    });
    expect(matchingDecision.action).toBe("deny");

    const otherTool: ToolDef = {
      name: "other",
      tags: ["other_tag"],
      description: "Other tool",
    };
    const nonMatchingDecision = decideCall(rules, {
      tool: otherTool,
      args: {},
      session: createSession([]),
      home,
      repeatCount: 1,
    });
    expect(nonMatchingDecision.action).toBe("allow");
  });

  it("matches arguments and rejects calls with missing arguments", () => {
    const rules: Rule[] = [
      {
        name: "env-check",
        when: { args: { path: { glob: "**/.env" } } },
        do: "deny",
      },
    ];
    const matchingDecision = decideCall(rules, {
      tool: defaultTool,
      args: { path: "/home/dev/.env" },
      session: createSession([]),
      home,
      repeatCount: 1,
    });
    expect(matchingDecision.action).toBe("deny");

    const missingArgDecision = decideCall(rules, {
      tool: defaultTool,
      args: {},
      session: createSession([]),
      home,
      repeatCount: 1,
    });
    expect(missingArgDecision.action).toBe("allow");
  });

  it("requires all session labels to match session_has", () => {
    const rules: Rule[] = [
      {
        name: "both-labels",
        when: { session_has: ["PRIVATE", "UNTRUSTED"] },
        do: "deny",
      },
    ];
    const sessionWithOne = createSession([]);
    addLabels(sessionWithOne, ["PRIVATE"]);
    const decisionOne = decideCall(rules, {
      tool: defaultTool,
      args: {},
      session: sessionWithOne,
      home,
      repeatCount: 1,
    });
    expect(decisionOne.action).toBe("allow");

    const sessionWithBoth = createSession([]);
    addLabels(sessionWithBoth, ["PRIVATE", "UNTRUSTED"]);
    const decisionBoth = decideCall(rules, {
      tool: defaultTool,
      args: {},
      session: sessionWithBoth,
      home,
      repeatCount: 1,
    });
    expect(decisionBoth.action).toBe("deny");
  });

  it("checks tool_changed condition based on description modifications", () => {
    const rules: Rule[] = [
      { name: "changed-rule", when: { tool_changed: true }, do: "deny" },
    ];
    const session = createSession([defaultTool]);
    const unchangedDecision = decideCall(rules, {
      tool: defaultTool,
      args: {},
      session,
      home,
      repeatCount: 1,
    });
    expect(unchangedDecision.action).toBe("allow");

    registerToolUpdate(session, defaultTool.name, "New description");
    const changedDecision = decideCall(rules, {
      tool: defaultTool,
      args: {},
      session,
      home,
      repeatCount: 1,
    });
    expect(changedDecision.action).toBe("deny");
  });

  it("evaluates repeated_over threshold strictly", () => {
    const rules: Rule[] = [
      { name: "repeat-check", when: { repeated_over: 3 }, do: "deny" },
    ];
    const equalDecision = decideCall(rules, {
      tool: defaultTool,
      args: {},
      session: createSession([]),
      home,
      repeatCount: 3,
    });
    expect(equalDecision.action).toBe("allow");

    const greaterDecision = decideCall(rules, {
      tool: defaultTool,
      args: {},
      session: createSession([]),
      home,
      repeatCount: 4,
    });
    expect(greaterDecision.action).toBe("deny");
  });

  it("matches any call when when condition is empty", () => {
    const rules: Rule[] = [
      { name: "catch-all", when: {}, do: "deny" },
    ];
    const decision = decideCall(rules, {
      tool: defaultTool,
      args: {},
      session: createSession([]),
      home,
      repeatCount: 1,
    });
    expect(decision.action).toBe("deny");
    expect(decision.ruleName).toBe("catch-all");
  });

  it("uses custom say reason when provided and default text otherwise", () => {
    const customSayRule: Rule[] = [
      {
        name: "custom-rule",
        when: {},
        do: "deny",
        say: "Blocked for safety",
      },
    ];
    const customDecision = decideCall(customSayRule, {
      tool: defaultTool,
      args: {},
      session: createSession([]),
      home,
      repeatCount: 1,
    });
    expect(customDecision.reason).toBe("Blocked for safety");

    const defaultSayRule: Rule[] = [
      { name: "default-rule", when: {}, do: "deny" },
    ];
    const defaultDecision = decideCall(defaultSayRule, {
      tool: defaultTool,
      args: {},
      session: createSession([]),
      home,
      repeatCount: 1,
    });
    expect(defaultDecision.reason).toBe('Rule "default-rule" matched');
  });
});
