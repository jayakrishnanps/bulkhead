import { DEFAULT_SENSITIVE_PATHS } from "./constants";
import { matchGlob } from "./glob";
import { normalizePath } from "./path";

const SECRET_PATTERNS = [
  /-----BEGIN[A-Z ]+PRIVATE KEY-----/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /\b(?:gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{22,})\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/,
];

const HIDDEN_TEXT_PATTERN =
  /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF\u{E0000}-\u{E007F}]/u;

export function containsSecret(text: string): boolean {
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

export function containsHiddenText(text: string): boolean {
  return HIDDEN_TEXT_PATTERN.test(text);
}

export function isSensitivePath(
  path: string,
  extraGlobs: string[],
  home: string,
): boolean {
  const normalizedPath = normalizePath(path, home);
  for (const glob of DEFAULT_SENSITIVE_PATHS) {
    if (matchGlob(glob, normalizedPath, true)) {
      return true;
    }
  }
  for (const glob of extraGlobs) {
    if (matchGlob(glob, normalizedPath, true)) {
      return true;
    }
  }
  return false;
}
