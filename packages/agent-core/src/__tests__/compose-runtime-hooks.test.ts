import { describe, expect, it, vi } from "vitest";
import {
  composeRuntimeHooks,
  type ToolCallHookPayload,
  type ToolResultHookPayload,
} from "../runtime/lifecycle/index.js";

const toolCallPayload: ToolCallHookPayload = {
  runtime: {
    runtimeId: "runtime-1",
    task: "读取文件",
    step: 1,
    messages: [],
  },
  toolCall: {
    id: "call-1",
    name: "read_file",
    parameters: { path: "safe.txt" },
  },
};

const toolResultPayload: ToolResultHookPayload = {
  ...toolCallPayload,
  toolResult: {
    toolCallId: "call-1",
    ok: true,
    output: "file content",
  },
};

describe("composeRuntimeHooks", () => {
  it("应按注册顺序调用每个 Hook", async () => {
    const calls: string[] = [];
    const composedHook = composeRuntimeHooks([
      {
        onToolCall: () => {
          calls.push("first:call");
        },
        onToolResult: () => {
          calls.push("first:result");
        },
      },
      {
        onToolCall: () => {
          calls.push("second:call");
        },
        onToolResult: () => {
          calls.push("second:result");
        },
      },
    ]);

    await composedHook.onToolCall?.(toolCallPayload);
    await composedHook.onToolResult?.(toolResultPayload);

    expect(calls).toEqual([
      "first:call",
      "second:call",
      "first:result",
      "second:result",
    ]);
  });

  it("前一个 Hook 失败时应继续调用后续 Hook", async () => {
    const hookError = new Error("logging unavailable");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const metricsHook = vi.fn();
    const composedHook = composeRuntimeHooks([
      {
        onToolCall() {
          throw hookError;
        },
      },
      {
        onToolCall: metricsHook,
      },
    ]);

    await composedHook.onToolCall?.(toolCallPayload);

    expect(consoleError).toHaveBeenCalledWith(
      "[runtime-hook] onToolCall hook 0 failed",
      hookError,
    );
    expect(metricsHook).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });

  it("每个 Hook 应收到独立快照", async () => {
    const observedPaths: string[] = [];
    const composedHook = composeRuntimeHooks([
      {
        onToolCall(payload) {
          const mutablePayload = payload as unknown as {
            toolCall: { parameters: { path: string } };
          };
          mutablePayload.toolCall.parameters.path = "changed-by-first.txt";
        },
      },
      {
        onToolCall(payload) {
          observedPaths.push(payload.toolCall.parameters.path as string);
        },
      },
    ]);

    await composedHook.onToolCall?.(toolCallPayload);

    expect(observedPaths).toEqual(["safe.txt"]);
  });
});
