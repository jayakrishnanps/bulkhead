import { describe, expect, it } from "vitest";
import { expandTemplate, expandValue } from "../src/templates";

describe("expandTemplate", () => {
  it("replaces a single placeholder with the matching result", () => {
    expect(expandTemplate("{{r0}}", ["secret"])).toBe("secret");
  });

  it("replaces the correct indexed placeholder", () => {
    expect(expandTemplate("a{{r1}}b", ["x", "y"])).toBe("ayb");
  });

  it("applies the upper transform", () => {
    expect(expandTemplate("{{r0}}-{{r1|upper}}", ["a", "b"])).toBe("a-B");
  });

  it("applies the base64 transform", () => {
    expect(expandTemplate("{{r0|base64}}", ["hello"])).toBe("aGVsbG8=");
  });

  it("applies the hex transform", () => {
    expect(expandTemplate("{{r0|hex}}", ["hi"])).toBe("6869");
  });

  it("applies the urlenc transform", () => {
    expect(expandTemplate("{{r0|urlenc}}", ["a b&c"])).toBe("a%20b%26c");
  });

  it("applies the slice transform", () => {
    expect(expandTemplate("{{r0|slice:1:3}}", ["abcdef"])).toBe("bcd");
  });

  it("chains base64 then slice", () => {
    expect(expandTemplate("{{r0|base64|slice:0:4}}", ["hello"])).toBe("aGVs");
  });

  it("chains slice then base64", () => {
    expect(expandTemplate("{{r0|slice:0:3|base64}}", ["hello"])).toBe("aGVs");
  });

  it("applies the base64url transform", () => {
    expect(expandTemplate("{{r0|base64url}}", ["???>>>"])).toBe("Pz8_Pj4-");
  });

  it("uses an empty string when the index is out of bounds", () => {
    expect(expandTemplate("{{r5}}", ["a"])).toBe("");
  });

  it("leaves text unchanged for an unknown transform", () => {
    expect(expandTemplate("{{r0|shout}}", ["abc"])).toBe("abc");
  });

  it("leaves text unchanged for toString transform", () => {
    expect(expandTemplate("{{r0|toString}}", ["abc"])).toBe("abc");
  });

  it("leaves text unchanged for __proto__ transform", () => {
    expect(expandTemplate("{{r0|__proto__}}", ["abc"])).toBe("abc");
  });

  it("returns text unchanged when there are no placeholders", () => {
    expect(expandTemplate("no placeholders", [])).toBe("no placeholders");
  });
});

describe("expandValue", () => {
  it("expands strings, arrays, and objects recursively while leaving numbers as-is", () => {
    const input = { url: "x{{r0}}", paths: ["{{r0}}", "p"], n: 1 };
    const expected = { url: "xz", paths: ["z", "p"], n: 1 };
    expect(expandValue(input, ["z"])).toEqual(expected);
  });
});
