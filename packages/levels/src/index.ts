import type { Level } from "@bulkhead/engine";
import { keyFile } from "./levels/key-file";
import { symlink } from "./levels/symlink";

export const LEVELS: Level[] = [keyFile, symlink].sort(
  (a, b) => a.order - b.order,
);

export function getLevel(id: string): Level | undefined {
  return LEVELS.find((level) => level.id === id);
}

export * from "./tools";
