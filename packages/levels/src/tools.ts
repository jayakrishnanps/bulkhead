import type { ToolDef } from "@bulkhead/engine";

export const READ_FILE: ToolDef = {
  name: "read_file",
  tags: ["reads_files"],
  description: "Reads one text file and returns its content.",
  params: [{ name: "path", kind: "path" }],
};

export const READ_MANY: ToolDef = {
  name: "read_many",
  tags: ["reads_files"],
  description: "Reads several text files and returns all their contents.",
  params: [{ name: "paths", kind: "paths" }],
};

export const LIST_DIR: ToolDef = {
  name: "list_dir",
  tags: ["reads_files"],
  description: "Lists the names inside a folder.",
  params: [{ name: "path", kind: "path" }],
};

export const SEARCH_FILES: ToolDef = {
  name: "search_files",
  tags: ["reads_files"],
  description:
    "Searches the files in a folder for a text and returns the matching lines.",
  params: [
    { name: "path", kind: "path" },
    { name: "query", kind: "text" },
  ],
};

export const WRITE_FILE: ToolDef = {
  name: "write_file",
  tags: ["writes_files"],
  description: "Writes text to a file.",
  params: [
    { name: "path", kind: "path" },
    { name: "content", kind: "text" },
  ],
};

export const MOVE_FILE: ToolDef = {
  name: "move_file",
  tags: ["writes_files"],
  description: "Moves a file to a new path.",
  params: [
    { name: "source", kind: "path" },
    { name: "destination", kind: "path" },
  ],
};

export const DELETE_FILE: ToolDef = {
  name: "delete_file",
  tags: ["writes_files"],
  description: "Deletes a file.",
  params: [{ name: "path", kind: "path" }],
};

export const READ_ISSUE: ToolDef = {
  name: "read_issue",
  tags: ["reads_outside"],
  description:
    "Reads an issue from the public issue tracker of the project.",
  params: [{ name: "id", kind: "text" }],
};

export const FETCH_PAGE: ToolDef = {
  name: "fetch_page",
  tags: ["reads_outside"],
  description: "Downloads a web page and returns its text.",
  params: [{ name: "url", kind: "url" }],
};

export const SEND_HTTP: ToolDef = {
  name: "send_http",
  tags: ["sends_out"],
  description: "Sends data to a web address.",
  params: [
    { name: "url", kind: "url" },
    { name: "body", kind: "text" },
  ],
};

export const POST_COMMENT: ToolDef = {
  name: "post_comment",
  tags: ["sends_out"],
  description:
    "Posts a comment on the issue tracker. Images in the comment are loaded by the viewer.",
  params: [{ name: "body", kind: "text" }],
};

export const ALL_TOOLS: ToolDef[] = [
  READ_FILE,
  READ_MANY,
  LIST_DIR,
  SEARCH_FILES,
  WRITE_FILE,
  MOVE_FILE,
  DELETE_FILE,
  READ_ISSUE,
  FETCH_PAGE,
  SEND_HTTP,
  POST_COMMENT,
];
