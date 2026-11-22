import { describe, expect, it } from "vitest";
import { createVfs } from "../src/vfs";
import { makeSpec, ROOT, SECRET } from "./fixtures";

describe("vfs resolve", () => {
  it("resolves a path through a symlink", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    expect(vfs.resolve("/home/dev/project/keys/id_key")).toBe(
      "/home/dev/.ssh/id_key",
    );
  });

  it("resolves a tilde path with dot-dot segments", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    expect(vfs.resolve("~/project/../.ssh/id_key")).toBe(
      "/home/dev/.ssh/id_key",
    );
  });

  it("collapses double slashes in an absolute path", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    expect(vfs.resolve("//home//dev//project/readme.md")).toBe(
      "/home/dev/project/readme.md",
    );
  });

  it("resolves a relative path by prepending root", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    expect(vfs.resolve("project/readme.md")).toBe(
      "/home/dev/project/readme.md",
    );
  });

  it("resolves the link path itself to its target directory", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    expect(vfs.resolve("/home/dev/project/keys")).toBe("/home/dev/.ssh");
  });

  it("lowercases the result when caseInsensitive is true", () => {
    const vfs = createVfs(makeSpec({ caseInsensitive: true }), ROOT);
    expect(vfs.resolve("/HOME/DEV/.SSH/ID_KEY")).toBe("/home/dev/.ssh/id_key");
  });

  it("preserves case when caseInsensitive is false", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    expect(vfs.resolve("/HOME/DEV/.SSH/ID_KEY")).toBe("/HOME/DEV/.SSH/ID_KEY");
  });

  it("follows a chain of two links", () => {
    const vfs = createVfs(makeSpec({ links: { a: "b", b: "c" } }), ROOT);
    expect(vfs.resolve("/home/dev/a/x")).toBe("/home/dev/c/x");
  });

  it("does not hang when links form a cycle", () => {
    const vfs = createVfs(makeSpec({ links: { a: "b", b: "a" } }), ROOT);
    const result = vfs.resolve("/home/dev/a/x");
    expect(typeof result).toBe("string");
  });
});

describe("vfs read", () => {
  it("reads a plain file by absolute path", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    expect(vfs.read("/home/dev/project/readme.md")).toEqual({
      content: "hello",
      labels: [],
    });
  });

  it("reads a file through a symlink with its labels", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    expect(vfs.read("/home/dev/project/keys/id_key")).toEqual({
      content: SECRET,
      labels: ["PRIVATE"],
    });
  });

  it("returns null for a missing file", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    expect(vfs.read("/home/dev/does-not-exist.txt")).toBeNull();
  });

  it("returns null for a directory path", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    expect(vfs.read("/home/dev/project")).toBeNull();
  });
});

describe("vfs write", () => {
  it("creates a new file and reads it back with empty labels", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    const resolved = vfs.write("/home/dev/project/new.txt", "data");
    expect(resolved).toBe("/home/dev/project/new.txt");
    expect(vfs.read("/home/dev/project/new.txt")).toEqual({
      content: "data",
      labels: [],
    });
  });

  it("overwrites an existing file and preserves its labels", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    vfs.write("/home/dev/.ssh/id_key", "NEW");
    expect(vfs.read("/home/dev/.ssh/id_key")).toEqual({
      content: "NEW",
      labels: ["PRIVATE"],
    });
  });
});

describe("vfs remove", () => {
  it("removes an existing file and returns true, then null on read", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    expect(vfs.remove("/home/dev/project/readme.md")).toBe(true);
    expect(vfs.read("/home/dev/project/readme.md")).toBeNull();
  });

  it("returns false when removing a file that does not exist", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    vfs.remove("/home/dev/project/readme.md");
    expect(vfs.remove("/home/dev/project/readme.md")).toBe(false);
  });
});

describe("vfs move", () => {
  it("moves a file, old path is gone and new path has same content", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    const result = vfs.move(
      "/home/dev/project/readme.md",
      "/home/dev/project/moved.md",
    );
    expect(result).toEqual({
      from: "/home/dev/project/readme.md",
      to: "/home/dev/project/moved.md",
    });
    expect(vfs.read("/home/dev/project/readme.md")).toBeNull();
    expect(vfs.read("/home/dev/project/moved.md")?.content).toBe("hello");
  });

  it("returns null when the source does not exist", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    expect(vfs.move("/home/dev/missing.txt", "/home/dev/other.txt")).toBeNull();
  });
});

describe("vfs list", () => {
  it("lists direct children of a directory", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    expect(vfs.list("/home/dev/project")).toEqual([
      "data",
      "keys",
      "notes.txt",
      "readme.md",
      "src",
    ]);
  });

  it("lists the top-level entries under root", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    expect(vfs.list("/home/dev")).toEqual([".ssh", "project"]);
  });

  it("returns null for a non-existent directory", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    expect(vfs.list("/home/dev/nothing")).toBeNull();
  });

  it("returns null for a file path", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    expect(vfs.list("/home/dev/project/readme.md")).toBeNull();
  });
});

describe("vfs search", () => {
  it("finds a match in a file through its direct path", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    const hits = vfs.search("/home/dev", "secret-value");
    expect(hits).toEqual([
      {
        path: "/home/dev/.ssh/id_key",
        line: 1,
        text: SECRET,
        labels: ["PRIVATE"],
      },
    ]);
  });

  it("finds the same match through a symlink directory", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    const hits = vfs.search("/home/dev/project/keys", "secret-value");
    expect(hits).toEqual([
      {
        path: "/home/dev/.ssh/id_key",
        line: 1,
        text: SECRET,
        labels: ["PRIVATE"],
      },
    ]);
  });

  it("returns multiple matches across lines sorted by path and line", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    vfs.write("/home/dev/project/multi.txt", "a\nKEY1\nb\nKEY2");
    const hits = vfs.search("/home/dev/project", "KEY");
    expect(hits).toHaveLength(2);
    expect(hits[0]).toMatchObject({ line: 2, text: "KEY1" });
    expect(hits[1]).toMatchObject({ line: 4, text: "KEY2" });
  });

  it("returns an empty list when nothing matches", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    expect(vfs.search("/home/dev", "xyzzy-no-match")).toEqual([]);
  });
});
