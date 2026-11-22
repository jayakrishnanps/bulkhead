import { describe, expect, it } from "vitest";
import {
  isLabelList,
  isNonEmptyString,
  isNonEmptyStringList,
  isRecord,
  isWholeNumber,
} from "../src/guards";

describe("guards", () => {
  it("checks isRecord", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord([])).toBe(false);
    expect(isRecord("x")).toBe(false);
  });

  it("checks isNonEmptyString", () => {
    expect(isNonEmptyString("")).toBe(false);
    expect(isNonEmptyString("a")).toBe(true);
  });

  it("checks isNonEmptyStringList", () => {
    expect(isNonEmptyStringList([])).toBe(false);
    expect(isNonEmptyStringList(["a", 1])).toBe(false);
    expect(isNonEmptyStringList(["a"])).toBe(true);
  });

  it("checks isWholeNumber", () => {
    expect(isWholeNumber(2, 1)).toBe(true);
    expect(isWholeNumber(0, 1)).toBe(false);
    expect(isWholeNumber(1.5, 0)).toBe(false);
  });

  it("checks isLabelList", () => {
    expect(isLabelList(["PRIVATE"])).toBe(true);
    expect(isLabelList(["X"])).toBe(false);
    expect(isLabelList([])).toBe(false);
  });
});
