import { describe, expect, it } from "vitest";
import type { ToolCall } from "@boundcoder/shared";
import { executeFakeTool } from "../fake-tool.js";

const invalidTaskCases: Array<{
  caseName: string;
  parameters: Record<string, unknown>;
}> = [
  { caseName: "缺少 task", parameters: {} },
  { caseName: "task 不是字符串", parameters: { task: 123 } },
  { caseName: "task 是空字符串", parameters: { task: "" } },
  { caseName: "task 只包含空白", parameters: { task: "   " } },
];

describe("executeFakeTool", () => {
  it("处理合法任务并返回标准化结果", () => {
    // Arrange
    const toolCall: ToolCall = {
      id: "test-call-1",
      name: "fake_tool",
      parameters: {
        task: "  编写测试  ",
      },
    };

    // Act
    const result = executeFakeTool(toolCall);

    // Assert
    expect(result).toEqual({
      toolCallId: "test-call-1",
      ok: true,
      output: "fake_tool_processed(编写测试)",
    });
  });

  it("拒绝不支持的工具名", () => {
    // Arrange
    const toolCall: ToolCall = {
      id: "test-call-2",
      name: "unsupported_tool",
      parameters: {
        task: "some task",
      },
    };

    // Act
    const result = executeFakeTool(toolCall);

    // Assert
    expect(result).toMatchObject({
      toolCallId: "test-call-2",
      ok: false,
      output: "",
      errorMessage: "unsupported tool: unsupported_tool",
    });
  });

  it.each(invalidTaskCases)(
    "拒绝无效参数：$caseName",
    ({ parameters }) => {
      // Arrange
      const toolCall: ToolCall = {
        id: "test-call-3",
        name: "fake_tool",
        parameters,
      };

      // Act
      const result = executeFakeTool(toolCall);

      // Assert
      expect(result).toMatchObject({
        toolCallId: "test-call-3",
        ok: false,
        output: "",
        errorMessage: "invalid task parameter",
      });
    },
  );
});
