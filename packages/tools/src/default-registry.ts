import { createApplyPatchTool, type ApplyPatchToolOptions } from "./filesystem/apply-patch-tool.js";
import { fakeTool } from "./fake-tool.js";
import { createListFilesTool } from "./filesystem/list-files-tool.js";
import { createReadFileTool } from "./filesystem/read-file-tool.js";
import { createRunCommandTool, type RunCommandToolOptions } from "./command/run-command-tool.js";
import { createSearchCodeTool, type SearchCodeToolOptions } from "./filesystem/search-code-tool.js";
import { createToolRegistry } from "./tool-registry.js";
import { createWorkspaceFs } from "./filesystem/workspace-fs.js";

export interface DefaultToolRegistryOptions {
  searchCodeOptions?: Omit<SearchCodeToolOptions, "workspaceFs">;
  applyPatchOptions?: Omit<ApplyPatchToolOptions, "workspaceFs">;
  runCommandOptions?: Omit<RunCommandToolOptions, "rootDir">;
}

export function createDefaultToolRegistry(
  rootDir: string,
  options: DefaultToolRegistryOptions = {},
) {
  const workspaceFs = createWorkspaceFs({ rootDir });
  const searchCodeOptions = options.searchCodeOptions ?? {};
  const applyPatchOptions = options.applyPatchOptions ?? {};
  const runCommandOptions = options.runCommandOptions ?? {};

  return createToolRegistry([
    fakeTool,
    createListFilesTool({ workspaceFs }),
    createReadFileTool({ workspaceFs }),
    createSearchCodeTool({ workspaceFs, ...searchCodeOptions }),
    createApplyPatchTool({ workspaceFs, ...applyPatchOptions }),
    createRunCommandTool({ rootDir, ...runCommandOptions }),
  ]);
}