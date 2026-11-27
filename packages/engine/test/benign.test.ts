import { describe, expect, it } from "vitest";
import { runBenign, runBenignDetailed } from "../src/benign";
import { parsePolicy } from "../src/policy";
import type { Policy } from "../src/types";
import { createVirtualWorld } from "../src/world";
import { makeLevel, makeSpec, ROOT } from "./fixtures";

function parse(text: string): Policy {
  const result = parsePolicy(text);
  if (result.ok === false) {
    throw new Error(result.errors.join("\n"));
  }
  return result.policy;
}

describe("runBenign", () => {
  it("completes both tasks with default allow", async () => {
    const policy = parse("default: allow");
    const world = createVirtualWorld({
      spec: makeSpec(),
      root: ROOT,
      drift: null,
    });
    const level = makeLevel();
    const results = await runBenign({ level, policy, world });
    expect(results.length).toBe(2);
    expect(results[0]?.completed).toBe(true);
    expect(results[0]?.asks).toBe(0);
    expect(results[0]?.blockedStep).toBe(null);
    expect(results[0]?.reason).toBe(null);
    expect(results[1]?.completed).toBe(true);
    expect(results[1]?.asks).toBe(0);
    expect(results[1]?.blockedStep).toBe(null);
    expect(results[1]?.reason).toBe(null);
  });

  it("blocks sending when tool_tag sends_out is denied", async () => {
    const policy = parse(
      [
        "default: allow",
        "rules:",
        "  - name: block-send",
        "    do: deny",
        "    when:",
        "      tool_tag: sends_out",
        '    say: "no sending"',
      ].join("\n"),
    );
    const world = createVirtualWorld({
      spec: makeSpec(),
      root: ROOT,
      drift: null,
    });
    const level = makeLevel();
    const results = await runBenign({ level, policy, world });
    expect(results[0]?.completed).toBe(true);
    expect(results[1]?.completed).toBe(false);
    expect(results[1]?.blockedStep).toBe(1);
    expect(results[1]?.reason).toBe("no sending");
  });

  it("completes both tasks when ask count is within threshold", async () => {
    const policy = parse(
      [
        "default: allow",
        "rules:",
        "  - name: ask-send",
        "    do: ask",
        "    when:",
        "      tool: send_http",
      ].join("\n"),
    );
    const world = createVirtualWorld({
      spec: makeSpec(),
      root: ROOT,
      drift: null,
    });
    const level = makeLevel();
    const results = await runBenign({ level, policy, world });
    expect(results[0]?.completed).toBe(true);
    expect(results[1]?.completed).toBe(true);
    expect(results[1]?.asks).toBe(1);
  });

  it("fails task with too many questions when exceeding maxAsksPerTask", async () => {
    const policy = parse(
      [
        "default: allow",
        "rules:",
        "  - name: ask-send",
        "    do: ask",
        "    when:",
        "      tool: send_http",
      ].join("\n"),
    );
    const world = createVirtualWorld({
      spec: makeSpec(),
      root: ROOT,
      drift: null,
    });
    const level = makeLevel({ maxAsksPerTask: 0 });
    const results = await runBenign({ level, policy, world });
    expect(results[1]?.completed).toBe(false);
    expect(results[1]?.blockedStep).toBe(null);
    expect(results[1]?.reason).toBe("Too many questions (1)");
  });

  it("fails second step on default deny when only read_file is allowed", async () => {
    const policy = parse(
      [
        "default: deny",
        "rules:",
        "  - name: allow-read",
        "    do: allow",
        "    when:",
        "      tool: read_file",
      ].join("\n"),
    );
    const world = createVirtualWorld({
      spec: makeSpec(),
      root: ROOT,
      drift: null,
    });
    const level = makeLevel();
    const results = await runBenign({ level, policy, world });
    expect(results[0]?.completed).toBe(true);
    expect(results[1]?.completed).toBe(false);
    expect(results[1]?.blockedStep).toBe(1);
    expect(results[1]?.reason).toBe("Default: deny");
  });

  it("returns results in task order", async () => {
    const policy = parse("default: allow");
    const world = createVirtualWorld({
      spec: makeSpec(),
      root: ROOT,
      drift: null,
    });
    const level = makeLevel();
    const results = await runBenign({ level, policy, world });
    expect(results.map((r) => r.taskId)).toEqual(["read", "report"]);
  });

  it("resets world effects between tasks", async () => {
    const policy = parse("default: allow");
    const world = createVirtualWorld({
      spec: makeSpec(),
      root: ROOT,
      drift: null,
    });
    const level = makeLevel({
      benign: [
        {
          id: "send",
          title: "Send data",
          steps: [
            {
              tool: "send_http",
              args: {
                url: "https://api.example.test/log",
                body: "test",
              },
            },
          ],
        },
        {
          id: "read",
          title: "Read data",
          steps: [
            {
              tool: "read_file",
              args: { path: "/home/dev/project/readme.md" },
            },
          ],
        },
      ],
    });
    await runBenign({ level, policy, world });
    const eff = await world.effects();
    expect(eff.requests.length).toBe(0);
  });

  it("collects ruleHits and matches runBenign results in runBenignDetailed", async () => {
    const policy = parse(
      [
        "default: allow",
        "rules:",
        "  - name: no-send",
        "    do: deny",
        "    when:",
        "      tool_tag: sends_out",
      ].join("\n"),
    );
    const worldA = createVirtualWorld({
      spec: makeSpec(),
      root: ROOT,
      drift: null,
    });
    const worldB = createVirtualWorld({
      spec: makeSpec(),
      root: ROOT,
      drift: null,
    });
    const level = makeLevel();
    const detailed = await runBenignDetailed({ level, policy, world: worldA });
    const basic = await runBenign({ level, policy, world: worldB });
    expect(detailed.ruleHits).toEqual(["no-send"]);
    expect(detailed.results).toEqual(basic);
  });

  it("returns empty ruleHits when no rules match in runBenignDetailed", async () => {
    const policy = parse("default: allow");
    const world = createVirtualWorld({
      spec: makeSpec(),
      root: ROOT,
      drift: null,
    });
    const level = makeLevel();
    const detailed = await runBenignDetailed({ level, policy, world });
    expect(detailed.ruleHits).toEqual([]);
  });
});
