import { matchGlob } from "./glob";
import { normalizePath } from "./path";
import type { JsonValue, Matcher } from "./types";
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

export function matchValue(
  matcher: Matcher,
  value: JsonValue | undefined,
  home: string,
): boolean {
  if (value === undefined) {
    return false;
  }
  const text = toText(value);

  if (matcher.glob !== undefined) {
    return matchGlobList(matcher.glob, text, home, false);
  }
  if (matcher.iglob !== undefined) {
    return matchGlobList(matcher.iglob, text, home, true);
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

  return false;
}
