import { describe, expect, it } from "vitest";
import { decidePolicy } from "../src/decide";
import type { DecideInput } from "../src/decide";
import type { Policy } from "../src/types";
import type { ToolDef } from "../src/world-types";
import { makeContext } from "./fixtures";

function makeTool(overrides?: Partial<ToolDef>): ToolDef {
  return {
    name: "read_file",
    tags: ["reads_files"],
    description: "Read a file",
    params: [],
    ...overrides,
  };
}

function makeInput(overrides?: Partial<DecideInput>): DecideInput {
  return {
    tool: makeTool(),
    args: { path: "/home/dev/project/readme.md" },
    executedCalls: 0,
    changedTools: [],
    sessionLabels: [],
    match: makeContext(),
    ...overrides,
  };
}

describe("decidePolicy", () => {
  it("handles no rules and defaults", () => {
    const allowPolicy: Policy = {
      default: "allow",
      rules: [],
    };
    const allowResult = decidePolicy(allowPolicy, makeInput());
    expect(allowResult.action).toBe("allow");
    expect(allowResult.ruleNames).toEqual([]);
    expect(allowResult.reason).toBe("Default: allow");

    const denyPolicy: Policy = {
      default: "deny",
      rules: [],
    };
    const denyResult = decidePolicy(denyPolicy, makeInput());
    expect(denyResult.action).toBe("deny");
    expect(denyResult.ruleNames).toEqual([]);
    expect(denyResult.reason).toBe("Default: deny");
  });

  it("prioritizes deny over allow", () => {
    const policy: Policy = {
      default: "allow",
      rules: [
        { name: "allow-rule", do: "allow", when: {} },
        { name: "deny-rule", do: "deny", when: {} },
      ],
    };
    const result = decidePolicy(policy, makeInput());
    expect(result.action).toBe("deny");
    expect(result.ruleNames).toEqual(["deny-rule"]);
  });

  it("prioritizes ask over allow and deny over ask", () => {
    const askOverAllow: Policy = {
      default: "allow",
      rules: [
        { name: "allow-rule", do: "allow", when: {} },
        { name: "ask-rule", do: "ask", when: {} },
      ],
    };
    const askResult = decidePolicy(askOverAllow, makeInput());
    expect(askResult.action).toBe("ask");
    expect(askResult.ruleNames).toEqual(["ask-rule"]);

    const denyOverAsk: Policy = {
      default: "allow",
      rules: [
        { name: "ask-rule", do: "ask", when: {} },
        { name: "deny-rule", do: "deny", when: {} },
      ],
    };
    const denyResult = decidePolicy(denyOverAsk, makeInput());
    expect(denyResult.action).toBe("deny");
    expect(denyResult.ruleNames).toEqual(["deny-rule"]);
  });

  it("stops a rule when an unless-condition matches", () => {
    const policy: Policy = {
      default: "allow",
      rules: [
        {
          name: "deny-reads",
          do: "deny",
          when: { tool_tag: "reads_files" },
          unless: { args: { path: { iglob: "**/readme.md" } } },
        },
      ],
    };

    const readmeInput = makeInput({
      args: { path: "/home/dev/project/readme.md" },
    });
    const readmeResult = decidePolicy(policy, readmeInput);
    expect(readmeResult.action).toBe("allow");
    expect(readmeResult.ruleNames).toEqual([]);

    const notesInput = makeInput({
      args: { path: "/home/dev/project/notes.txt" },
    });
    const notesResult = decidePolicy(policy, notesInput);
    expect(notesResult.action).toBe("deny");
    expect(notesResult.ruleNames).toEqual(["deny-reads"]);
  });

  it("uses say text when given, otherwise default matched format", () => {
    const policyWithSay: Policy = {
      default: "allow",
      rules: [
        {
          name: "say-rule",
          do: "deny",
          when: {},
          say: "Do not touch this",
        },
      ],
    };
    const sayResult = decidePolicy(policyWithSay, makeInput());
    expect(sayResult.reason).toBe("Do not touch this");

    const policyWithoutSay: Policy = {
      default: "allow",
      rules: [
        {
          name: "quiet-rule",
          do: "deny",
          when: {},
        },
      ],
    };
    const quietResult = decidePolicy(policyWithoutSay, makeInput());
    expect(quietResult.reason).toBe('Rule "quiet-rule" matched');
  });

  it("matches tool glob pattern", () => {
    const policy: Policy = {
      default: "allow",
      rules: [
        {
          name: "read-wildcard",
          do: "deny",
          when: { tool: "read_*" },
        },
      ],
    };

    const readResult = decidePolicy(
      policy,
      makeInput({ tool: makeTool({ name: "read_file" }) }),
    );
    expect(readResult.action).toBe("deny");

    const writeResult = decidePolicy(
      policy,
      makeInput({ tool: makeTool({ name: "write_file" }) }),
    );
    expect(writeResult.action).toBe("allow");
  });

  it("matches tool tag only when the tool has the tag", () => {
    const policy: Policy = {
      default: "allow",
      rules: [
        {
          name: "tagged-rule",
          do: "deny",
          when: { tool_tag: "reads_files" },
        },
      ],
    };

    const taggedResult = decidePolicy(
      policy,
      makeInput({ tool: makeTool({ tags: ["reads_files"] }) }),
    );
    expect(taggedResult.action).toBe("deny");

    const untaggedResult = decidePolicy(
      policy,
      makeInput({ tool: makeTool({ tags: ["network"] }) }),
    );
    expect(untaggedResult.action).toBe("allow");
  });

  it("matches args when present and rejects when missing", () => {
    const policy: Policy = {
      default: "allow",
      rules: [
        {
          name: "path-rule",
          do: "deny",
          when: { args: { path: { contains: "project" } } },
        },
      ],
    };

    const matchResult = decidePolicy(
      policy,
      makeInput({ args: { path: "/home/dev/project/readme.md" } }),
    );
    expect(matchResult.action).toBe("deny");

    const missingResult = decidePolicy(
      policy,
      makeInput({ args: { content: "hello" } }),
    );
    expect(missingResult.action).toBe("allow");
  });

  it("matches any_arg with resolved_glob through symlink", () => {
    const policy: Policy = {
      default: "allow",
      rules: [
        {
          name: "ssh-rule",
          do: "deny",
          when: { any_arg: { resolved_glob: "**/.ssh/**" } },
        },
      ],
    };

    const linkResult = decidePolicy(
      policy,
      makeInput({ args: { path: "/home/dev/project/keys/id_key" } }),
    );
    expect(linkResult.action).toBe("deny");

    const readmeResult = decidePolicy(
      policy,
      makeInput({ args: { path: "/home/dev/project/readme.md" } }),
    );
    expect(readmeResult.action).toBe("allow");
  });

  it("matches any_arg with carries on carried labels context", () => {
    const matchContext = makeContext({
      carriedLabels: (text: string) => {
        return text.includes("tok") ? ["PRIVATE"] : [];
      },
    });
    const policy: Policy = {
      default: "allow",
      rules: [
        {
          name: "private-rule",
          do: "deny",
          when: { any_arg: { carries: ["PRIVATE"] } },
        },
      ],
    };

    const carriedResult = decidePolicy(
      policy,
      makeInput({ args: { body: "x tok y" }, match: matchContext }),
    );
    expect(carriedResult.action).toBe("deny");

    const cleanResult = decidePolicy(
      policy,
      makeInput({ args: { body: "x" }, match: matchContext }),
    );
    expect(cleanResult.action).toBe("allow");
  });

  it("requires all labels in session_has", () => {
    const policy: Policy = {
      default: "allow",
      rules: [
        {
          name: "session-rule",
          do: "deny",
          when: { session_has: ["PRIVATE", "UNTRUSTED"] },
        },
      ],
    };

    const privateOnly = decidePolicy(
      policy,
      makeInput({ sessionLabels: ["PRIVATE"] }),
    );
    expect(privateOnly.action).toBe("allow");

    const untrustedOnly = decidePolicy(
      policy,
      makeInput({ sessionLabels: ["UNTRUSTED"] }),
    );
    expect(untrustedOnly.action).toBe("allow");

    const bothLabels = decidePolicy(
      policy,
      makeInput({ sessionLabels: ["PRIVATE", "UNTRUSTED"] }),
    );
    expect(bothLabels.action).toBe("deny");
  });

  it("matches tool_changed only when changedTools has the tool", () => {
    const policy: Policy = {
      default: "allow",
      rules: [
        {
          name: "changed-rule",
          do: "deny",
          when: { tool_changed: true },
        },
      ],
    };

    const changedResult = decidePolicy(
      policy,
      makeInput({ changedTools: ["read_file"] }),
    );
    expect(changedResult.action).toBe("deny");

    const emptyResult = decidePolicy(
      policy,
      makeInput({ changedTools: [] }),
    );
    expect(emptyResult.action).toBe("allow");

    const differentResult = decidePolicy(
      policy,
      makeInput({ changedTools: ["write_file"] }),
    );
    expect(differentResult.action).toBe("allow");
  });

  it("matches max_calls when executedCalls is at least the number", () => {
    const policy: Policy = {
      default: "allow",
      rules: [
        {
          name: "limit-rule",
          do: "deny",
          when: { max_calls: 3 },
        },
      ],
    };

    expect(decidePolicy(policy, makeInput({ executedCalls: 3 })).action).toBe(
      "deny",
    );
    expect(decidePolicy(policy, makeInput({ executedCalls: 4 })).action).toBe(
      "deny",
    );
    expect(decidePolicy(policy, makeInput({ executedCalls: 2 })).action).toBe(
      "allow",
    );
  });

  it("matches an empty when condition on every call", () => {
    const policy: Policy = {
      default: "allow",
      rules: [
        {
          name: "catch-all",
          do: "deny",
          when: {},
        },
      ],
    };

    const result = decidePolicy(policy, makeInput());
    expect(result.action).toBe("deny");
    expect(result.ruleNames).toEqual(["catch-all"]);
  });
});
