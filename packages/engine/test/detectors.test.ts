import { describe, expect, it } from "vitest";
import {
  containsHiddenText,
  containsSecret,
  isSensitivePath,
} from "../src/detectors";

describe("detectors", () => {
  const home = "/home/dev";

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

  it("detects hidden and invisible unicode characters", () => {
    expect(containsHiddenText(`a\u200Bb`)).toBe(true);
    expect(containsHiddenText("test\u{E0041}")).toBe(true);
    expect(containsHiddenText("plain text")).toBe(false);
    expect(containsHiddenText("café")).toBe(false);
  });

  it("identifies default and extra sensitive paths", () => {
    expect(isSensitivePath("/home/dev/.ssh/id_key", [], home)).toBe(true);
    expect(isSensitivePath("~/.aws/credentials", [], home)).toBe(true);
    expect(
      isSensitivePath("/home/dev/project/.env.production", [], home),
    ).toBe(true);
    expect(isSensitivePath("/HOME/DEV/.ENV", [], home)).toBe(true);
    expect(isSensitivePath("/home/dev/project/README.md", [], home)).toBe(false);
    expect(
      isSensitivePath("/home/dev/project/customers.csv", ["**/customers.csv"], home),
    ).toBe(true);
    expect(
      isSensitivePath("/home/dev/project/customers.csv", [], home),
    ).toBe(false);
  });
});
