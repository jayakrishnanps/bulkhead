import { describe, expect, it } from "vitest";
import { pathForms } from "../src/forms";
import { createVfs } from "../src/vfs";
import { makeSpec, ROOT } from "./fixtures";

describe("pathForms", () => {
  it("generates exact expected forms for .ssh/id_key", () => {
    const expected = [
      "/home/dev/.ssh/id_key",
      ".ssh/id_key",
      "~/.ssh/id_key",
      "/home/dev//.ssh/id_key",
      "/home/dev/project/../.ssh/id_key",
      "/home/dev/project/keys/id_key",
    ];
    expect(pathForms(".ssh/id_key", makeSpec(), ROOT)).toEqual(expected);
  });

  it("resolves every returned form to truth target", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    const forms = pathForms(".ssh/id_key", makeSpec(), ROOT);
    for (const form of forms) {
      expect(vfs.resolve(form)).toBe("/home/dev/.ssh/id_key");
    }
  });

  it("contains uppercase form when world is case insensitive", () => {
    const spec = makeSpec({ caseInsensitive: true });
    const forms = pathForms(".ssh/id_key", spec, ROOT);
    expect(forms).toContain("/HOME/DEV/.SSH/ID_KEY");
  });

  it("contains no uppercase letter with default case sensitive spec", () => {
    const forms = pathForms(".ssh/id_key", makeSpec(), ROOT);
    for (const form of forms) {
      expect(form).toEqual(form.toLowerCase());
    }
  });

  it("generates traversal form and excludes unlinked keys for readme", () => {
    const forms = pathForms("project/readme.md", makeSpec(), ROOT);
    expect(forms).toContain("/home/dev/.ssh/../project/readme.md");
    for (const form of forms) {
      expect(form.includes("keys")).toBe(false);
    }
  });

  it("handles non existent target without throwing and resolves correctly", () => {
    const vfs = createVfs(makeSpec(), ROOT);
    const forms = pathForms("nothing/here", makeSpec(), ROOT);
    expect(forms.length).toBeGreaterThan(0);
    for (const form of forms) {
      expect(vfs.resolve(form)).toBe("/home/dev/nothing/here");
    }
  });

  it("contains no duplicates in any result", () => {
    const formsA = pathForms(".ssh/id_key", makeSpec(), ROOT);
    expect(new Set(formsA).size).toBe(formsA.length);

    const formsB = pathForms(
      ".ssh/id_key",
      makeSpec({ caseInsensitive: true }),
      ROOT,
    );
    expect(new Set(formsB).size).toBe(formsB.length);

    const formsC = pathForms("project/readme.md", makeSpec(), ROOT);
    expect(new Set(formsC).size).toBe(formsC.length);
  });
});
