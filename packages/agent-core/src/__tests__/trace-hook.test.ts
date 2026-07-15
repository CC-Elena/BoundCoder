import { describe, expect, it, vi } from "vitest";
import {
  createTraceHook,
  type ToolCallHookPayload,
  type ToolResultHookPayload,
} from "../runtime/lifecycle/index.js";

function createToolCallPayload(
  runtimeId: string,
  occurredAt: number,
): ToolCallHookPayload {
  return {
    occurredAt,
    runtime: {
      runtimeId,
      task: "读取文件",
      step: 1,
      messages: [],
    },
    toolCall: {
      id: "call-1",
      name: "read_file",
      parameters: { path: "src/index.ts" },
    },
  };
}

function createToolResultPayload(
  runtimeId: string,
  occurredAt: number,
  ok: boolean,
): ToolResultHookPayload {
  return {
    ...createToolCallPayload(runtimeId, occurredAt),
    occurredAt,
    toolResult: {
      toolCallId: "call-1",
      ok,
      output: "",
      errorMessage: ok ? undefined : "tool failed",
    },
  };
}

describe("createTraceHook", () => {
  it("应使用 Lifecycle 时间生成 ToolCall 总链路 Span", async () => {
    const record = vi.fn();
    const hook = createTraceHook(record);

    await hook.onToolCall?.(createToolCallPayload("runtime-1", 1_000));
    await hook.onToolResult?.(
      createToolResultPayload("runtime-1", 1_275, true),
    );

    expect(record).toHaveBeenCalledWith({
      name: "tool_call",
      runtimeId: "runtime-1",
      toolCallId: "call-1",
      toolName: "read_file",
      step: 1,
      startedAt: 1_000,
      endedAt: 1_275,
      durationMs: 275,
      outcome: "success",
    });
  });

  it("应使用 runtimeId 和 toolCallId 关联并发 Span", async () => {
    const record = vi.fn();
    const hook = createTraceHook(record);

    await hook.onToolCall?.(createToolCallPayload("runtime-1", 100));
    await hook.onToolCall?.(createToolCallPayload("runtime-2", 200));
    await hook.onToolResult?.(
      createToolResultPayload("runtime-2", 260, false),
    );
    await hook.onToolResult?.(
      createToolResultPayload("runtime-1", 180, true),
    );

    expect(record.mock.calls.map(([span]) => span)).toEqual([
      expect.objectContaining({
        runtimeId: "runtime-2",
        durationMs: 60,
        outcome: "failure",
      }),
      expect.objectContaining({
        runtimeId: "runtime-1",
        durationMs: 80,
        outcome: "success",
      }),
    ]);
  });

  it("没有对应 ToolCall 时不应伪造 Span", async () => {
    const record = vi.fn();
    const hook = createTraceHook(record);

    await hook.onToolResult?.(
      createToolResultPayload("runtime-missing", 300, false),
    );

    expect(record).not.toHaveBeenCalled();
  });

  it("Runtime 异常结束时应中止并清理 Pending Span", async () => {
    const record = vi.fn();
    const hook = createTraceHook(record);

    await hook.onToolCall?.(createToolCallPayload("runtime-1", 100));
    await hook.onRunEnd?.({
      occurredAt: 180,
      runtime: createToolCallPayload("runtime-1", 100).runtime,
      outcome: {
        status: "failed",
        errorMessage: "approval service unavailable",
      },
    });

    expect(record).toHaveBeenCalledWith({
      name: "tool_call",
      runtimeId: "runtime-1",
      toolCallId: "call-1",
      toolName: "read_file",
      step: 1,
      startedAt: 100,
      endedAt: 180,
      durationMs: 80,
      outcome: "aborted",
    });

    await hook.onToolResult?.(
      createToolResultPayload("runtime-1", 200, false),
    );
    expect(record).toHaveBeenCalledTimes(1);
  });
});
