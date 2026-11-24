import { describe, expect, it } from "vitest";
import { collectStrings } from "../src/args";

describe("collectStrings", () => {
  it("collects a single string", () => {
    expect(collectStrings("a")).toEqual(["a"]);
  });

  it("collects strings from nested structures in order", () => {
    const value = ["a", ["b"], { c: "d", e: 1 }, null, true];
    expect(collectStrings(value)).toEqual(["a", "b", "d"]);
  });

  it("returns empty array for non-string primitives", () => {
    expect(collectStrings(5)).toEqual([]);
  });
});
