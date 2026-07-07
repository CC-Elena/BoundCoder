import { fakeTool } from "./fake-tool.js";
import { createReadFileTool } from "./read-file-tool.js";
import { createToolRegistry } from "./tool-registry.js";

export function createDefaultToolRegistry(rootDir: string) {
  return createToolRegistry([
    fakeTool,
    createReadFileTool({ rootDir }),
  ]);
}