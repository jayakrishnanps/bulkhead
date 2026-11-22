import type { ACTIONS, LABELS, POLICY_DEFAULTS } from "./constants";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type Label = (typeof LABELS)[number];
export type Action = (typeof ACTIONS)[number];
export type PolicyDefault = (typeof POLICY_DEFAULTS)[number];

export type Matcher = {
  glob?: string | string[];
  iglob?: string | string[];
  resolved_glob?: string | string[];
  equals?: string | string[];
  contains?: string | string[];
  domain_in?: string[];
  domain_not_in?: string[];
  longer_than?: number;
  carries?: Label[];
};

export type Condition = {
  tool?: string;
  tool_tag?: string;
  args?: Record<string, Matcher>;
  any_arg?: Matcher;
  tool_changed?: boolean;
  max_calls?: number;
  session_has?: Label[];
};

export type Rule = {
  name: string;
  do: Action;
  when: Condition;
  unless?: Condition;
  say?: string;
};

export type Policy = {
  default: PolicyDefault;
  rules: Rule[];
};

export type Decision = {
  action: Action;
  ruleNames: string[];
  reason: string;
};

export type PolicyParseResult =
  | {
      ok: true;
      policy: Policy;
    }
  | {
      ok: false;
      errors: string[];
    };

export type MatchContext = {
  home: string;
  caseInsensitive: boolean;
  resolvePath: (path: string) => string;
  carriedLabels: (target: string) => Label[];
};
