import { fakeTool } from "./fake-tool.js";
import { createToolRegistry } from "./tool-registry.js";

export const defaultToolRegistry = createToolRegistry([
  fakeTool,
]);