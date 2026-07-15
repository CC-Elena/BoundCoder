import { describe, expect, it, vi } from "vitest";
import { createToolRegistry, fakeTool } from "@boundcoder/tools";
import { runAgentLoop } from "../loop/agent-loop.js";
import { fakeModel } from "../model/fake-model.js";

describe("runAgentLoop", () => {
  it("显式注入依赖时，使用默认模型和工具完成最小闭环", async () => {
    const result = await runAgentLoop(
      {
        task: "编写测试",
      },
      {
        toolRegistry: createToolRegistry([fakeTool]),
      },
    );

    expect(result.stopReason).toBe("final_answer");
  });

  it("模型直接返回文本时，应立即结束且不调用工具", async () => {
    const model = vi.fn(() => ({
      role: "assistant" as const,
      kind: "text" as const,
      content: "直接完成",
    }));
    const toolRegistry = {
      execute: vi.fn(),
    };

    const result = await runAgentLoop(
      { task: "编写测试" },
      {
        model,
        toolRegistry,
      },
    );

    expect(result.stopReason).toBe("final_answer");
    expect(result.finalAnswer).toBe("直接完成");
    expect(model).toHaveBeenCalledTimes(1);
    expect(toolRegistry.execute).not.toHaveBeenCalled();
    expect(result.messages.map(({ role, kind }) => ({ role, kind }))).toEqual([
      { role: "user", kind: "text" },
      { role: "assistant", kind: "text" },
    ]);
  });

  it("注入模型和工具后，完成最小闭环", async () => {
    const toolRegistry = createToolRegistry([fakeTool]);
    const events: Array<{ type: string }> = [];

    const result = await runAgentLoop(
      {
        task: "编写测试",
        onEvent: (event) => {
          events.push({ type: event.type });
        },
      },
      {
        model: fakeModel,
        toolRegistry,
      },
    );

    expect(result.stopReason).toBe("final_answer");
    expect(result.finalAnswer).toBe(
      "已处理任务：fake_tool_processed(编写测试)",
    );
    expect(
      result.messages.map(({ role, kind }) => ({ role, kind })),
    ).toEqual([
      { role: "user", kind: "text" },
      { role: "assistant", kind: "tool_call" },
      { role: "tool", kind: "tool_result" },
      { role: "assistant", kind: "text" },
    ]);
    expect(events.map((event) => event.type)).toEqual([
      "run_start",
      "assistant_message",
      "tool_result",
      "assistant_message",
      "run_end",
    ]);
  });

  it("最大步数测试", async () => {
    const toolRegistry = {
      execute: vi.fn(fakeTool.execute),
    };

    const result = await runAgentLoop(
      { task: "编写测试", maxSteps: 1 },
      {
        model: fakeModel,
        toolRegistry,
      },
    );

    expect(result.stopReason).toBe("model_no_final");
    expect(result.finalAnswer).toBe(null);
    expect(toolRegistry.execute).toHaveBeenCalledTimes(1);
    expect(toolRegistry.execute).toHaveBeenCalledWith({
      id: "call-1",
      name: "fake_tool",
      parameters: {
        task: "编写测试",
      },
    });
    expect(
      result.messages.map(({ role, kind }) => ({ role, kind })),
    ).toEqual([
      { role: "user", kind: "text" },
      { role: "assistant", kind: "tool_call" },
      { role: "tool", kind: "tool_result" },
    ]);
  });

  it("工具结果失败时仍会回灌给模型并生成失败回答", async () => {
    const toolRegistry = {
      execute: vi.fn(() => ({
        toolCallId: "call-1",
        ok: false,
        output: "",
        errorMessage: "invalid task parameter",
      })),
    };

    const result = await runAgentLoop(
      { task: "编写测试" },
      {
        model: fakeModel,
        toolRegistry,
      },
    );

    expect(result.stopReason).toBe("final_answer");
    expect(result.finalAnswer).toBe("工具执行失败：invalid task parameter");
    expect(toolRegistry.execute).toHaveBeenCalledTimes(1);
    expect(toolRegistry.execute).toHaveBeenCalledWith({
      id: "call-1",
      name: "fake_tool",
      parameters: {
        task: "编写测试",
      },
    });
    expect(
      result.messages.map(({ role, kind }) => ({ role, kind })),
    ).toEqual([
      { role: "user", kind: "text" },
      { role: "assistant", kind: "tool_call" },
      { role: "tool", kind: "tool_result" },
      { role: "assistant", kind: "text" },
    ]);
  });

  it("应在 Approval 前触发 onToolCall，审批拒绝时也应触发", async () => {
    const callOrder: string[] = [];
    const toolRegistry = {
      execute: vi.fn(),
    };
    const onToolCall = vi.fn(async () => {
      callOrder.push("onToolCall");
    });
    const requestApproval = vi.fn(async () => {
      callOrder.push("approval");
      return { approved: false as const, reason: "rejected for test" };
    });

    await runAgentLoop(
      { task: "编写测试", maxSteps: 1 },
      {
        model: fakeModel,
        toolRegistry,
        approvalHandler: { requestApproval },
        runtimeHook: { onToolCall },
      },
    );

    expect(callOrder).toEqual(["onToolCall", "approval"]);
    expect(onToolCall).toHaveBeenCalledTimes(1);
    expect(onToolCall).toHaveBeenCalledWith({
      runtime: {
        runtimeId: expect.stringMatching(/^runtime-/),
        task: "编写测试",
        step: 1,
        messages: [
          { role: "user", kind: "text", content: "编写测试" },
          {
            role: "assistant",
            kind: "tool_call",
            content: "Calling fake_tool",
            toolCall: {
              id: "call-1",
              name: "fake_tool",
              parameters: { task: "编写测试" },
            },
          },
        ],
      },
      toolCall: {
        id: "call-1",
        name: "fake_tool",
        parameters: { task: "编写测试" },
      },
    });
    expect(toolRegistry.execute).not.toHaveBeenCalled();
  });

  it("onToolCall 修改快照时不应影响 Approval 和工具执行", async () => {
    const toolRegistry = {
      execute: vi.fn(fakeTool.execute),
    };
    const requestApproval = vi.fn(async () => ({ approved: true as const }));

    await runAgentLoop(
      { task: "编写测试", maxSteps: 1 },
      {
        model: fakeModel,
        toolRegistry,
        approvalHandler: { requestApproval },
        runtimeHook: {
          onToolCall(payload) {
            const mutablePayload = payload as unknown as {
              toolCall: { parameters: { task: string } };
            };
            mutablePayload.toolCall.parameters.task = "被 Hook 修改";
          },
        },
      },
    );

    expect(requestApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        toolCall: expect.objectContaining({
          parameters: { task: "编写测试" },
        }),
      }),
    );
    expect(toolRegistry.execute).toHaveBeenCalledWith({
      id: "call-1",
      name: "fake_tool",
      parameters: { task: "编写测试" },
    });
  });

  it("onToolCall 抛错时应隔离失败并继续 Runtime", async () => {
    const hookError = new Error("hook unavailable");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const toolRegistry = {
      execute: vi.fn(fakeTool.execute),
    };
    const requestApproval = vi.fn(async () => ({ approved: true as const }));

    await runAgentLoop(
      { task: "编写测试", maxSteps: 1 },
      {
        model: fakeModel,
        toolRegistry,
        approvalHandler: { requestApproval },
        runtimeHook: {
          onToolCall() {
            throw hookError;
          },
        },
      },
    );

    expect(consoleError).toHaveBeenCalledWith(
      "[runtime-hook] onToolCall failed",
      hookError,
    );
    expect(requestApproval).toHaveBeenCalledTimes(1);
    expect(toolRegistry.execute).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });

  it("执行工具后应触发 onToolResult hook", async () => {
    const toolRegistry = {
      execute: vi.fn(fakeTool.execute),
    };
    const onToolResult = vi.fn(async () => {});

    const result = await runAgentLoop(
      { task: "编写测试" },
      {
        model: fakeModel,
        toolRegistry,
        runtimeHook: { onToolResult },
      },
    );

    expect(result.stopReason).toBe("final_answer");
    expect(onToolResult).toHaveBeenCalledTimes(1);
    expect(onToolResult).toHaveBeenCalledWith({
      runtime: {
        runtimeId: expect.stringMatching(/^runtime-/),
        task: "编写测试",
        step: 1,
        messages: [
          { role: "user", kind: "text", content: "编写测试" },
          {
            role: "assistant",
            kind: "tool_call",
            content: "Calling fake_tool",
            toolCall: {
              id: "call-1",
              name: "fake_tool",
              parameters: {
                task: "编写测试",
              },
            },
          },
          {
            role: "tool",
            kind: "tool_result",
            content: "fake_tool_processed(编写测试)",
            toolResult: {
              toolCallId: "call-1",
              ok: true,
              output: "fake_tool_processed(编写测试)",
            },
          },
        ],
      },
      toolCall: {
        id: "call-1",
        name: "fake_tool",
        parameters: {
          task: "编写测试",
        },
      },
      toolResult: {
        toolCallId: "call-1",
        ok: true,
        output: "fake_tool_processed(编写测试)",
      },
    });
  });

  it("Approval 拒绝生成的结果也应触发 onToolResult", async () => {
    const onToolResult = vi.fn(async () => {});
    const toolRegistry = {
      execute: vi.fn(),
    };

    await runAgentLoop(
      { task: "编写测试", maxSteps: 1 },
      {
        model: fakeModel,
        toolRegistry,
        approvalHandler: {
          requestApproval: vi.fn(async () => ({
            approved: false as const,
            reason: "rejected for test",
          })),
        },
        runtimeHook: { onToolResult },
      },
    );

    expect(toolRegistry.execute).not.toHaveBeenCalled();
    expect(onToolResult).toHaveBeenCalledTimes(1);
    expect(onToolResult).toHaveBeenCalledWith(
      expect.objectContaining({
        runtime: expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              kind: "tool_result",
              toolResult: expect.objectContaining({
                errorMessage: "approval rejected: rejected for test",
              }),
            }),
          ]),
        }),
        toolResult: {
          toolCallId: "call-1",
          ok: false,
          output: "",
          errorMessage: "approval rejected: rejected for test",
        },
      }),
    );
  });

  it("onToolResult 修改快照时不应影响 Runtime 消息", async () => {
    const result = await runAgentLoop(
      { task: "编写测试", maxSteps: 1 },
      {
        model: fakeModel,
        toolRegistry: {
          execute: vi.fn(fakeTool.execute),
        },
        runtimeHook: {
          onToolResult(payload) {
            const mutablePayload = payload as unknown as {
              toolResult: { output: string };
              runtime: {
                messages: Array<{ content: string }>;
              };
            };
            mutablePayload.toolResult.output = "被 Hook 修改";
            mutablePayload.runtime.messages.at(-1)!.content = "被 Hook 修改";
          },
        },
      },
    );

    expect(result.messages[2]).toMatchObject({
      content: "fake_tool_processed(编写测试)",
      toolResult: {
        output: "fake_tool_processed(编写测试)",
      },
    });
  });

  it("onToolResult 抛错时应隔离失败并继续下一轮 Model", async () => {
    const hookError = new Error("result hook unavailable");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await runAgentLoop(
      { task: "编写测试" },
      {
        model: fakeModel,
        toolRegistry: {
          execute: vi.fn(fakeTool.execute),
        },
        runtimeHook: {
          onToolResult() {
            throw hookError;
          },
        },
      },
    );

    expect(consoleError).toHaveBeenCalledWith(
      "[runtime-hook] onToolResult failed",
      hookError,
    );
    expect(result.stopReason).toBe("final_answer");
    expect(result.finalAnswer).toBe("已处理任务：fake_tool_processed(编写测试)");

    consoleError.mockRestore();
  });

  it("审批通过后才执行工具，并发出 approval 事件", async () => {
    const toolRegistry = {
      execute: vi.fn(fakeTool.execute),
    };
    const requestApproval = vi.fn(async () => ({ approved: true as const }));
    const approvalHandler = { requestApproval };
    const events: string[] = [];

    const result = await runAgentLoop(
      {
        task: "编写测试",
        onEvent: (event) => {
          events.push(event.type);
        },
      },
      {
        model: fakeModel,
        toolRegistry,
        approvalHandler,
      },
    );

    expect(result.stopReason).toBe("final_answer");
    expect(requestApproval).toHaveBeenCalledTimes(1);
    expect(requestApproval).toHaveBeenCalledWith({
      runtimeId: expect.stringMatching(/^runtime-/),
      task: "编写测试",
      step: 1,
      messages: [
        { role: "user", kind: "text", content: "编写测试" },
        {
          role: "assistant",
          kind: "tool_call",
          content: "Calling fake_tool",
          toolCall: {
            id: "call-1",
            name: "fake_tool",
            parameters: {
              task: "编写测试",
            },
          },
        },
      ],
      toolCall: {
        id: "call-1",
        name: "fake_tool",
        parameters: {
          task: "编写测试",
        },
      },
    });
    expect(toolRegistry.execute).toHaveBeenCalledTimes(1);
    expect(events).toEqual([
      "run_start",
      "assistant_message",
      "approval_requested",
      "approval_resolved",
      "tool_result",
      "assistant_message",
      "run_end",
    ]);
  });

  it("审批拒绝时不执行工具，而是回灌合成失败结果", async () => {
    const toolRegistry = {
      execute: vi.fn(),
    };
    const approvalHandler = {
      requestApproval: vi.fn(async () => ({
        approved: false as const,
        reason: "needs user confirmation",
      })),
    };

    const result = await runAgentLoop(
      { task: "编写测试" },
      {
        model: fakeModel,
        toolRegistry,
        approvalHandler,
      },
    );

    expect(toolRegistry.execute).not.toHaveBeenCalled();
    expect(result.stopReason).toBe("final_answer");
    expect(result.finalAnswer).toBe("工具执行失败：approval rejected: needs user confirmation");
    expect(result.messages.map(({ role, kind }) => ({ role, kind }))).toEqual([
      { role: "user", kind: "text" },
      { role: "assistant", kind: "tool_call" },
      { role: "tool", kind: "tool_result" },
      { role: "assistant", kind: "text" },
    ]);
    expect(result.messages[2]).toMatchObject({
      role: "tool",
      kind: "tool_result",
      content: "approval rejected: needs user confirmation",
      toolResult: {
        toolCallId: "call-1",
        ok: false,
        output: "",
        errorMessage: "approval rejected: needs user confirmation",
      },
    });
  });

  it("模型返回缺少 toolCall 的 tool_call 消息时，应安全停止", async () => {
    const model = vi.fn(() => ({
      role: "assistant" as const,
      kind: "tool_call" as const,
      content: "broken tool call",
      // 故意没有 toolCall
    }));

    const toolRegistry = {
      execute: vi.fn(),
    };

    const result = await runAgentLoop(
      { task: "测试异常工具调用" },
      {
        model,
        toolRegistry,
      },
    );

    expect(result.stopReason).toBe("invalid_tool_call");
    expect(result.finalAnswer).toBeNull();

    expect(model).toHaveBeenCalledTimes(1);
    expect(toolRegistry.execute).not.toHaveBeenCalled();

    expect(
      result.messages.map(({ role, kind }) => ({ role, kind })),
    ).toEqual([
      { role: "user", kind: "text" },
      { role: "assistant", kind: "tool_call" },
    ]);
  });
});
