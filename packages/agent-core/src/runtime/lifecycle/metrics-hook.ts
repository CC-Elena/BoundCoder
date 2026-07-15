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
      return record({
        name: "tool_calls_total",
        value: 1,
        labels: {
          tool: payload.toolCall.name,
        },
      });
    },
    onToolResult(payload) {
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
