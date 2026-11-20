import { describe, expect, it } from "vitest";
import { stableStringify } from "../src/stable-json";

describe("stableStringify", () => {
  it("sorts object keys alphabetically", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("sorts nested object keys at every level", () => {
    const input = {
      z: { d: 4, c: 3 },
      a: { b: 2, a: 1 },
    };
    expect(stableStringify(input)).toBe(
      '{"a":{"a":1,"b":2},"z":{"c":3,"d":4}}',
    );
  });

  it("preserves array element order", () => {
    expect(stableStringify([3, 1, 2])).toBe("[3,1,2]");
    expect(stableStringify([{ b: 2, a: 1 }, { d: 4, c: 3 }])).toBe(
      '[{"a":1,"b":2},{"c":3,"d":4}]',
    );
  });

  it("handles null numbers strings and booleans correctly", () => {
    expect(stableStringify(null)).toBe("null");
    expect(stableStringify(123)).toBe("123");
    expect(stableStringify("hello")).toBe('"hello"');
    expect(stableStringify(true)).toBe("true");
    expect(stableStringify(false)).toBe("false");
  });
});
