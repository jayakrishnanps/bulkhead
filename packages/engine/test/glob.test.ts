import { describe, expect, it } from "vitest";
import { matchGlob } from "../src/glob";

describe("matchGlob", () => {
  it("matches nested path with double stars", () => {
    expect(matchGlob("**/.ssh/**", "/home/dev/.ssh/id_key", false)).toBe(true);
    expect(matchGlob("**/.ssh/**", "/home/dev/project/ssh-notes.md", false)).toBe(false);
  });

  it("matches single segment extension", () => {
    expect(matchGlob("*.md", "README.md", false)).toBe(true);
    expect(matchGlob("*.md", "src/README.md", false)).toBe(false);
  });

  it("matches directory prefix with recursive wildcard", () => {
    expect(matchGlob("src/**/*.ts", "src/a/b/c.ts", false)).toBe(true);
    expect(matchGlob("src/**/*.ts", "src/c.ts", false)).toBe(true);
    expect(matchGlob("src/**/*.ts", "lib/c.ts", false)).toBe(false);
  });

  it("matches question mark character", () => {
    expect(matchGlob("file?.txt", "file1.txt", false)).toBe(true);
    expect(matchGlob("file?.txt", "file12.txt", false)).toBe(false);
  });

  it("handles case sensitivity correctly", () => {
    expect(matchGlob("**/.SSH/**", "/home/dev/.ssh/key", true)).toBe(true);
    expect(matchGlob("**/.SSH/**", "/home/dev/.ssh/key", false)).toBe(false);
  });

  it("matches double star against multiple segments and empty string", () => {
    expect(matchGlob("**", "a/b/c", false)).toBe(true);
    expect(matchGlob("**", "", false)).toBe(true);
  });

  it("matches single star within a segment", () => {
    expect(matchGlob("*", "abc", false)).toBe(true);
    expect(matchGlob("*", "a/b", false)).toBe(false);
  });
});
