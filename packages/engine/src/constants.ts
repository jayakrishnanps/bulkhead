export const LABELS = [
  "PRIVATE",
  "UNTRUSTED",
] as const;

export const ACTIONS = [
  "allow",
  "deny",
  "ask",
] as const;

export const POLICY_DEFAULTS = [
  "allow",
  "deny",
] as const;

export const PARAM_KINDS = [
  "path",
  "paths",
  "url",
  "text",
] as const;

export const GOAL_KINDS = [
  "exfiltration",
  "secret_read",
  "destroyed",
  "runaway",
] as const;

export const RULE_KEYS = [
  "name",
  "do",
  "when",
  "unless",
  "say",
] as const;

export const MATCHER_KEYS = [
  "glob",
  "iglob",
  "resolved_glob",
  "equals",
  "contains",
  "domain_in",
  "domain_not_in",
  "longer_than",
  "carries",
] as const;

export const CONDITION_KEYS = [
  "tool",
  "tool_tag",
  "tool_changed",
  "max_calls",
  "session_has",
  "any_arg",
] as const;

export const ARG_KEY_PREFIX = "arg.";

export const MIN_FRAGMENT_LENGTH = 12;
export const MAX_SYMLINK_HOPS = 16;
export const CHUNK_SIZE = 24;
export const MAX_PLANS = 6000;
export const FATIGUE_AFTER_ASKS = 3;
export const MAX_AVERAGE_ASKS = 3;
export const DEFAULT_MAX_ASKS_PER_TASK = 1;
export const RESISTANCE_POINTS = 60;
export const UTILITY_POINTS = 30;
export const INTERRUPTION_POINTS = 10;

export const SEARCH_QUERIES = [
  "KEY",
  "BEGIN",
  "SECRET",
  "TOKEN",
] as const;

export const MAX_RULES_TEXT_LENGTH = 8192;
export const MAX_RULES = 40;
export const MAX_RULE_NAME_LENGTH = 60;
export const MAX_SAY_LENGTH = 200;
export const MAX_ARG_NAME_LENGTH = 40;
export const MAX_ERRORS = 10;

export const DEFAULT_HOME = "/home/dev";
