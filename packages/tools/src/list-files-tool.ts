import fs from "fs";
import path from "path";
import type { ToolCall, ToolResult } from "@boundcoder/shared";
import type { Tool } from "./contracts.js";

export interface ListFilesToolOptions {
  rootDir: string;
}

const LIST_FILES_TOOL_NAME = "list_files";

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

function collectFilesRecursively(baseDir: string): string[] {
  const files: string[] = [];
  const stack = [baseDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (!currentDir) {
      continue;
    }

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  files.sort((a, b) => a.localeCompare(b));
  return files;
}

export function createListFilesTool(
  options: ListFilesToolOptions,
): Tool {
  const rootDir = path.resolve(options.rootDir);

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

        const files = collectFilesRecursively(targetPath);
        const output = files
          .map((filePath) => path.relative(rootDir, filePath))
          .join("\n");

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