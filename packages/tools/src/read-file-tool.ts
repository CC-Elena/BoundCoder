import fs from "fs";
import path from "path";
import type { ToolCall, ToolResult } from "@boundcoder/shared";
import type { Tool } from "./contracts.js";

export interface ReadFileToolOptions {
  rootDir: string;
}

const READ_FILE_TOOL_NAME = "read_file";

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

// 不同运行环境可注入不同工作区；测试时也能传临时目录，避免碰到真实项目文件。
export function createReadFileTool(
  options: ReadFileToolOptions,
): Tool {
  const rootDir = path.resolve(options.rootDir);

  return {
    name: READ_FILE_TOOL_NAME,

    execute(call: ToolCall): ToolResult {
      const requestedPath = call.parameters.path;

      if (typeof requestedPath !== "string" || requestedPath.trim() === "") {
        return fail(call.id, "invalid path parameter");
      }

      const targetPath = path.resolve(rootDir, requestedPath);

      if (!isPathInsideRoot(rootDir, targetPath)) {
        return fail(call.id, "path out of rootDir");
      }

      try {
        const content = fs.readFileSync(targetPath, "utf-8");

        return {
          toolCallId: call.id,
          ok: true,
          output: content,
        };
      } catch (error) {
        return fail(call.id, `read file failed: ${toErrorMessage(error)}`);
      }
    },
  };
}