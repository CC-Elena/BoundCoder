import type { ToolCall, ToolResult } from "@boundcoder/shared";
import type { Tool } from "./contracts.js";
import { paramErr, paramOk, type ParamResult } from "./params.js";
import { fail } from "./tool-helpers.js";
import type { WorkspaceFs } from "./workspace-fs.js";

export interface ReadFileToolOptions {
  workspaceFs: WorkspaceFs;
}

// read_file 的调用参数契约。
export interface ReadFileParameters {
  path: string;
}

// 将非类型化参数解析为类型化的 ReadFileParameters，实现接口↔运行时校验对齐。
export function parseReadFileParameters(
  params: Record<string, unknown>,
): ParamResult<ReadFileParameters> {
  const pathParam = params.path;
  if (typeof pathParam !== "string" || pathParam.trim() === "") {
    return paramErr("invalid path parameter");
  }
  return paramOk({ path: pathParam });
}

const READ_FILE_TOOL_NAME = "read_file";

// 不同运行环境可注入不同工作区；测试时也能传临时目录，避免碰到真实项目文件。
export function createReadFileTool(
  options: ReadFileToolOptions,
): Tool {
  const workspaceFs = options.workspaceFs;

  return {
    name: READ_FILE_TOOL_NAME,

    execute(call: ToolCall): ToolResult {
      const parsed = parseReadFileParameters(call.parameters);
      if (!parsed.ok) {
        return fail(call.id, parsed.error);
      }
      const { path: requestedPath } = parsed.value;

      const readResult = workspaceFs.readFile(requestedPath);
      if (!readResult.ok) {
        return fail(call.id, readResult.error);
      }

      return {
        toolCallId: call.id,
        ok: true,
        output: readResult.value,
      };
    },
  };
}