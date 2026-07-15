import { describe, expect, it, vi } from "vitest";
import {
  createMetricsHook,
  type ToolCallHookPayload,
  type ToolResultHookPayload,
} from "../runtime/lifecycle/index.js";

const toolCallPayload: ToolCallHookPayload = {
  occurredAt: 100,
  runtime: {
    runtimeId: "runtime-high-cardinality-1",
    task: "读取文件",
    step: 1,
    messages: [],
  },
  toolCall: {
    id: "call-high-cardinality-1",
    name: "read_file",
    parameters: { path: "secret.txt" },
  },
};

describe("createMetricsHook", () => {
  it("onToolCall 应只使用有限的 tool 标签", async () => {
    const record = vi.fn();
    const hook = createMetricsHook(record);

    await hook.onToolCall?.(toolCallPayload);

    expect(record).toHaveBeenCalledWith({
      name: "tool_calls_total",
      value: 1,
      labels: {
        tool: "read_file",
      },
    });
    expect(JSON.stringify(record.mock.calls)).not.toContain("runtime-high-cardinality-1");
    expect(JSON.stringify(record.mock.calls)).not.toContain("call-high-cardinality-1");
  });

  it.each([
    { ok: true, expectedOutcome: "success" },
    { ok: false, expectedOutcome: "failure" },
  ] as const)(
    "onToolResult 应把 ok=$ok 聚合为 $expectedOutcome",
    async ({ ok, expectedOutcome }) => {
      const record = vi.fn();
      const hook = createMetricsHook(record);
      const payload: ToolResultHookPayload = {
        ...toolCallPayload,
        toolResult: {
          toolCallId: "call-high-cardinality-1",
          ok,
          output: "",
          errorMessage: ok ? undefined : "approval rejected: sensitive reason",
        },
      };

      await hook.onToolResult?.(payload);

      expect(record).toHaveBeenCalledWith({
        name: "tool_results_total",
        value: 1,
        labels: {
          tool: "read_file",
          outcome: expectedOutcome,
        },
      });
      expect(JSON.stringify(record.mock.calls)).not.toContain("approval rejected");
    },
  );
});
