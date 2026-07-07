import { fakeTool } from "./fake-tool.js";
import { createReadFileTool } from "./read-file-tool.js";
import { createToolRegistry } from "./tool-registry.js";

export const defaultToolRegistry = createToolRegistry([
  fakeTool,
  createReadFileTool({ rootDir: process.cwd() }),
]);