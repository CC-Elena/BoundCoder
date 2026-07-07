import fs from "fs";
import path from "path";
import type { ToolCall, ToolResult } from "@boundcoder/shared";
import type { Tool } from "./contracts.js";

export interface ListFilesToolOptions {
  rootDir: string;
  maxDepth?: number;
  maxEntries?: number;
  ignoredDirs?: string[];
}

const LIST_FILES_TOOL_NAME = "list_files";
const DEFAULT_MAX_DEPTH = 5;
const DEFAULT_MAX_ENTRIES = 500;
const DEFAULT_IGNORED_DIRS = ["node_modules", "dist", ".git"];
const TRUNCATION_MARKER = "...TRUNCATED...";

function fail(toolCallId: string, errorMessage: string): ToolResult {
  return {
    toolCallId,
    ok: false,
    output: "",
    errorMessage,
  };
}

function isPathInsideRoot(rootDir: string, candidatePath: string): boolean {
  const relative = path.relative(rootDir, candidatePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "unknown error";
}

interface CollectFilesResult {
  files: string[];
  truncated: boolean;
}

interface CollectFilesLimits {
  maxDepth: number;
  maxEntries: number;
  ignoredDirs: Set<string>;
}

function collectFilesRecursively(
  baseDir: string,
  limits: CollectFilesLimits,
): CollectFilesResult {
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

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (files.length >= limits.maxEntries) {
        truncated = true;
        break;
      }

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (limits.ignoredDirs.has(entry.name)) {
          continue;
        }

        if (currentDepth >= limits.maxDepth) {
          truncated = true;
          continue;
        }

        stack.push({ dir: fullPath, depth: currentDepth + 1 });
        continue;
      }

      if (entry.isFile()) {
        files.push(fullPath);
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
  const rootDir = path.resolve(options.rootDir);
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
      const requestedPath = call.parameters.path;

      if (requestedPath !== undefined && typeof requestedPath !== "string") {
        return fail(call.id, "invalid path parameter");
      }

      // 默认路径是工具被授权的 rootDir
      const normalizedPath =
        typeof requestedPath === "string" && requestedPath.trim() !== ""
          ? requestedPath.trim()
          : ".";

      const targetPath = path.resolve(rootDir, normalizedPath);

      if (!isPathInsideRoot(rootDir, targetPath)) {
        return fail(call.id, "path out of rootDir");
      }

      try {
        const stat = fs.statSync(targetPath);
        if (!stat.isDirectory()) {
          return fail(call.id, "path is not a directory");
        }

        const collected = collectFilesRecursively(targetPath, {
          maxDepth,
          maxEntries,
          ignoredDirs,
        });

        const outputLines = collected.files
          .map((filePath) => path.relative(rootDir, filePath))
          .concat(collected.truncated ? [TRUNCATION_MARKER] : []);
        const output = outputLines.join("\n");

        return {
          toolCallId: call.id,
          ok: true,
          output,
        };
      } catch (error) {
        return fail(call.id, `list files failed: ${toErrorMessage(error)}`);
      }
    },
  };
}