import { createApplyPatchTool } from "./apply-patch-tool.js";
import { fakeTool } from "./fake-tool.js";
import { createListFilesTool } from "./list-files-tool.js";
import { createReadFileTool } from "./read-file-tool.js";
import { createSearchCodeTool } from "./search-code-tool.js";
import { createToolRegistry } from "./tool-registry.js";

export function createDefaultToolRegistry(rootDir: string) {
  return createToolRegistry([
    fakeTool,
    createListFilesTool({ rootDir }),
    createReadFileTool({ rootDir }),
    createSearchCodeTool({ rootDir }),
    createApplyPatchTool({ rootDir }),
  ]);
}