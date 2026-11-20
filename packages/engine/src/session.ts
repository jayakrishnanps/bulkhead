import { stableStringify } from "./stable-json";
import type { JsonValue, Label, SessionState, ToolDef } from "./types";

export function createSession(tools: ToolDef[]): SessionState {
  const descriptions: Record<string, string> = {};
  for (const tool of tools) {
    descriptions[tool.name] = tool.description;
  }
  return {
    labels: [],
    changedTools: [],
    callCounts: {},
    descriptions,
  };
}

export function addLabels(session: SessionState, labels: Label[]): void {
  for (const label of labels) {
    const isPresent = session.labels.some(
      (existingLabel) => existingLabel === label,
    );
    if (isPresent === false) {
      session.labels.push(label);
    }
  }
}

export function hasAllLabels(
  session: SessionState,
  labels: Label[],
): boolean {
  for (const label of labels) {
    const isPresent = session.labels.some(
      (existingLabel) => existingLabel === label,
    );
    if (isPresent === false) {
      return false;
    }
  }
  return true;
}

export function registerCall(
  session: SessionState,
  tool: string,
  args: Record<string, JsonValue>,
): number {
  const key = `${tool}:${stableStringify(args)}`;
  const currentCount = session.callCounts[key] ?? 0;
  const newCount = currentCount + 1;
  session.callCounts[key] = newCount;
  return newCount;
}

export function registerToolUpdate(
  session: SessionState,
  tool: string,
  description: string,
): void {
  const existingDescription = session.descriptions[tool];
  if (
    existingDescription !== undefined &&
    existingDescription !== description
  ) {
    const isAlreadyChanged = session.changedTools.some(
      (changedTool) => changedTool === tool,
    );
    if (isAlreadyChanged === false) {
      session.changedTools.push(tool);
    }
  }
  session.descriptions[tool] = description;
}

export function isToolChanged(session: SessionState, tool: string): boolean {
  return session.changedTools.some((changedTool) => changedTool === tool);
}
