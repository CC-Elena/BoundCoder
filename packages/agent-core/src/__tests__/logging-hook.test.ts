import { describe, expect, it, vi } from "vitest";
import {
  createLoggingHook,
  type ToolCallHookPayload,
  type ToolResultHookPayload,
} from "../runtime/lifecycle/index.js";

const toolCallPayload: ToolCallHookPayload = {
  occurredAt: 100,
  runtime: {
    runtimeId: "runtime-1",
    task: "读取包含敏感信息的文件",
    step: 2,
    messages: [],
  },
  toolCall: {
    id: "call-1",
    name: "read_file",
    parameters: {
      path: "secret.txt",
      token: "do-not-log",
    },
  },
};

describe("createLoggingHook", () => {
  it("onToolCall 应只记录可关联的元数据", async () => {
    const write = vi.fn();
    const hook = createLoggingHook(write);

    await hook.onToolCall?.(toolCallPayload);

    expect(write).toHaveBeenCalledWith({
      event: "tool_call",
      runtimeId: "runtime-1",
      step: 2,
      toolCallId: "call-1",
      toolName: "read_file",
    });
    expect(JSON.stringify(write.mock.calls)).not.toContain("do-not-log");
    expect(JSON.stringify(write.mock.calls)).not.toContain("secret.txt");
  });

  it("onToolResult 应通过 toolCallId 记录结果状态，但不记录 output", async () => {
    const write = vi.fn();
    const hook = createLoggingHook(write);
    const payload: ToolResultHookPayload = {
      ...toolCallPayload,
      toolResult: {
        toolCallId: "call-1",
        ok: false,
        output: "sensitive file content",
        errorMessage: "permission denied",
      },
    };

    await hook.onToolResult?.(payload);

    expect(write).toHaveBeenCalledWith({
      event: "tool_result",
      runtimeId: "runtime-1",
      step: 2,
      toolCallId: "call-1",
      toolName: "read_file",
      ok: false,
      errorMessage: "permission denied",
    });
    expect(JSON.stringify(write.mock.calls)).not.toContain(
      "sensitive file content",
    );
  });
});
