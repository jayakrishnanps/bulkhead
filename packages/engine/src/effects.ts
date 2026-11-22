import type { Effects, Publication, Request } from "./world-types";

export function createEffects(): Effects {
  return {
    requests: [],
    published: [],
    destroyed: [],
    calls: {},
  };
}

export function recordRequest(effects: Effects, request: Request): void {
  effects.requests.push(request);
}

export function recordPublication(
  effects: Effects,
  publication: Publication,
): void {
  effects.published.push(publication);
}

export function recordDestroyed(effects: Effects, path: string): void {
  if (effects.destroyed.includes(path) === false) {
    effects.destroyed.push(path);
  }
}

export function countCall(effects: Effects, tool: string): number {
  const current = effects.calls[tool] ?? 0;
  const next = current + 1;
  effects.calls[tool] = next;
  return next;
}
