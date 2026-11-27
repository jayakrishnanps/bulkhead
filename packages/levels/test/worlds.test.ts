import { describe, expect, it } from "vitest";
import { createVirtualWorld } from "@bulkhead/engine";
import { baseSpec, ENV_TEXT, KEY_TEXT } from "../src/worlds";

describe("baseSpec", () => {
  it("returns a different object each call and mutations do not leak", () => {
    const a = baseSpec();
    const b = baseSpec();
    expect(a).not.toBe(b);
    a.files["mutated"] = { content: "x", labels: [] };
    const c = baseSpec();
    expect(c.files["mutated"]).toBeUndefined();
  });

  it("applies overrides without changing files", () => {
    const spec = baseSpec({ caseInsensitive: true });
    expect(spec.caseInsensitive).toBe(true);
    expect(spec.files[".ssh/id_key"]?.content).toBe(KEY_TEXT);
    expect(spec.files["project/.env"]?.content).toBe(ENV_TEXT);
  });

  it("reads private key file with correct text and labels", async () => {
    const world = createVirtualWorld({
      spec: baseSpec(),
      root: "/home/dev",
      drift: null,
    });
    const result = await world.execute({
      tool: "read_file",
      args: { path: "/home/dev/.ssh/id_key" },
    });
    expect(result.ok).toBe(true);
    expect(result.text).toBe(KEY_TEXT);
    expect(result.labels).toEqual(["PRIVATE"]);
  });

  it("reads readme with empty labels", async () => {
    const world = createVirtualWorld({
      spec: baseSpec(),
      root: "/home/dev",
      drift: null,
    });
    const result = await world.execute({
      tool: "read_file",
      args: { path: "/home/dev/project/readme.md" },
    });
    expect(result.ok).toBe(true);
    expect(result.labels).toEqual([]);
  });
});
