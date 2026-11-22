import { describe, expect, it } from "vitest";
import { containsSecret } from "../src/detectors";

describe("detectors", () => {
  it("detects secrets across common formats", () => {
    expect(containsSecret("-----BEGIN PRIVATE KEY-----")).toBe(true);
    expect(containsSecret("-----BEGIN OPENSSH PRIVATE KEY-----")).toBe(true);
    expect(containsSecret("AKIAABCDEFGHIJKLMNOP")).toBe(true);
    expect(containsSecret(`ghp_${"a".repeat(36)}`)).toBe(true);
    expect(containsSecret(`sk-${"a".repeat(24)}`)).toBe(true);
    expect(containsSecret("eyJhbGciOiJI.eyJzdWIiOiIx.abcdefghijk")).toBe(true);
  });

  it("returns false for non secret text", () => {
    expect(containsSecret("hello world")).toBe(false);
    expect(containsSecret("AKIA1234")).toBe(false);
    expect(containsSecret("sk-short")).toBe(false);
    expect(containsSecret("the key is under the mat")).toBe(false);
  });
});
