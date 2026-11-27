import { matchGlob } from "./glob";
import type { WorldSpec } from "./world-types";

function fillPattern(pattern: string, root: string): string {
  let path = pattern;
  if (path.startsWith("**/")) {
    path = root + "/" + path.slice(3);
  } else if (path.startsWith("/") === false) {
    path = root + "/" + path;
  }
  if (path.endsWith("/**")) {
    path = path.slice(0, -3) + "/out.txt";
  }
  return path.replaceAll("**", "x").replaceAll("*", "x").replaceAll("?", "x");
}

export function publicFilePath(spec: WorldSpec, root: string): string | null {
  const pattern = spec.publicPaths[0];
  if (pattern === undefined) {
    return null;
  }
  const candidate = fillPattern(pattern, root);
  if (matchGlob(pattern, candidate, false)) {
    return candidate;
  }
  return null;
}
