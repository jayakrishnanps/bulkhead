import { describe, expect, it } from "vitest";
import { findUnusedRules, lintPolicy } from "../src/lint";
import { parsePolicy } from "../src/policy";
import type { Policy } from "../src/types";

function parse(text: string): Policy {
  const result = parsePolicy(text);
  if (result.ok === false) {
    throw new Error(result.errors.join("\n"));
  }
  return result.policy;
}

describe("lintPolicy", () => {
  it("warns when default allow has no deny/ask or default deny has no allow", () => {
    expect(lintPolicy(parse("default: allow"))).toEqual([
      {
        rule: null,
        message: "The policy allows everything: it has no deny or ask rule.",
      },
    ]);
    expect(lintPolicy(parse("default: deny"))).toEqual([
      {
        rule: null,
        message: "The policy denies everything: it has no allow rule.",
      },
    ]);
  });

  it("warns when a rule has an empty when and no unless", () => {
    const policy = parse(
      [
        "default: allow",
        "rules:",
        "  - name: a",
        "    do: deny",
        "  - name: b",
        "    do: deny",
        "    unless:",
        "      tool: read_file",
      ].join("\n"),
    );
    expect(lintPolicy(policy)).toEqual([
      { rule: "a", message: "Matches every call." },
    ]);
  });

  it("warns on catch-all glob and iglob patterns", () => {
    const singlePolicy = parse(
      [
        "default: allow",
        "rules:",
        "  - name: r",
        "    do: deny",
        "    when:",
        "      any_arg:",
        '        glob: "**"',
      ].join("\n"),
    );
    expect(lintPolicy(singlePolicy)).toEqual([
      { rule: "r", message: 'The pattern "**" matches every path.' },
    ]);

    const listPolicy = parse(
      [
        "default: allow",
        "rules:",
        "  - name: r",
        "    do: deny",
        "    when:",
        "      any_arg:",
        '        iglob: ["*", "a"]',
      ].join("\n"),
    );
    expect(lintPolicy(listPolicy)).toEqual([
      { rule: "r", message: 'The pattern "*" matches every path.' },
    ]);
  });

  it("warns when an allow rule is shadowed by a deny rule", () => {
    const policy = parse(
      [
        "default: allow",
        "rules:",
        "  - name: ok",
        "    do: allow",
        "    when:",
        "      tool: read_file",
        "  - name: no",
        "    do: deny",
        "    when:",
        "      tool: read_file",
      ].join("\n"),
    );
    expect(lintPolicy(policy)).toEqual([
      {
        rule: "ok",
        message: 'Never takes effect: deny rule "no" covers the same calls.',
      },
    ]);
  });

  it("warns when a rule repeats an earlier rule", () => {
    const policy = parse(
      [
        "default: allow",
        "rules:",
        "  - name: a",
        "    do: deny",
        "    when:",
        "      tool: read_file",
        "  - name: b",
        "    do: deny",
        "    when:",
        "      tool: read_file",
      ].join("\n"),
    );
    expect(lintPolicy(policy)).toEqual([
      { rule: "b", message: 'Repeats rule "a".' },
    ]);
  });

  it("returns no warnings for a good policy", () => {
    const policy = parse(
      [
        "default: allow",
        "rules:",
        "  - name: block-ssh",
        "    do: deny",
        "    when:",
        "      tool_tag: reads_files",
        "      any_arg:",
        '        resolved_glob: "**/.ssh/**"',
      ].join("\n"),
    );
    expect(lintPolicy(policy)).toEqual([]);
  });
});

describe("findUnusedRules", () => {
  it("warns for rules not present in hits", () => {
    const policy = parse(
      [
        "default: allow",
        "rules:",
        "  - name: a",
        "    do: deny",
        "    when:",
        "      tool: read_file",
        "  - name: b",
        "    do: deny",
        "    when:",
        "      tool: send_http",
      ].join("\n"),
    );
    expect(findUnusedRules(policy, ["b"])).toEqual([
      { rule: "a", message: "Never applied in any test." },
    ]);
  });

  it("returns no warnings when all rules are in hits", () => {
    const policy = parse(
      [
        "default: allow",
        "rules:",
        "  - name: a",
        "    do: deny",
        "    when:",
        "      tool: read_file",
        "  - name: b",
        "    do: deny",
        "    when:",
        "      tool: send_http",
      ].join("\n"),
    );
    expect(findUnusedRules(policy, ["a", "b"])).toEqual([]);
  });
});
