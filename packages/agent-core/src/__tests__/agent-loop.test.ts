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
