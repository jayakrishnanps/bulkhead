import { describe, expect, it } from "vitest";
import { normalizePath } from "../src/path";

describe("normalizePath", () => {
  const home = "/home/dev";

  it("resolves parent directory in absolute path", () => {
    const input = "/home/dev/project/../.ssh/id_key";
    expect(normalizePath(input, home)).toBe("/home/dev/.ssh/id_key");
  });

  it("collapses duplicate slashes", () => {
    expect(normalizePath("//home//dev///x", home)).toBe("/home/dev/x");
  });

  it("expands home tilde prefix", () => {
    expect(normalizePath("~/.ssh/id_key", home)).toBe("/home/dev/.ssh/id_key");
  });

  it("converts backslashes to forward slashes", () => {
    const input = "\\home\\dev\\.ssh\\id_key";
    expect(normalizePath(input, home)).toBe("/home/dev/.ssh/id_key");
  });

  it("removes current directory dots", () => {
    expect(normalizePath("/home/dev/./a/./b", home)).toBe("/home/dev/a/b");
  });

  it("handles relative and root parent directory navigation", () => {
    expect(normalizePath("../x", home)).toBe("../x");
    expect(normalizePath("/../x", home)).toBe("/x");
    expect(normalizePath("a/b/../../c", home)).toBe("c");
  });

  it("handles empty string and single slash", () => {
    expect(normalizePath("", home)).toBe("");
    expect(normalizePath("/", home)).toBe("/");
  });

  it("preserves Windows drive paths with forward slashes", () => {
    const input = "C:\\Users\\dev\\.ssh\\id_key";
    expect(normalizePath(input, home)).toBe("C:/Users/dev/.ssh/id_key");
  });
});
