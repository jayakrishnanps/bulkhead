import { describe, expect, it } from "vitest";
import {
  countCall,
  createEffects,
  recordDestroyed,
  recordPublication,
  recordRequest,
} from "../src/effects";

describe("effects", () => {
  it("createEffects returns empty lists and an empty calls object", () => {
    const effects = createEffects();
    expect(effects.requests).toEqual([]);
    expect(effects.published).toEqual([]);
    expect(effects.destroyed).toEqual([]);
    expect(effects.calls).toEqual({});
  });

  it("recordRequest and recordPublication each add one item", () => {
    const effects = createEffects();
    recordRequest(effects, { url: "https://example.test", body: "", via: "tool" });
    recordPublication(effects, { path: "out.txt", content: "hello" });
    expect(effects.requests).toHaveLength(1);
    expect(effects.published).toHaveLength(1);
  });

  it("recordDestroyed adds a path only once when called twice with the same path", () => {
    const effects = createEffects();
    recordDestroyed(effects, "data/secret.txt");
    recordDestroyed(effects, "data/secret.txt");
    expect(effects.destroyed).toEqual(["data/secret.txt"]);
  });

  it("countCall returns 1 then 2 for the same tool and 1 for a different tool", () => {
    const effects = createEffects();
    expect(countCall(effects, "read_file")).toBe(1);
    expect(countCall(effects, "read_file")).toBe(2);
    expect(countCall(effects, "send_http")).toBe(1);
  });
});
