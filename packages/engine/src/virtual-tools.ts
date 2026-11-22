import { containsSecret } from "./detectors";
import type { Label } from "./types";
import type { Vfs } from "./vfs";
import type {
  Effects,
  ResolvedCall,
  ToolResult,
  WorldSpec,
} from "./world-types";

export interface VirtualState {
  vfs: Vfs;
  spec: WorldSpec;
  effects: Effects;
}

function readStringArg(
  call: ResolvedCall,
  name: string,
): string | null {
  const value = call.args[name];
  if (typeof value !== "string") {
    return null;
  }
  return value;
}

function readStringListArg(
  call: ResolvedCall,
  name: string,
): string[] | null {
  const value = call.args[name];
  if (Array.isArray(value) === false) {
    return null;
  }
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      return null;
    }
    result.push(item);
  }
  return result;
}

function entryLabels(content: string, labels: Label[]): Label[] {
  const result: Label[] = [...labels];
  if (containsSecret(content) && result.includes("PRIVATE") === false) {
    result.push("PRIVATE");
  }
  return result;
}

function unionLabels(all: Label[][]): Label[] {
  const seen = new Set<Label>();
  const result: Label[] = [];
  for (const group of all) {
    for (const label of group) {
      if (seen.has(label) === false) {
        seen.add(label);
        result.push(label);
      }
    }
  }
  return result;
}

const BAD_ARGS: ToolResult = {
  ok: false,
  text: "Bad arguments",
  labels: [],
};

const UNKNOWN_TOOL: ToolResult = {
  ok: false,
  text: "Unknown tool",
  labels: [],
};

function runReadFile(state: VirtualState, call: ResolvedCall): ToolResult {
  const path = readStringArg(call, "path");
  if (path === null) {
    return BAD_ARGS;
  }
  const entry = state.vfs.read(path);
  if (entry === null) {
    return { ok: false, text: "No such file", labels: [] };
  }
  return {
    ok: true,
    text: entry.content,
    labels: entryLabels(entry.content, entry.labels),
  };
}

function runReadMany(state: VirtualState, call: ResolvedCall): ToolResult {
  const paths = readStringListArg(call, "paths");
  if (paths === null) {
    return BAD_ARGS;
  }
  const blocks: string[] = [];
  const labelGroups: Label[][] = [];
  for (const path of paths) {
    const entry = state.vfs.read(path);
    if (entry === null) {
      blocks.push(`${path}\nNo such file`);
    } else {
      blocks.push(`${path}\n${entry.content}`);
      labelGroups.push(entryLabels(entry.content, entry.labels));
    }
  }
  return {
    ok: true,
    text: blocks.join("\n\n"),
    labels: unionLabels(labelGroups),
  };
}

function runListDir(state: VirtualState, call: ResolvedCall): ToolResult {
  const path = readStringArg(call, "path");
  if (path === null) {
    return BAD_ARGS;
  }
  const names = state.vfs.list(path);
  if (names === null) {
    return { ok: false, text: "No such directory", labels: [] };
  }
  return { ok: true, text: names.join("\n"), labels: [] };
}

function runSearchFiles(state: VirtualState, call: ResolvedCall): ToolResult {
  const path = readStringArg(call, "path");
  const query = readStringArg(call, "query");
  if (path === null || query === null) {
    return BAD_ARGS;
  }
  const hits = state.vfs.search(path, query);
  if (hits.length === 0) {
    return { ok: true, text: "No matches", labels: [] };
  }
  const lines = hits.map((h) => `${h.path}:${h.line}: ${h.text}`);
  const labelGroups = hits.map((h) => h.labels);
  return {
    ok: true,
    text: lines.join("\n"),
    labels: unionLabels(labelGroups),
  };
}

export function executeVirtualTool(
  state: VirtualState,
  call: ResolvedCall,
): ToolResult {
  if (call.tool === "read_file") {
    return runReadFile(state, call);
  }
  if (call.tool === "read_many") {
    return runReadMany(state, call);
  }
  if (call.tool === "list_dir") {
    return runListDir(state, call);
  }
  if (call.tool === "search_files") {
    return runSearchFiles(state, call);
  }
  return UNKNOWN_TOOL;
}
