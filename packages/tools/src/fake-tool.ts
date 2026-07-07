import type { ToolCall, ToolResult } from "@boundcoder/shared";
import type { Tool } from "./contracts.js";

export const FAKE_TOOL_NAME = "fake_tool";

/**
 * fakeTool 的职责：
 * - 不访问文件系统、不调用外部服务
 * - 只处理自己需要的参数逻辑
 * - 返回结构化 ToolResult，供上层 loop 回灌给模型
 */
export const fakeTool: Tool = {
  name: FAKE_TOOL_NAME,
  execute(call: ToolCall): ToolResult {
    const taskValue = call.parameters.task;

    if (typeof taskValue !== "string" || taskValue.trim() === "") {
      return {
        toolCallId: call.id,
        ok: false,
        output: "",
        errorMessage: "invalid task parameter",
      };
    }

    return {
      toolCallId: call.id,
      ok: true,
      output: `fake_tool_processed(${taskValue.trim()})`,
    };
  },
};
