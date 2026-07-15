import type { RuntimeHook } from "./contracts.js";

export interface ToolCallMetricIncrement {
  name: "tool_calls_total";
  value: 1;
  labels: {
    tool: string;
  };
}

export interface ToolResultMetricIncrement {
  name: "tool_results_total";
  value: 1;
  labels: {
    tool: string;
    outcome: "success" | "failure";
  };
}

export type RuntimeMetricIncrement =
  | ToolCallMetricIncrement
  | ToolResultMetricIncrement;

export type RuntimeMetricsSink = (
  increment: RuntimeMetricIncrement,
) => void | Promise<void>;

export function createMetricsHook(record: RuntimeMetricsSink): RuntimeHook {
  return {
    onToolCall(payload) {
      // Metrics 只使用有限标签；runtimeId/toolCallId 属于高基数字段。
      return record({
        name: "tool_calls_total",
        value: 1,
        labels: {
          tool: payload.toolCall.name,
        },
      });
    },
    onToolResult(payload) {
      // TODO: ToolResult 增加结构化 failureKind 后，拆分 approval_rejected/tool_failed。
      // 当前不解析 errorMessage，避免指标依赖不稳定的错误文案。
      return record({
        name: "tool_results_total",
        value: 1,
        labels: {
          tool: payload.toolCall.name,
          outcome: payload.toolResult.ok ? "success" : "failure",
        },
      });
    },
  };
}
