import { matchGlob } from "./glob";
import { normalizePath } from "./path";
import type { JsonValue, Label, MatchContext, Matcher } from "./types";
import { getHostname, hostInDomains } from "./url";

function toText(value: JsonValue): string {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

function toList(target: string | string[]): string[] {
  if (Array.isArray(target)) {
    return target;
  }
  return [target];
}

function matchGlobList(
  patterns: string | string[],
  text: string,
  home: string,
  ignoreCase: boolean,
): boolean {
  const normalized = normalizePath(text, home);
  const list = toList(patterns);
  for (const pattern of list) {
    if (matchGlob(pattern, normalized, ignoreCase)) {
      return true;
    }
  }
  return false;
}

function matchResolvedGlob(
  patterns: string | string[],
  text: string,
  context: MatchContext,
): boolean {
  const resolved = context.resolvePath(text);
  const list = toList(patterns);
  for (const pattern of list) {
    if (matchGlob(pattern, resolved, context.caseInsensitive)) {
      return true;
    }
  }
  return false;
}

function matchEquals(targets: string | string[], text: string): boolean {
  const list = toList(targets);
  for (const target of list) {
    if (text === target) {
      return true;
    }
  }
  return false;
}

function matchContains(targets: string | string[], text: string): boolean {
  const list = toList(targets);
  for (const target of list) {
    if (text.includes(target)) {
      return true;
    }
  }
  return false;
}

function matchDomainIn(domains: string[], text: string): boolean {
  const hostname = getHostname(text);
  if (hostname === null) {
    return false;
  }
  return hostInDomains(hostname, domains);
}

function matchDomainNotIn(domains: string[], text: string): boolean {
  const hostname = getHostname(text);
  if (hostname === null) {
    return false;
  }
  return hostInDomains(hostname, domains) === false;
}

function matchCarries(
  required: Label[],
  text: string,
  context: MatchContext,
): boolean {
  const labels = context.carriedLabels(text);
  for (const label of required) {
    if (labels.includes(label)) {
      return true;
    }
  }
  return false;
}

export function matchValue(
  matcher: Matcher,
  value: JsonValue | undefined,
  context: MatchContext,
): boolean {
  if (value === undefined) {
    return false;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (matchValue(matcher, item, context)) {
        return true;
      }
    }
    return false;
  }
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) {
      if (matchValue(matcher, child, context)) {
        return true;
      }
    }
    return false;
  }
  const text = toText(value);

  if (matcher.glob !== undefined) {
    return matchGlobList(matcher.glob, text, context.home, false);
  }
  if (matcher.iglob !== undefined) {
    return matchGlobList(matcher.iglob, text, context.home, true);
  }
  if (matcher.resolved_glob !== undefined) {
    return matchResolvedGlob(matcher.resolved_glob, text, context);
  }
  if (matcher.equals !== undefined) {
    return matchEquals(matcher.equals, text);
  }
  if (matcher.contains !== undefined) {
    return matchContains(matcher.contains, text);
  }
  if (matcher.domain_in !== undefined) {
    return matchDomainIn(matcher.domain_in, text);
  }
  if (matcher.domain_not_in !== undefined) {
    return matchDomainNotIn(matcher.domain_not_in, text);
  }
  if (matcher.longer_than !== undefined) {
    return text.length > matcher.longer_than;
  }
  if (matcher.carries !== undefined) {
    return matchCarries(matcher.carries, text, context);
  }

  return false;
}
