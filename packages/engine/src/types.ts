import type { ACTIONS, LABELS, TRACE_KINDS } from "./constants";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type Label = (typeof LABELS)[number];
export type Action = (typeof ACTIONS)[number];
export type TraceKind = (typeof TRACE_KINDS)[number];

export type Matcher = {
  glob?: string | string[];
  iglob?: string | string[];
  equals?: string | string[];
  contains?: string | string[];
  domain_in?: string[];
  domain_not_in?: string[];
  longer_than?: number;
};

export type Condition = {
  tool?: string;
  tool_tag?: string;
  args?: Record<string, Matcher>;
  session_has?: Label[];
  tool_changed?: boolean;
  repeated_over?: number;
};

export type Rule = {
  name: string;
  when: Condition;
  do: Action;
  say?: string;
};

export type ToolDef = {
  name: string;
  tags: string[];
  description: string;
};

export type CallStep = {
  kind: "call";
  tool: string;
  args: Record<string, JsonValue>;
  result?: string;
  harm?: boolean;
  needed?: boolean;
};

export type UpdateToolStep = {
  kind: "update_tool";
  tool: string;
  description: string;
};

export type Step = CallStep | UpdateToolStep;

export type Trace = {
  id: string;
  steps: Step[];
};

export type World = {
  projectRoot: string;
  home: string;
  safeDomains: string[];
  evilDomains: string[];
};

export type Level = {
  id: string;
  chapter: number;
  order: number;
  title: string;
  story: string;
  learn: string;
  hints: string[];
  tools: ToolDef[];
  world: World;
  sensitivePaths: string[];
  mutators: string[];
  parRules: number;
  attack: Trace[];
  normal: Trace[];
};

export type Decision = {
  action: Action;
  ruleName: string | null;
  reason: string;
};

export type StepOutcome = {
  index: number;
  tool: string;
  action: Action | "update";
  ruleName: string | null;
  reason: string;
  blocked: boolean;
  asked: boolean;
  labels: Label[];
};

export type TraceVerdict = {
  traceId: string;
  kind: TraceKind;
  passed: boolean;
  asks: number;
  failure: string | null;
  outcomes: StepOutcome[];
};

export type Score = {
  attacksStoppedPct: number;
  normalAllowedPct: number;
  asksOnNormal: number;
  ruleCount: number;
  total: number;
  cleared: boolean;
  stars: 0 | 1 | 2 | 3;
};

export type ParseResult =
  | {
      ok: true;
      rules: Rule[];
    }
  | {
      ok: false;
      errors: string[];
    };

export type EvaluationResult =
  | {
      ok: false;
      errors: string[];
    }
  | {
      ok: true;
      ruleCount: number;
      attack: TraceVerdict[];
      normal: TraceVerdict[];
      score: Score;
    };

export type SessionState = {
  labels: Label[];
  changedTools: string[];
  callCounts: Record<string, number>;
  descriptions: Record<string, string>;
};
