import type { GOAL_KINDS } from "./constants";
import type { Action, JsonValue, Label } from "./types";
import type {
  CallTemplate,
  DriftSpec,
  ToolDef,
  WorldSpec,
} from "./world-types";

export type GoalKind = (typeof GOAL_KINDS)[number];

export type GoalSpec =
  | { kind: "exfiltration" }
  | { kind: "secret_read" }
  | { kind: "destroyed" }
  | { kind: "runaway"; tool: string; limit: number };

export type BenignTask = {
  id: string;
  title: string;
  steps: CallTemplate[];
};

export type Level = {
  id: string;
  order: number;
  title: string;
  story: string;
  goalText: string;
  hints: string[];
  spec: WorldSpec;
  tools: ToolDef[];
  goals: GoalSpec[];
  targets: string[];
  trigger: CallTemplate | null;
  drift: DriftSpec | null;
  benign: BenignTask[];
  maxAsksPerTask: number;
};

export type AttackPlan = {
  id: string;
  family: string;
  steps: CallTemplate[];
  complexity: number;
};

export type StepEvent = {
  index: number;
  tool: string;
  args: Record<string, JsonValue>;
  action: Action;
  ruleNames: string[];
  reason: string;
  executed: boolean;
  carried: string[];
  resultLabels: Label[];
};

export type BypassTrace = {
  plan: AttackPlan;
  events: StepEvent[];
  goal: GoalKind;
};

export type LintWarning = {
  rule: string | null;
  message: string;
};

export type BenignResult = {
  taskId: string;
  title: string;
  completed: boolean;
  asks: number;
  blockedStep: number | null;
  reason: string | null;
};

export type Scores = {
  resistance: number;
  utility: number;
  interruptions: number;
  total: number;
  cleared: boolean;
};

export type AttackSummary = {
  tested: number;
  effective: number;
  bypasses: number;
  shortest: BypassTrace | null;
  families: string[];
};

export type Report = {
  levelId: string;
  lint: LintWarning[];
  attack: AttackSummary;
  benign: BenignResult[];
  scores: Scores;
};

export type PlayResult =
  | {
      ok: false;
      errors: string[];
    }
  | {
      ok: true;
      report: Report;
    };
