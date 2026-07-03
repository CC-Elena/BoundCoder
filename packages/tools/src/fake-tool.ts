import type { ToolCall, ToolResult } from "@boundcoder/shared";

const SUPPORTED_TOOL_NAME = "fake_tool";

/**
 * fakeTool 的职责：
 * - 不访问文件系统、不调用外部服务
 * - 仅对一个固定工具名做纯内存处理
 * - 返回结构化 ToolResult，供上层 loop 回灌给模型
 */
export function executeFakeTool(call: ToolCall): ToolResult {
  if (call.name !== SUPPORTED_TOOL_NAME) {
    return {
      toolCallId: call.id,
      ok: false,
      output: "",
      errorMessage: `unsupported tool: ${call.name}`,
    };
  }

  const taskValue = call.parameters.task;
  if (typeof taskValue !== "string" || taskValue.trim() === "") {
    return {
      toolCallId: call.id,
      ok: false,
      output: "",
      errorMessage: "invalid task parameter",
    };
  }

  const normalizedTask = taskValue.trim();

  return {
    toolCallId: call.id,
    ok: true,
    output: `fake_tool_processed(${normalizedTask})`,
  };
}
