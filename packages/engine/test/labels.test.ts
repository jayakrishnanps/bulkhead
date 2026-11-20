import { describe, expect, it } from "vitest";
import { labelsForDelivery } from "../src/labels";

describe("labelsForDelivery", () => {
  const home = "/home/dev";

  it("adds UNTRUSTED for reads_outside tools", () => {
    const labels = labelsForDelivery({
      tool: {
        name: "fetch",
        tags: ["reads_outside"],
        description: "fetch",
      },
      args: { url: "https://example.com" },
      result: "normal content",
      sensitivePaths: [],
      home,
    });
    expect(labels).toEqual(["UNTRUSTED"]);
  });

  it("adds PRIVATE for reads_files with sensitive path", () => {
    const labels = labelsForDelivery({
      tool: {
        name: "read_file",
        tags: ["reads_files"],
        description: "read",
      },
      args: { path: "/home/dev/.ssh/id_key" },
      result: "content",
      sensitivePaths: [],
      home,
    });
    expect(labels).toEqual(["PRIVATE"]);
  });

  it("returns empty array for reads_files with non sensitive path", () => {
    const labels = labelsForDelivery({
      tool: {
        name: "read_file",
        tags: ["reads_files"],
        description: "read",
      },
      args: { path: "/home/dev/project/README.md" },
      result: "content",
      sensitivePaths: [],
      home,
    });
    expect(labels).toEqual([]);
  });

  it("adds PRIVATE when path matches extra sensitive paths", () => {
    const labels = labelsForDelivery({
      tool: {
        name: "read_file",
        tags: ["reads_files"],
        description: "read",
      },
      args: { path: "/home/dev/project/customers.csv" },
      result: "content",
      sensitivePaths: ["**/customers.csv"],
      home,
    });
    expect(labels).toEqual(["PRIVATE"]);
  });

  it("adds SECRET and HIDDEN based on result contents", () => {
    const secretLabels = labelsForDelivery({
      tool: { name: "cmd", tags: [], description: "cmd" },
      args: {},
      result: "AKIAABCDEFGHIJKLMNOP",
      sensitivePaths: [],
      home,
    });
    expect(secretLabels).toEqual(["SECRET"]);

    const hiddenLabels = labelsForDelivery({
      tool: { name: "cmd", tags: [], description: "cmd" },
      args: {},
      result: `a\u200Bb`,
      sensitivePaths: [],
      home,
    });
    expect(hiddenLabels).toEqual(["HIDDEN"]);
  });

  it("returns empty array for sends_out tool with sensitive path argument", () => {
    const labels = labelsForDelivery({
      tool: {
        name: "upload",
        tags: ["sends_out"],
        description: "upload",
      },
      args: { path: "/home/dev/.ssh/id_key" },
      result: "ok",
      sensitivePaths: [],
      home,
    });
    expect(labels).toEqual([]);
  });
});
