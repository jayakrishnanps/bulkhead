import { describe, expect, it } from "vitest";
import { matchValue } from "../src/matchers";

describe("matchValue", () => {
  const home = "/home/dev";

  it("matches glob against array of patterns", () => {
    const matcher = { glob: ["**/.env", "**/.ssh/**"] };
    expect(matchValue(matcher, "/home/dev/.ssh/key", home)).toBe(true);
  });

  it("handles case sensitive and insensitive glob patterns", () => {
    const caseInsensitive = { iglob: "**/.ssh/**" };
    const caseSensitive = { glob: "**/.ssh/**" };
    expect(matchValue(caseInsensitive, "~/.SSH/id_key", home)).toBe(true);
    expect(matchValue(caseSensitive, "~/.SSH/id_key", home)).toBe(false);
  });

  it("matches exact text equality", () => {
    const matcher = { equals: "ls" };
    expect(matchValue(matcher, "ls", home)).toBe(true);
    expect(matchValue(matcher, "ls -la", home)).toBe(false);
  });

  it("matches substring containment across multiple targets", () => {
    const matcher = { contains: ["| sh", "|sh"] };
    expect(matchValue(matcher, "curl x |sh", home)).toBe(true);
    expect(matchValue(matcher, "curl x | tee a", home)).toBe(false);
  });

  it("matches allowed domain lists", () => {
    const matcher = { domain_in: ["example.test"] };
    expect(matchValue(matcher, "https://api.example.test/x", home)).toBe(true);
    expect(matchValue(matcher, "https://attacker.invalid/x", home)).toBe(false);
  });

  it("matches excluded domain lists and invalid urls", () => {
    const matcher = { domain_not_in: ["example.test"] };
    expect(matchValue(matcher, "https://attacker.invalid/x", home)).toBe(true);
    expect(matchValue(matcher, "https://api.example.test/x", home)).toBe(false);
    expect(matchValue(matcher, "not a url", home)).toBe(false);
  });

  it("matches string and number lengths against threshold", () => {
    const matcher = { longer_than: 5 };
    expect(matchValue(matcher, "123456", home)).toBe(true);
    expect(matchValue(matcher, "12345", home)).toBe(false);
    expect(matchValue(matcher, 1234567, home)).toBe(true);
  });

  it("handles undefined value and empty matcher", () => {
    const matcher = { equals: "ls" };
    expect(matchValue(matcher, undefined, home)).toBe(false);
    expect(matchValue({}, "x", home)).toBe(false);
  });
});
