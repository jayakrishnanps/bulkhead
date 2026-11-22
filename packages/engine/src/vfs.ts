import { MAX_SYMLINK_HOPS } from "./constants";
import { normalizePath } from "./path";
import type { FileEntry, WorldSpec } from "./world-types";
import type { Label } from "./types";

type SearchHit = {
  path: string;
  line: number;
  text: string;
  labels: Label[];
};

export interface Vfs {
  root: string;
  caseInsensitive: boolean;
  resolve(path: string): string;
  read(path: string): { content: string; labels: Label[] } | null;
  write(path: string, content: string): string;
  remove(path: string): boolean;
  move(source: string, destination: string): { from: string; to: string } | null;
  list(path: string): string[] | null;
  search(path: string, query: string): SearchHit[];
}

type LinkMap = Map<string, string>;
type FileMap = Map<string, FileEntry>;

function buildFileMap(
  spec: WorldSpec,
  root: string,
  ci: boolean,
): FileMap {
  const map: FileMap = new Map();
  for (const key of Object.keys(spec.files)) {
    const entry = spec.files[key];
    if (entry === undefined) {
      continue;
    }
    const absPath = ci ? `${root}/${key}`.toLowerCase() : `${root}/${key}`;
    map.set(absPath, { content: entry.content, labels: [...entry.labels] });
  }
  return map;
}

function buildLinkMap(
  spec: WorldSpec,
  root: string,
  ci: boolean,
): LinkMap {
  const map: LinkMap = new Map();
  for (const key of Object.keys(spec.links)) {
    const value = spec.links[key];
    if (value === undefined) {
      continue;
    }
    const absLink = ci ? `${root}/${key}`.toLowerCase() : `${root}/${key}`;
    const absTarget = ci
      ? `${root}/${value}`.toLowerCase()
      : `${root}/${value}`;
    map.set(absLink, absTarget);
  }
  return map;
}

function findLongestMatch(path: string, links: LinkMap): string | null {
  let longest: string | null = null;
  for (const linkPath of links.keys()) {
    if (path === linkPath || path.startsWith(linkPath + "/")) {
      if (longest === null || linkPath.length > longest.length) {
        longest = linkPath;
      }
    }
  }
  return longest;
}

function resolvePath(
  path: string,
  root: string,
  ci: boolean,
  links: LinkMap,
): string {
  let current = path;
  if (current.startsWith("/") === false && current.startsWith("~") === false) {
    current = `${root}/${current}`;
  }
  current = normalizePath(current, root);
  if (ci) {
    current = current.toLowerCase();
  }

  for (let hop = 0; hop < MAX_SYMLINK_HOPS; hop++) {
    const match = findLongestMatch(current, links);
    if (match === null) {
      break;
    }
    const target = links.get(match);
    if (target === undefined) {
      break;
    }
    const suffix = current.slice(match.length);
    current = normalizePath(target + suffix, root);
    if (ci) {
      current = current.toLowerCase();
    }
  }

  return current;
}

function isDirectory(
  dirPath: string,
  files: FileMap,
  links: LinkMap,
): boolean {
  const prefix = dirPath + "/";
  for (const p of files.keys()) {
    if (p.startsWith(prefix)) {
      return true;
    }
  }
  for (const p of links.keys()) {
    if (p.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

function directChildren(
  dirPath: string,
  files: FileMap,
  links: LinkMap,
): string[] {
  const prefix = dirPath + "/";
  const names = new Set<string>();
  for (const p of files.keys()) {
    if (p.startsWith(prefix)) {
      const rest = p.slice(prefix.length);
      const slash = rest.indexOf("/");
      names.add(slash === -1 ? rest : rest.slice(0, slash));
    }
  }
  for (const p of links.keys()) {
    if (p.startsWith(prefix)) {
      const rest = p.slice(prefix.length);
      const slash = rest.indexOf("/");
      names.add(slash === -1 ? rest : rest.slice(0, slash));
    }
  }
  return [...names].sort();
}

export function createVfs(spec: WorldSpec, root: string): Vfs {
  const ci = spec.caseInsensitive;
  const normalizedRoot = ci ? root.toLowerCase() : root;
  const files = buildFileMap(spec, normalizedRoot, ci);
  const links = buildLinkMap(spec, normalizedRoot, ci);

  function resolve(path: string): string {
    return resolvePath(path, normalizedRoot, ci, links);
  }

  return {
    root: normalizedRoot,
    caseInsensitive: ci,
    resolve,

    read(path: string) {
      const abs = resolve(path);
      const entry = files.get(abs);
      if (entry === undefined) {
        return null;
      }
      return { content: entry.content, labels: [...entry.labels] };
    },

    write(path: string, content: string): string {
      const abs = resolve(path);
      const existing = files.get(abs);
      const labels = existing !== undefined ? [...existing.labels] : [];
      files.set(abs, { content, labels });
      return abs;
    },

    remove(path: string): boolean {
      const abs = resolve(path);
      return files.delete(abs);
    },

    move(
      source: string,
      destination: string,
    ): { from: string; to: string } | null {
      const from = resolve(source);
      const entry = files.get(from);
      if (entry === undefined) {
        return null;
      }
      files.delete(from);
      const to = resolve(destination);
      files.set(to, { content: entry.content, labels: [...entry.labels] });
      return { from, to };
    },

    list(path: string): string[] | null {
      const abs = resolve(path);
      if (isDirectory(abs, files, links) === false) {
        return null;
      }
      return directChildren(abs, files, links);
    },

    search(path: string, query: string): SearchHit[] {
      const abs = resolve(path);
      const prefix = abs + "/";
      const hits: SearchHit[] = [];
      for (const [filePath, entry] of files) {
        if (filePath !== abs && filePath.startsWith(prefix) === false) {
          continue;
        }
        const lines = entry.content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const lineText = lines[i];
          if (lineText === undefined) {
            continue;
          }
          if (lineText.includes(query)) {
            hits.push({
              path: filePath,
              line: i + 1,
              text: lineText,
              labels: [...entry.labels],
            });
          }
        }
      }
      hits.sort((a, b) => {
        if (a.path < b.path) {
          return -1;
        }
        if (a.path > b.path) {
          return 1;
        }
        return a.line - b.line;
      });
      return hits;
    },
  };
}
