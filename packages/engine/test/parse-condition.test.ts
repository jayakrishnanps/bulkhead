import { describe, expect, it } from "vitest";
import { parseCondition } from "../src/parse-condition";

describe("parseCondition", () => {
  it("returns empty condition for undefined and null", () => {
    const errors: string[] = [];
    expect(parseCondition(undefined, "where", errors)).toEqual({});
    expect(parseCondition(null, "where", errors)).toEqual({});
    expect(errors).toEqual([]);
  });

  it("parses tool and tool_tag conditions", () => {
    const errors: string[] = [];
    const input = { tool: "read_*", tool_tag: "reads_files" };
    expect(parseCondition(input, "where", errors)).toEqual(input);
    expect(errors).toEqual([]);
  });

  it("parses arg prefix into args record", () => {
    const errors: string[] = [];
    const input = { "arg.path": { resolved_glob: "**/.ssh/**" } };
    const expected = { args: { path: { resolved_glob: "**/.ssh/**" } } };
    expect(parseCondition(input, "where", errors)).toEqual(expected);
    expect(errors).toEqual([]);
  });

  it("parses any_arg, session_has, tool_changed, and max_calls", () => {
    const errors: string[] = [];
    const input = {
      any_arg: { carries: ["PRIVATE"] },
      session_has: ["UNTRUSTED"],
      tool_changed: true,
      max_calls: 3,
    };
    expect(parseCondition(input, "where", errors)).toEqual(input);
    expect(errors).toEqual([]);
  });

  it("returns null and records errors for invalid conditions", () => {
    const where = "rule.when";

    const errorCases = [
      { input: "text", snippet: "must be a mapping" },
      { input: { color: "red" }, snippet: 'unknown key "color"' },
      { input: { tool: "" }, snippet: null },
      { input: { max_calls: 0 }, snippet: null },
      { input: { tool_changed: "yes" }, snippet: null },
      { input: { session_has: ["X"] }, snippet: null },
      { input: { "arg.": { glob: "a" } }, snippet: "bad argument name" },
      { input: { "arg.path": { glob: "a", equals: "b" } }, snippet: null },
      { input: { any_arg: {} }, snippet: null },
    ];

    for (const testCase of errorCases) {
      const errors: string[] = [];
      const result = parseCondition(testCase.input, where, errors);
      expect(result).toBeNull();
      expect(errors.length).toBeGreaterThan(0);
      for (const err of errors) {
        expect(err.startsWith(where)).toBe(true);
      }
      if (testCase.snippet !== null) {
        const joined = errors.join(" ");
        expect(joined.includes(testCase.snippet)).toBe(true);
      }
    }
  });
});
