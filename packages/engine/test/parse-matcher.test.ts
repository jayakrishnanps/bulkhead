import { describe, expect, it } from "vitest";
import { parseMatcher } from "../src/parse-matcher";

describe("parseMatcher", () => {
  it("returns matcher as it is for valid matchers", () => {
    const errors: string[] = [];

    const globMatcher = parseMatcher(
      { glob: "**/.ssh/**" },
      "rule.when",
      errors,
    );
    expect(globMatcher).toEqual({ glob: "**/.ssh/**" });

    const equalsMatcher = parseMatcher(
      { equals: ["a", "b"] },
      "rule.when",
      errors,
    );
    expect(equalsMatcher).toEqual({ equals: ["a", "b"] });

    const domainMatcher = parseMatcher(
      { domain_in: ["example.test"] },
      "rule.when",
      errors,
    );
    expect(domainMatcher).toEqual({ domain_in: ["example.test"] });

    const longerMatcher = parseMatcher(
      { longer_than: 0 },
      "rule.when",
      errors,
    );
    expect(longerMatcher).toEqual({ longer_than: 0 });

    const carriesMatcher = parseMatcher(
      { carries: ["PRIVATE"] },
      "rule.when",
      errors,
    );
    expect(carriesMatcher).toEqual({ carries: ["PRIVATE"] });

    expect(errors).toEqual([]);
  });

  it("returns null and records error for invalid matchers", () => {
    const where = "test.location";

    const cases = [
      { input: { glob: "a", equals: "b" }, unknownKey: false },
      { input: {}, unknownKey: false },
      { input: "text", unknownKey: false },
      { input: { color: "red" }, unknownKey: true },
      { input: { glob: "" }, unknownKey: false },
      { input: { domain_in: [] }, unknownKey: false },
      { input: { longer_than: -1 }, unknownKey: false },
      { input: { carries: ["X"] }, unknownKey: false },
    ];

    for (const testCase of cases) {
      const errors: string[] = [];
      const result = parseMatcher(testCase.input, where, errors);
      expect(result).toBeNull();
      expect(errors.length).toBeGreaterThan(0);
      const firstError = errors[0];
      expect(firstError).toBeDefined();
      if (firstError !== undefined) {
        expect(firstError.includes(where)).toBe(true);
        if (testCase.unknownKey) {
          expect(firstError.includes("unknown matcher")).toBe(true);
        }
      }
    }
  });
});
