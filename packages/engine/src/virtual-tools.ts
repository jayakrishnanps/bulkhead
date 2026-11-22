import { containsSecret } from "./detectors";
import { recordDestroyed, recordPublication, recordRequest } from "./effects";
import { matchGlob } from "./glob";
import { findImageUrls } from "./markdown";
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

function isPublicPath(spec: WorldSpec, path: string): boolean {
  for (const pattern of spec.publicPaths) {
    if (matchGlob(pattern, path, spec.caseInsensitive)) {
      return true;
    }
  }
  return false;
}

function isProtectedPath(spec: WorldSpec, path: string): boolean {
  for (const pattern of spec.protectedPaths) {
    if (matchGlob(pattern, path, spec.caseInsensitive)) {
      return true;
    }
  }
  return false;
}

function runWriteFile(state: VirtualState, call: ResolvedCall): ToolResult {
  const path = readStringArg(call, "path");
  const content = readStringArg(call, "content");
  if (path === null || content === null) {
    return BAD_ARGS;
  }
  const existed = state.vfs.read(path) !== null;
  const resolved = state.vfs.write(path, content);
  if (isPublicPath(state.spec, resolved)) {
    recordPublication(state.effects, { path: resolved, content });
  }
  if (isProtectedPath(state.spec, resolved) && existed) {
    recordDestroyed(state.effects, resolved);
  }
  return { ok: true, text: "written", labels: [] };
}

function runMoveFile(state: VirtualState, call: ResolvedCall): ToolResult {
  const source = readStringArg(call, "source");
  const destination = readStringArg(call, "destination");
  if (source === null || destination === null) {
    return BAD_ARGS;
  }
  const sourceEntry = state.vfs.read(source);
  if (sourceEntry === null) {
    return { ok: false, text: "No such file", labels: [] };
  }
  const moved = state.vfs.move(source, destination);
  if (moved === null) {
    return { ok: false, text: "No such file", labels: [] };
  }
  if (isPublicPath(state.spec, moved.to)) {
    recordPublication(state.effects, { path: moved.to, content: sourceEntry.content });
  }
  if (isProtectedPath(state.spec, moved.from)) {
    recordDestroyed(state.effects, moved.from);
  }
  return { ok: true, text: "moved", labels: [] };
}

function runDeleteFile(state: VirtualState, call: ResolvedCall): ToolResult {
  const path = readStringArg(call, "path");
  if (path === null) {
    return BAD_ARGS;
  }
  const resolved = state.vfs.resolve(path);
  if (state.vfs.remove(path) === false) {
    return { ok: false, text: "No such file", labels: [] };
  }
  if (isProtectedPath(state.spec, resolved)) {
    recordDestroyed(state.effects, resolved);
  }
  return { ok: true, text: "deleted", labels: [] };
}

function runReadIssue(state: VirtualState, call: ResolvedCall): ToolResult {
  const id = readStringArg(call, "id");
  if (id === null) {
    return BAD_ARGS;
  }
  const text = state.spec.issues[id];
  if (text === undefined) {
    return { ok: false, text: "No such issue", labels: [] };
  }
  return { ok: true, text, labels: ["UNTRUSTED"] };
}

function runFetchPage(state: VirtualState, call: ResolvedCall): ToolResult {
  const url = readStringArg(call, "url");
  if (url === null) {
    return BAD_ARGS;
  }
  recordRequest(state.effects, { url, body: "", via: "fetch_page" });
  const qmark = url.indexOf("?");
  const address = qmark === -1 ? url : url.slice(0, qmark);
  const pageText = state.spec.pages[address];
  if (pageText === undefined) {
    return { ok: false, text: "404", labels: [] };
  }
  return { ok: true, text: pageText, labels: ["UNTRUSTED"] };
}

function runSendHttp(state: VirtualState, call: ResolvedCall): ToolResult {
  const url = readStringArg(call, "url");
  const body = readStringArg(call, "body");
  if (url === null || body === null) {
    return BAD_ARGS;
  }
  recordRequest(state.effects, { url, body, via: "send_http" });
  return { ok: true, text: "200 ok", labels: [] };
}

function runPostComment(state: VirtualState, call: ResolvedCall): ToolResult {
  const body = readStringArg(call, "body");
  if (body === null) {
    return BAD_ARGS;
  }
  const domain = state.spec.safeDomains[0] ?? "example.test";
  const commentUrl = `https://api.${domain}/comments`;
  recordRequest(state.effects, { url: commentUrl, body, via: "post_comment" });
  for (const imgUrl of findImageUrls(body)) {
    recordRequest(state.effects, { url: imgUrl, body: "", via: "markdown image" });
  }
  return { ok: true, text: "comment posted", labels: [] };
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
  if (call.tool === "write_file") {
    return runWriteFile(state, call);
  }
  if (call.tool === "move_file") {
    return runMoveFile(state, call);
  }
  if (call.tool === "delete_file") {
    return runDeleteFile(state, call);
  }
  if (call.tool === "read_issue") {
    return runReadIssue(state, call);
  }
  if (call.tool === "fetch_page") {
    return runFetchPage(state, call);
  }
  if (call.tool === "send_http") {
    return runSendHttp(state, call);
  }
  if (call.tool === "post_comment") {
    return runPostComment(state, call);
  }
  return UNKNOWN_TOOL;
}
