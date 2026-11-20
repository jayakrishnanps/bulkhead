export const LABELS = [
  "PRIVATE",
  "UNTRUSTED",
  "SECRET",
  "HIDDEN",
] as const;

export const ACTIONS = [
  "allow",
  "deny",
  "ask",
] as const;

export const TRACE_KINDS = [
  "attack",
  "normal",
] as const;

export const MATCHER_KEYS = [
  "glob",
  "iglob",
  "equals",
  "contains",
  "domain_in",
  "domain_not_in",
  "longer_than",
] as const;

export const CONDITION_KEYS = [
  "tool",
  "tool_tag",
  "session_has",
  "tool_changed",
  "repeated_over",
] as const;

export const ARG_KEY_PREFIX = "arg.";

export const MAX_RULES_TEXT_LENGTH = 8192;
export const MAX_RULES = 40;
export const MAX_RULE_NAME_LENGTH = 60;
export const MAX_SAY_LENGTH = 200;
export const MAX_ARG_NAME_LENGTH = 40;
export const MAX_ERRORS = 10;
export const MAX_ASKS_PER_NORMAL_TRACE = 2;

export const ATTACK_POINTS = 45;
export const NORMAL_POINTS = 35;
export const QUESTION_POINTS = 10;
export const RULE_POINTS = 10;
export const QUESTION_PENALTY = 2.5;
export const EXTRA_RULE_PENALTY = 2;
export const TWO_STAR_SCORE = 90;
export const THREE_STAR_SCORE = 98;

export const DEFAULT_HOME = "/home/dev";

export const DEFAULT_SENSITIVE_PATHS = [
  "**/.ssh/**",
  "**/.env",
  "**/.env.*",
  "**/.aws/**",
  "**/id_rsa*",
  "**/.git-credentials",
  "**/*.pem",
  "**/.npmrc",
] as const;
