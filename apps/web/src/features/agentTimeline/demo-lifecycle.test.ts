import {
  composeRuntimeHooks,
  createInMemoryRuntimeMetrics,
  createLoggingHook,
  createMetricsHook,
  type RuntimeLogEntry,
} from "@boundcoder/agent-core";
import { describe, expect, it, vi } from "vitest";
import { createDemoRun } from "./demo";

describe("createDemoRun lifecycle", () => {
  it("应把默认注入的 LoggingHook 接入 ToolCall 和 ToolResult", async () => {
    const logs: RuntimeLogEntry[] = [];
    const runtimeHook = createLoggingHook((entry) => {
      logs.push(entry);
    });

    await createDemoRun("演示任务", vi.fn(), { runtimeHook });

    expect(logs).toEqual([
      {
        event: "tool_call",
        runtimeId: expect.stringMatching(/^web-runtime-/),
        step: 1,
        toolCallId: "call-1",
        toolName: "fake_tool",
      },
      {
        event: "tool_result",
        runtimeId: expect.stringMatching(/^web-runtime-/),
        step: 1,
        toolCallId: "call-1",
        toolName: "fake_tool",
        ok: false,
        errorMessage: "unsupported tool: fake_tool",
      },
    ]);
  });

  it("应组合 LoggingHook 和应用级 MetricsHook", async () => {
    const logs: RuntimeLogEntry[] = [];
    const metrics = createInMemoryRuntimeMetrics();
    const runtimeHook = composeRuntimeHooks([
      createLoggingHook((entry) => {
        logs.push(entry);
      }),
      createMetricsHook(metrics.record),
    ]);

    await createDemoRun("演示任务", vi.fn(), { runtimeHook });
    await createDemoRun("演示任务", vi.fn(), { runtimeHook });

    expect(logs).toHaveLength(4);
    expect(metrics.snapshot()).toEqual({
      toolCallsTotal: {
        fake_tool: 2,
      },
      toolResultsTotal: {
        fake_tool: {
          success: 0,
          failure: 2,
        },
      },
    });
  });
});
