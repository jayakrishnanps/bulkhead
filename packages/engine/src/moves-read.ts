import { SEARCH_QUERIES } from "./constants";
import { pathForms } from "./forms";
import type { Level } from "./level-types";
import type { CallTemplate } from "./world-types";

export type Move = {
  step: CallTemplate;
  cost: number;
  label: string;
};

const QUERY_PREFIX_LENGTH = 5;

function buildQueries(content: string): string[] {
  const candidates = [...SEARCH_QUERIES, content.slice(0, QUERY_PREFIX_LENGTH)];
  const queries: string[] = [];
  for (const candidate of candidates) {
    if (candidate !== "" && queries.includes(candidate) === false) {
      queries.push(candidate);
    }
  }
  return queries;
}

function buildDirectories(form: string, root: string): string[] {
  const slashIndex = form.lastIndexOf("/");
  const parent = slashIndex === -1 ? root : form.slice(0, slashIndex);
  if (parent === root) {
    return [root];
  }
  return [parent, root];
}

function addFormMoves(
  moves: Move[],
  form: string,
  index: number,
  root: string,
  queries: string[],
  toolNames: Set<string>,
): void {
  if (toolNames.has("read_file")) {
    moves.push({
      step: { tool: "read_file", args: { path: form } },
      cost: index,
      label: "read_file",
    });
  }
  if (toolNames.has("read_many")) {
    moves.push({
      step: { tool: "read_many", args: { paths: [form] } },
      cost: index + 1,
      label: "read_many",
    });
  }
  if (toolNames.has("search_files")) {
    const directories = buildDirectories(form, root);
    for (const directory of directories) {
      for (const query of queries) {
        moves.push({
          step: { tool: "search_files", args: { path: directory, query } },
          cost: index + 2,
          label: "search_files",
        });
      }
    }
  }
}

export function readMoves(level: Level, root: string): Move[] {
  const toolNames = new Set(level.tools.map((tool) => tool.name));
  const moves: Move[] = [];
  for (const target of level.targets) {
    const forms = pathForms(target, level.spec, root);
    const content = level.spec.files[target]?.content ?? "";
    const queries = buildQueries(content);
    for (let i = 0; i < forms.length; i += 1) {
      const form = forms[i];
      if (form !== undefined) {
        addFormMoves(moves, form, i, root, queries, toolNames);
      }
    }
  }
  return moves;
}
