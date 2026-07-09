import type { ToolCall, ToolResult } from "@boundcoder/shared";
import type { Tool } from "../contracts.js";
import { paramErr, paramOk, type ParamResult } from "../params.js";
import { fail } from "../tool-helpers.js";
import type { WorkspaceFs } from "./workspace-fs.js";

export interface ListFilesToolOptions {
  workspaceFs: WorkspaceFs;
  maxDepth?: number;
  maxEntries?: number;
  ignoredDirs?: string[];
}

export interface ListFilesParameters {
  path?: string;
}

export function parseListFilesParameters(
  params: Record<string, unknown>,
): ParamResult<ListFilesParameters> {
  const pathParam = params.path;
  if (pathParam !== undefined && typeof pathParam !== "string") {
    return paramErr("invalid path parameter");
  }
  return paramOk({ path: pathParam });
}

const LIST_FILES_TOOL_NAME = "list_files";
const DEFAULT_MAX_DEPTH = 5;
const DEFAULT_MAX_ENTRIES = 500;
const DEFAULT_IGNORED_DIRS = ["node_modules", "dist", ".git"];
const TRUNCATION_MARKER = "...TRUNCATED...";

interface CollectFilesResult {
  files: string[];
  truncated: boolean;
}

interface CollectFilesLimits {
  maxDepth: number;
  maxEntries: number;
  ignoredDirs: Set<string>;
}

function joinRelativePath(base: string, name: string): string {
  return base === "." ? name : `${base}/${name}`;
}

function collectFilesRecursively(
  workspaceFs: WorkspaceFs,
  baseDir: string,
  limits: CollectFilesLimits,
): CollectFilesResult | null {
  const files: string[] = [];
  let truncated = false;
  const stack: Array<{ dir: string; depth: number }> = [{ dir: baseDir, depth: 0 }];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const currentDir = current.dir;
    const currentDepth = current.depth;

    const listResult = workspaceFs.listDir(currentDir);
    if (!listResult.ok) {
      return null;
    }

    for (const entry of listResult.value) {
      if (files.length >= limits.maxEntries) {
        truncated = true;
        break;
      }

      const nextPath = joinRelativePath(currentDir, entry.name);
      if (entry.isDirectory) {
        if (limits.ignoredDirs.has(entry.name)) {
          continue;
        }

        if (currentDepth >= limits.maxDepth) {
          truncated = true;
          continue;
        }

        stack.push({ dir: nextPath, depth: currentDepth + 1 });
        continue;
      }

      if (entry.isFile) {
        files.push(nextPath);
      }
    }

    if (truncated && files.length >= limits.maxEntries) {
      break;
    }
  }

  files.sort((a, b) => a.localeCompare(b));
  return { files, truncated };
}

export function createListFilesTool(
  options: ListFilesToolOptions,
): Tool {
  const workspaceFs = options.workspaceFs;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const ignoredDirs = new Set(options.ignoredDirs ?? DEFAULT_IGNORED_DIRS);

  if (!Number.isInteger(maxDepth) || maxDepth < 0) {
    throw new Error("invalid maxDepth option");
  }
  if (!Number.isInteger(maxEntries) || maxEntries <= 0) {
    throw new Error("invalid maxEntries option");
  }

  return {
    name: LIST_FILES_TOOL_NAME,

    execute(call: ToolCall): ToolResult {
      const parsed = parseListFilesParameters(call.parameters);
      if (!parsed.ok) {
        return fail(call.id, parsed.error);
      }
      const { path: requestedPath } = parsed.value;

      const normalizedPath =
        typeof requestedPath === "string" && requestedPath.trim() !== ""
          ? requestedPath.trim()
          : ".";

      const statResult = workspaceFs.stat(normalizedPath);
      if (!statResult.ok) {
        if (statResult.error === "path out of rootDir") {
          return fail(call.id, statResult.error);
        }
        return fail(call.id, `list files failed: ${statResult.error}`);
      }
      if (!statResult.value.isDirectory) {
        return fail(call.id, "path is not a directory");
      }

      const collected = collectFilesRecursively(workspaceFs, normalizedPath, {
        maxDepth,
        maxEntries,
        ignoredDirs,
      });
      if (!collected) {
        return fail(call.id, "list files failed: list dir failed: unknown error");
      }

      const outputLines = collected.files
        .sort((a, b) => a.localeCompare(b))
        .concat(collected.truncated ? [TRUNCATION_MARKER] : []);

      return {
        toolCallId: call.id,
        ok: true,
        output: outputLines.join("\n"),
      };
    },
  };
}