import { createApplyPatchTool, type ApplyPatchToolOptions } from "./apply-patch-tool.js";
import { fakeTool } from "./fake-tool.js";
import { createListFilesTool } from "./list-files-tool.js";
import { createReadFileTool } from "./read-file-tool.js";
import { createRunCommandTool, type RunCommandToolOptions } from "./run-command-tool.js";
import { createSearchCodeTool, type SearchCodeToolOptions } from "./search-code-tool.js";
import { createToolRegistry } from "./tool-registry.js";
import { createWorkspaceFs } from "./workspace-fs.js";

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