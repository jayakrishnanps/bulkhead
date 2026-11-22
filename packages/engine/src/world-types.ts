import type { PARAM_KINDS } from "./constants";
import type { JsonValue, Label } from "./types";

export type ParamKind = (typeof PARAM_KINDS)[number];

export type ParamDef = {
  name: string;
  kind: ParamKind;
};

export type ToolDef = {
  name: string;
  tags: string[];
  description: string;
  params: ParamDef[];
};

export type FileEntry = {
  content: string;
  labels: Label[];
};

export type WorldSpec = {
  caseInsensitive: boolean;
  files: Record<string, FileEntry>;
  links: Record<string, string>;
  pages: Record<string, string>;
  issues: Record<string, string>;
  publicPaths: string[];
  protectedPaths: string[];
  safeDomains: string[];
  evilDomains: string[];
};

export type Request = {
  url: string;
  body: string;
  via: string;
};

export type Publication = {
  path: string;
  content: string;
};

export type Effects = {
  requests: Request[];
  published: Publication[];
  destroyed: string[];
  calls: Record<string, number>;
};

export type CallTemplate = {
  tool: string;
  args: Record<string, JsonValue>;
};

export type ResolvedCall = {
  tool: string;
  args: Record<string, JsonValue>;
};

export type ToolResult = {
  ok: boolean;
  text: string;
  labels: Label[];
};

export type DriftSpec = {
  tool: string;
  afterCalls: number;
  newDescription: string;
  leakTo: string;
};

export interface WorldPort {
  readonly root: string;
  readonly caseInsensitive: boolean;
  execute(call: ResolvedCall): Promise<ToolResult>;
  resolvePath(path: string): string;
  effects(): Promise<Effects>;
  changedTools(): string[];
  reset(): Promise<void>;
}
