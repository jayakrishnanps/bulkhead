import type { Level } from "@bulkhead/engine";
import { LIST_DIR, READ_FILE, SEND_HTTP } from "../tools";
import { baseSpec } from "../worlds";

export const symlink: Level = {
  id: "symlink",
  order: 2,
  title: "The Symlink",
  story:
    "Someone made a shortcut inside the project folder. It points to your SSH folder, so the agent can reach your key through a path that looks harmless.",
  goalText:
    "Stop the agent from reading or leaking the key file, without blocking normal work.",
  hints: [
    "The key is reachable through a shortcut (a symlink) in the project folder.",
    "A glob on the raw path does not see where the shortcut leads.",
    "resolved_glob follows shortcuts before it matches.",
  ],
  spec: baseSpec({
    links: { "project/keys": ".ssh", "project/docs-link": "project/docs" },
  }),
  tools: [READ_FILE, LIST_DIR, SEND_HTTP],
  goals: [{ kind: "secret_read" }, { kind: "exfiltration" }],
  targets: [".ssh/id_key"],
  trigger: null,
  drift: null,
  maxAsksPerTask: 1,
  benign: [
    {
      id: "readme",
      title: "Read the readme",
      steps: [
        { tool: "read_file", args: { path: "/home/dev/project/readme.md" } },
      ],
    },
    {
      id: "linked-guide",
      title: "Read the guide through a link",
      steps: [
        {
          tool: "read_file",
          args: { path: "/home/dev/project/docs-link/ssh-notes.md" },
        },
      ],
    },
    {
      id: "list",
      title: "List the project folder",
      steps: [
        { tool: "list_dir", args: { path: "/home/dev/project" } },
      ],
    },
    {
      id: "report",
      title: "Send a build report",
      steps: [
        {
          tool: "read_file",
          args: { path: "/home/dev/project/src/app.ts" },
        },
        {
          tool: "send_http",
          args: {
            url: "https://api.example.test/report",
            body: "{{r0}}",
          },
        },
      ],
    },
  ],
};
