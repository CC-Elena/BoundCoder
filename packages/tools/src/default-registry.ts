import { createApplyPatchTool } from "./apply-patch-tool.js";
import { fakeTool } from "./fake-tool.js";
import { createListFilesTool } from "./list-files-tool.js";
import { createReadFileTool } from "./read-file-tool.js";
import { createSearchCodeTool } from "./search-code-tool.js";
import { createToolRegistry } from "./tool-registry.js";
import { createWorkspaceFs } from "./workspace-fs.js";

export function createDefaultToolRegistry(rootDir: string) {
  const workspaceFs = createWorkspaceFs({ rootDir });

  return createToolRegistry([
    fakeTool,
    createListFilesTool({ workspaceFs }),
    createReadFileTool({ workspaceFs }),
    createSearchCodeTool({ workspaceFs }),
    createApplyPatchTool({ workspaceFs }),
  ]);
}