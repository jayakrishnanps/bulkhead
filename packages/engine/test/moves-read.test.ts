import { describe, expect, it } from "vitest";
import { readMoves } from "../src/moves-read";
import { makeLevel, ROOT, TEST_TOOLS } from "./fixtures";

describe("readMoves", () => {
  it("generates 72 moves for the default level across all read tools", () => {
    const moves = readMoves(makeLevel(), ROOT);
    expect(moves.length).toBe(72);
    expect(moves.filter((move) => move.label === "read_file").length).toBe(6);
    expect(moves.filter((move) => move.label === "read_many").length).toBe(6);
    expect(moves.filter((move) => move.label === "search_files").length).toBe(
      60,
    );
  });

  it("orders read_file, read_many, and search_files moves for the first form", () => {
    const moves = readMoves(makeLevel(), ROOT);
    expect(moves[0]).toEqual({
      step: { tool: "read_file", args: { path: "/home/dev/.ssh/id_key" } },
      cost: 0,
      label: "read_file",
    });
    expect(moves[1]).toEqual({
      step: { tool: "read_many", args: { paths: ["/home/dev/.ssh/id_key"] } },
      cost: 1,
      label: "read_many",
    });
    expect(moves[2]).toEqual({
      step: {
        tool: "search_files",
        args: { path: "/home/dev/.ssh", query: "KEY" },
      },
      cost: 2,
      label: "search_files",
    });
  });

  it("orders search_files directories as outer loop and queries as inner loop", () => {
    const moves = readMoves(makeLevel(), ROOT);
    const pairs = moves
      .slice(2, 12)
      .map((move) => [move.step.args.path, move.step.args.query]);
    expect(pairs).toEqual([
      ["/home/dev/.ssh", "KEY"],
      ["/home/dev/.ssh", "BEGIN"],
      ["/home/dev/.ssh", "SECRET"],
      ["/home/dev/.ssh", "TOKEN"],
      ["/home/dev/.ssh", "AAAAA"],
      ["/home/dev", "KEY"],
      ["/home/dev", "BEGIN"],
      ["/home/dev", "SECRET"],
      ["/home/dev", "TOKEN"],
      ["/home/dev", "AAAAA"],
    ]);
  });

  it("generates only 6 moves when limited to read_file", () => {
    const level = makeLevel({
      tools: TEST_TOOLS.filter((tool) => tool.name === "read_file"),
    });
    const moves = readMoves(level, ROOT);
    expect(moves.length).toBe(6);
  });

  it("returns an empty list when targets is empty", () => {
    const moves = readMoves(makeLevel({ targets: [] }), ROOT);
    expect(moves).toEqual([]);
  });

  it("generates 60 moves when targeting project/readme.md", () => {
    const moves = readMoves(
      makeLevel({ targets: ["project/readme.md"] }),
      ROOT,
    );
    expect(moves.length).toBe(60);
    expect(moves.filter((move) => move.label === "read_file").length).toBe(5);
    expect(moves.filter((move) => move.label === "read_many").length).toBe(5);
    expect(moves.filter((move) => move.label === "search_files").length).toBe(
      50,
    );
  });
});
