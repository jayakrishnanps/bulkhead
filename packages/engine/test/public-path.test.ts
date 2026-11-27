import { describe, expect, it } from "vitest";
import { publicFilePath } from "../src/public-path";
import { makeSpec, ROOT } from "./fixtures";

describe("publicFilePath", () => {
  it("builds a concrete file path from the default spec", () => {
    expect(publicFilePath(makeSpec(), ROOT)).toBe(
      "/home/dev/project/public/out.txt",
    );
  });

  it("returns null when publicPaths is empty", () => {
    expect(publicFilePath(makeSpec({ publicPaths: [] }), ROOT)).toBeNull();
  });

  it("replaces single-segment wildcard with x", () => {
    const spec = makeSpec({ publicPaths: ["**/project/public/*.txt"] });
    expect(publicFilePath(spec, ROOT)).toBe(
      "/home/dev/project/public/x.txt",
    );
  });

  it("preserves leading slash and replaces trailing wildcard", () => {
    const spec = makeSpec({ publicPaths: ["/srv/pub/**"] });
    expect(publicFilePath(spec, ROOT)).toBe("/srv/pub/out.txt");
  });
});
