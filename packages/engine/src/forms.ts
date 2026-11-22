import { createVfs } from "./vfs";
import type { WorldSpec } from "./world-types";

function findTraversalFolder(
  target: string,
  spec: WorldSpec,
): string | null {
  const targetSlash = target.indexOf("/");
  const targetFirst =
    targetSlash === -1 ? target : target.slice(0, targetSlash);
  for (const key of Object.keys(spec.files)) {
    const slash = key.indexOf("/");
    if (slash === -1) {
      continue;
    }
    const folder = key.slice(0, slash);
    if (folder !== targetFirst) {
      return folder;
    }
  }
  return null;
}

function capitalizeSegment(segment: string): string {
  if (segment === "") {
    return "";
  }
  return segment.slice(0, 1).toUpperCase() + segment.slice(1).toLowerCase();
}

function toSegmentCapitalizedPath(path: string): string {
  return path.split("/").map(capitalizeSegment).join("/");
}

function buildCandidates(
  target: string,
  spec: WorldSpec,
  root: string,
): string[] {
  const candidates: string[] = [
    root + "/" + target,
    target,
    "~/" + target,
    root + "//" + target,
  ];

  const traversalFolder = findTraversalFolder(target, spec);
  if (traversalFolder !== null) {
    candidates.push(root + "/" + traversalFolder + "/../" + target);
  }

  for (const [key, value] of Object.entries(spec.links)) {
    if (target === value || target.startsWith(value + "/")) {
      candidates.push(root + "/" + key + target.slice(value.length));
    }
  }

  if (spec.caseInsensitive) {
    const full = root + "/" + target;
    candidates.push(full.toUpperCase());
    candidates.push(toSegmentCapitalizedPath(full));
  }

  return candidates;
}

export function pathForms(
  target: string,
  spec: WorldSpec,
  root: string,
): string[] {
  const vfs = createVfs(spec, root);
  const truth = vfs.resolve(root + "/" + target);
  const candidates = buildCandidates(target, spec, root);
  const result: string[] = [];

  for (const candidate of candidates) {
    if (vfs.resolve(candidate) === truth) {
      if (result.includes(candidate) === false) {
        result.push(candidate);
      }
    }
  }

  return result;
}
