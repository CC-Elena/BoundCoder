import type { ToolCall, ToolResult } from "@boundcoder/shared";
import type { Tool } from "./contracts.js";
import { paramErr, paramOk, type ParamResult } from "./params.js";
import { fail } from "./tool-helpers.js";

export const FAKE_TOOL_NAME = "fake_tool";

// fake_tool 的调用参数契约。
export interface FakeToolParameters {
  task: string;
}

export function parseFakeToolParameters(
  params: Record<string, unknown>,
): ParamResult<FakeToolParameters> {
  const task = params.task;
  if (typeof task !== "string" || task.trim() === "") {
    return paramErr("invalid task parameter");
  }
  return paramOk({ task });
}

/**
 * fakeTool 的职责：
 * - 不访问文件系统、不调用外部服务
 * - 只处理自己需要的参数逻辑
 * - 返回结构化 ToolResult，供上层 loop 回灌给模型
 */
export const fakeTool: Tool = {
  name: FAKE_TOOL_NAME,
  execute(call: ToolCall): ToolResult {
    const parsed = parseFakeToolParameters(call.parameters);
    if (!parsed.ok) {
      return fail(call.id, parsed.error);
    }
    const { task } = parsed.value;

    return {
      toolCallId: call.id,
      ok: true,
      output: `fake_tool_processed(${task.trim()})`,
    };
  },
};
