import { describe, expect, it } from "vitest";
import {
  addLabels,
  createSession,
  hasAllLabels,
  isToolChanged,
  registerCall,
  registerToolUpdate,
} from "../src/session";
import type { ToolDef } from "../src/types";

describe("session memory", () => {
  it("tracks labels without duplication and checks presence", () => {
    const session = createSession([]);
    expect(session.labels.length).toBe(0);

    addLabels(session, ["PRIVATE"]);
    addLabels(session, ["PRIVATE", "UNTRUSTED"]);
    expect(session.labels).toEqual(["PRIVATE", "UNTRUSTED"]);

    expect(hasAllLabels(session, ["PRIVATE"])).toBe(true);
    expect(hasAllLabels(session, ["PRIVATE", "UNTRUSTED"])).toBe(true);
    expect(hasAllLabels(session, ["SECRET"])).toBe(false);
    expect(hasAllLabels(session, ["PRIVATE", "SECRET"])).toBe(false);
  });

  it("registers call counts deterministically regardless of key order", () => {
    const session = createSession([]);
    const firstCount = registerCall(session, "bash", {
      command: "ls",
      path: "/tmp",
    });
    expect(firstCount).toBe(1);

    const secondCount = registerCall(session, "bash", {
      path: "/tmp",
      command: "ls",
    });
    expect(secondCount).toBe(2);

    const differentArgsCount = registerCall(session, "bash", {
      command: "pwd",
    });
    expect(differentArgsCount).toBe(1);
  });

  it("detects tool description updates without duplicate changed entries", () => {
    const initialTools: ToolDef[] = [
      {
        name: "bash",
        tags: ["terminal"],
        description: "Initial description",
      },
    ];
    const session = createSession(initialTools);

    registerToolUpdate(session, "bash", "Initial description");
    expect(isToolChanged(session, "bash")).toBe(false);

    registerToolUpdate(session, "bash", "Modified description once");
    expect(isToolChanged(session, "bash")).toBe(true);
    expect(session.changedTools).toEqual(["bash"]);

    registerToolUpdate(session, "bash", "Modified description twice");
    expect(isToolChanged(session, "bash")).toBe(true);
    expect(session.changedTools).toEqual(["bash"]);
  });
});
