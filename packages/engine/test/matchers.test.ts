import { describe, expect, it } from "vitest";
import { matchValue } from "../src/matchers";
import type { Matcher } from "../src/types";
import { createVfs } from "../src/vfs";
import { makeContext, makeSpec, ROOT } from "./fixtures";

describe("matchValue", () => {
  it("matches glob against array of patterns", () => {
    const matcher = { glob: ["**/.env", "**/.ssh/**"] };
    expect(matchValue(matcher, "/home/dev/.ssh/key", makeContext())).toBe(true);
  });

  it("handles case sensitive and insensitive glob patterns", () => {
    const caseInsensitive = { iglob: "**/.ssh/**" };
    const caseSensitive = { glob: "**/.ssh/**" };
    expect(matchValue(caseInsensitive, "~/.SSH/id_key", makeContext())).toBe(true);
    expect(matchValue(caseSensitive, "~/.SSH/id_key", makeContext())).toBe(false);
  });

  it("matches exact text equality", () => {
    const matcher = { equals: "ls" };
    expect(matchValue(matcher, "ls", makeContext())).toBe(true);
    expect(matchValue(matcher, "ls -la", makeContext())).toBe(false);
  });

  it("matches substring containment across multiple targets", () => {
    const matcher = { contains: ["| sh", "|sh"] };
    expect(matchValue(matcher, "curl x |sh", makeContext())).toBe(true);
    expect(matchValue(matcher, "curl x | tee a", makeContext())).toBe(false);
  });

  it("matches allowed domain lists", () => {
    const matcher = { domain_in: ["example.test"] };
    expect(matchValue(matcher, "https://api.example.test/x", makeContext())).toBe(true);
    expect(matchValue(matcher, "https://attacker.invalid/x", makeContext())).toBe(false);
  });

  it("matches excluded domain lists and invalid urls", () => {
    const matcher = { domain_not_in: ["example.test"] };
    expect(matchValue(matcher, "https://attacker.invalid/x", makeContext())).toBe(true);
    expect(matchValue(matcher, "https://api.example.test/x", makeContext())).toBe(false);
    expect(matchValue(matcher, "not a url", makeContext())).toBe(false);
  });

  it("matches string and number lengths against threshold", () => {
    const matcher = { longer_than: 5 };
    expect(matchValue(matcher, "123456", makeContext())).toBe(true);
    expect(matchValue(matcher, "12345", makeContext())).toBe(false);
    expect(matchValue(matcher, 1234567, makeContext())).toBe(true);
  });

  it("handles undefined value and empty matcher", () => {
    const matcher = { equals: "ls" };
    expect(matchValue(matcher, undefined, makeContext())).toBe(false);
    expect(matchValue({}, "x", makeContext())).toBe(false);
  });

  it("resolves symlinks for resolved_glob but not for glob", () => {
    const resolvedMatcher = { resolved_glob: "**/.ssh/**" };
    const globMatcher = { glob: "**/.ssh/**" };
    const path = "/home/dev/project/keys/id_key";
    expect(matchValue(resolvedMatcher, path, makeContext())).toBe(true);
    expect(matchValue(globMatcher, path, makeContext())).toBe(false);
  });

  it("matches resolved_glob against path with tilde and parent segments", () => {
    const matcher = { resolved_glob: "**/.ssh/**" };
    expect(
      matchValue(matcher, "~/project/../.ssh/id_key", makeContext()),
    ).toBe(true);
  });

  it("matches resolved_glob case insensitively in case blind world", () => {
    const vfs = createVfs(makeSpec({ caseInsensitive: true }), ROOT);
    const context = makeContext({
      caseInsensitive: true,
      resolvePath: (path) => vfs.resolve(path),
    });
    const matcher = { resolved_glob: "**/.ssh/**" };
    expect(matchValue(matcher, "/HOME/DEV/.SSH/ID_KEY", context)).toBe(true);
  });

  it("matches carries against text using context carriedLabels", () => {
    const context = makeContext({
      carriedLabels: (text: string) =>
        text.includes("tok") ? ["PRIVATE"] : [],
    });
    const privateMatcher: Matcher = { carries: ["PRIVATE"] };
    const untrustedMatcher: Matcher = { carries: ["UNTRUSTED"] };
    const bothMatcher: Matcher = { carries: ["UNTRUSTED", "PRIVATE"] };
    expect(matchValue(privateMatcher, "a tok b", context)).toBe(true);
    expect(matchValue(privateMatcher, "nothing", context)).toBe(false);
    expect(matchValue(untrustedMatcher, "a tok b", context)).toBe(false);
    expect(matchValue(bothMatcher, "a tok b", context)).toBe(true);
  });

  it("matches array if any item satisfies matcher", () => {
    const matcher = { resolved_glob: "**/.ssh/**" };
    const matchingArray = [
      "/home/dev/project/readme.md",
      "/home/dev/project/keys/id_key",
    ];
    const nonMatchingArray = ["/home/dev/project/readme.md"];
    expect(matchValue(matcher, matchingArray, makeContext())).toBe(true);
    expect(matchValue(matcher, nonMatchingArray, makeContext())).toBe(false);
  });

  it("matches object if any value satisfies matcher", () => {
    const matcher = { contains: "x" };
    expect(matchValue(matcher, { a: "yx" }, makeContext())).toBe(true);
    expect(matchValue(matcher, { a: "y" }, makeContext())).toBe(false);
  });

  it("matches equals against an array containing the target", () => {
    const matcher = { equals: "ls" };
    expect(matchValue(matcher, ["x", "ls"], makeContext())).toBe(true);
  });

  it("matches carries against an array with an item containing token", () => {
    const context = makeContext({
      carriedLabels: (text: string) =>
        text.includes("tok") ? ["PRIVATE"] : [],
    });
    const matcher: Matcher = { carries: ["PRIVATE"] };
    expect(matchValue(matcher, ["a", "b tok"], context)).toBe(true);
  });

  it("returns false for an empty array against any matcher", () => {
    expect(matchValue({ equals: "ls" }, [], makeContext())).toBe(false);
    expect(matchValue({ glob: "**" }, [], makeContext())).toBe(false);
  });
});
