import {
  containsHiddenText,
  containsSecret,
  isSensitivePath,
} from "./detectors";
import type { JsonValue, Label, ToolDef } from "./types";

export type DeliveryInput = {
  tool: ToolDef;
  args: Record<string, JsonValue>;
  result: string | undefined;
  sensitivePaths: string[];
  home: string;
};

function shouldAddUntrusted(tool: ToolDef): boolean {
  return tool.tags.some((tag) => tag === "reads_outside");
}

function hasSensitiveArgument(
  args: Record<string, JsonValue>,
  sensitivePaths: string[],
  home: string,
): boolean {
  for (const key of Object.keys(args)) {
    const value = args[key];
    if (typeof value === "string") {
      if (isSensitivePath(value, sensitivePaths, home)) {
        return true;
      }
    }
  }
  return false;
}

function shouldAddPrivate(
  tool: ToolDef,
  args: Record<string, JsonValue>,
  sensitivePaths: string[],
  home: string,
): boolean {
  const readsFiles = tool.tags.some((tag) => tag === "reads_files");
  if (readsFiles === false) {
    return false;
  }
  return hasSensitiveArgument(args, sensitivePaths, home);
}

export function labelsForDelivery(input: DeliveryInput): Label[] {
  const labels: Label[] = [];
  if (shouldAddUntrusted(input.tool)) {
    labels.push("UNTRUSTED");
  }
  if (
    shouldAddPrivate(
      input.tool,
      input.args,
      input.sensitivePaths,
      input.home,
    )
  ) {
    labels.push("PRIVATE");
  }
  if (input.result !== undefined && containsSecret(input.result)) {
    labels.push("SECRET");
  }
  if (input.result !== undefined && containsHiddenText(input.result)) {
    labels.push("HIDDEN");
  }
  return labels;
}
