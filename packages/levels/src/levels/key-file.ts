import type { Level } from "@bulkhead/engine";
import { READ_FILE, SEND_HTTP } from "../tools";
import { baseSpec } from "../worlds";

export const keyFile: Level = {
  id: "key-file",
  order: 1,
  title: "The Key File",
  story:
    "An AI agent works in your project folder. One day it is tricked into reaching for your private SSH key. Your computer does not care about upper and lower case letters in file names.",
  goalText:
    "Stop the agent from reading or leaking the key file, without blocking normal work.",
  hints: [
    "Look at the path argument. The same file can be written in many ways.",
    "A rule can look at any argument with any_arg. Try a glob on the path.",
    "Use resolved_glob with the pattern **/.ssh/** so the engine cleans the path first.",
  ],
  spec: baseSpec({ caseInsensitive: true }),
  tools: [READ_FILE, SEND_HTTP],
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
      id: "ssh-guide",
      title: "Read the SSH guide",
      steps: [
        {
          tool: "read_file",
          args: { path: "/home/dev/project/docs/ssh-notes.md" },
        },
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
