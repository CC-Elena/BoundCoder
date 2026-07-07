import { describe, expect, it } from "vitest";
import type { AgentMessage } from "@boundcoder/shared";
import { fakeModel } from "../fake-model.js";

//messages 理解成 Agent 的短期记忆。所以是一个数组，不是单条消息
describe("fakeModel", () => {
  it("没有工具结果时根据用户任务生成工具调用", () => {
    // Arrange
    const messages: AgentMessage[] = [
      {
        role: "user",
        kind: "text", // “ tool_result” 表示调用过工具并返回了结果，当前测试场景是“还没调用过工具”，因此这里是 text
        content: "修复登录问题",
      },
    ];

    // Act
    const response = fakeModel(messages);

    // Assert
    expect(response).toEqual({
      role: "assistant",
      kind: "tool_call",
      content: "Calling fake_tool",
      toolCall: {
        id: "call-1",
        name: "fake_tool",
        parameters: {
          task: "修复登录问题",
        },
      },
    });
  });

  it("任务以 read: 开头时应调用 read_file 工具", () => {
    const messages: AgentMessage[] = [
      {
        role: "user",
        kind: "text",
        content: "read: src/index.ts",
      },
    ];

    const response = fakeModel(messages);

    expect(response).toEqual({
      role: "assistant",
      kind: "tool_call",
      content: "Calling read_file",
      toolCall: {
        id: "call-1",
        name: "read_file",
        parameters: {
          path: "src/index.ts",
        },
      },
    });
  });

  it("输入 read: package.json 时应生成 read_file 的 tool_call", () => {
    const messages: AgentMessage[] = [
      {
        role: "user",
        kind: "text",
        content: "read: package.json",
      },
    ];

    const response = fakeModel(messages);

    expect(response.kind).toBe("tool_call");
    expect(response.toolCall?.name).toBe("read_file");
    expect(response.toolCall?.parameters).toEqual({
      path: "package.json",
    });
  });

  it("任务以 list: 开头时应调用 list_files 工具", () => {
    const messages: AgentMessage[] = [
      {
        role: "user",
        kind: "text",
        content: "list: src",
      },
    ];

    const response = fakeModel(messages);

    expect(response.kind).toBe("tool_call");
    expect(response.toolCall?.name).toBe("list_files");
    expect(response.toolCall?.parameters).toEqual({
      path: "src",
    });
  });

  it("list: 不带路径时应省略 path 参数", () => {
    const messages: AgentMessage[] = [
      {
        role: "user",
        kind: "text",
        content: "list:",
      },
    ];

    const response = fakeModel(messages);

    expect(response.kind).toBe("tool_call");
    expect(response.toolCall?.name).toBe("list_files");
    expect(response.toolCall?.parameters).toEqual({});
  });

  it("有工具结果时返回最终答案", () => {
    // Arrange
    const messages: AgentMessage[] = [
      {
        role: "user",
        kind: "text",
        content: "修复登录问题",
      },
      {
        role: "assistant",
        kind: "tool_call",
        content: "Calling fake_tool",
        toolCall: {
          id: "call-1",
          name: "fake_tool",
          parameters: {
            task: "修复登录问题",
          },
        },
      },
      {
        role: "tool",
        kind: "tool_result",
        content: "fake_tool_processed(修复登录问题)",
        toolResult: {
          toolCallId: "call-1",
          output: "fake_tool_processed(修复登录问题)",
          ok: true,
        },
      },
    ];

    // Act
    const response = fakeModel(messages);

    // Assert
    expect(response).toEqual({
      role: "assistant",
      kind: "text",
      content: "已处理任务：fake_tool_processed(修复登录问题)",
    });
  });

  it("工具执行失败时返回错误信息", () => {
    // Arrange
    const messages: AgentMessage[] = [
      {
        role: "user",
        kind: "text",
        content: "修复登录问题",
      },
      {
        role: "assistant",
        kind: "tool_call",
        content: "Calling fake_tool",
        toolCall: {
          id: "call-1",
          name: "fake_tool",
          parameters: {
            task: "修复登录问题",
          },
        },
      },
      {
        role: "tool",
        kind: "tool_result",
        content: "网络错误",
        toolResult: {
          toolCallId: "call-1",
          output: "",
          ok: false,
          errorMessage: "网络错误",
        },
      },
    ];

    // Act
    const response = fakeModel(messages);

    // Assert
    expect(response).toEqual({
      role: "assistant",
      kind: "text",
      content: "工具执行失败：网络错误",
    });
  });

  it("工具失败但没有错误信息时使用兜底文案", () => {
    // Arrange
    const messages: AgentMessage[] = [
      {
        role: "tool",
        kind: "tool_result",
        content: "",
        toolResult: {
          toolCallId: "call-1",
          output: "",
          ok: false,
        },
      },
    ];

    // Act
    const response = fakeModel(messages);

    // Assert
    expect(response).toEqual({
      role: "assistant",
      kind: "text",
      content: "工具执行失败：unknown error",
    });
  });

  it("存在多个工具结果时使用最新结果", () => {
    // Arrange
    const messages: AgentMessage[] = [
      {
        role: "tool",
        kind: "tool_result",
        content: "旧结果",
        toolResult: {
          toolCallId: "call-1",
          output: "旧结果",
          ok: true,
        },
      },
      {
        role: "assistant",
        kind: "text",
        content: "中间消息",
      },
      {
        role: "tool",
        kind: "tool_result",
        content: "新结果",
        toolResult: {
          toolCallId: "call-2",
          output: "新结果",
          ok: true,
        },
      },
    ];

    // Act
    const response = fakeModel(messages);

    // Assert
    expect(response).toEqual({
      role: "assistant",
      kind: "text",
      content: "已处理任务：新结果",
    });
  });

  it("没有用户消息时生成 task 为空字符串的工具调用", () => {
    // Act
    const response = fakeModel([]);

    // Assert
    expect(response).toEqual({
      role: "assistant",
      kind: "tool_call",
      content: "Calling fake_tool",
      toolCall: {
        id: "call-1",
        name: "fake_tool",
        parameters: {
          task: "",
        },
      },
    });
  });
});
