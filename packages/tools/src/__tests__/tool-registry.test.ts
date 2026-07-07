import { describe, expect, it } from "vitest";
import type { Tool } from "../contracts.js";
import { createToolRegistry } from "../tool-registry.js";
import { fakeTool } from "../fake-tool.js";

describe("createToolRegistry", () => {
  it("按工具名路由到对应工具", () => {
    const toolRegistry = createToolRegistry([fakeTool]);

    expect(
      toolRegistry.execute({
        id: "call-1",
        name: "fake_tool",
        parameters: {
          task: "  编写测试  ",
        },
      }),
    ).toEqual({
      toolCallId: "call-1",
      ok: true,
      output: "fake_tool_processed(编写测试)",
    });
  });

  it("找不到工具时返回 unsupported tool", () => {
    const toolRegistry = createToolRegistry([fakeTool]);

    expect(
      toolRegistry.execute({
        id: "call-2",
        name: "unknown_tool",
        parameters: {},
      }),
    ).toEqual({
      toolCallId: "call-2",
      ok: false,
      output: "",
      errorMessage: "unsupported tool: unknown_tool",
    });
  });

  it("同名工具重复注册时，后者覆盖前者", () => {
    const oldFakeTool: Tool = {
      name: "fake_tool",
      execute(call) {
        return {
          toolCallId: call.id,
          ok: true,
          output: "old_result",
        };
      },
    };

    const newFakeTool: Tool = {
      name: "fake_tool",
      execute(call) {
        return {
          toolCallId: call.id,
          ok: true,
          output: "new_result",
        };
      },
    };

    const toolRegistry = createToolRegistry([oldFakeTool, newFakeTool]);

    expect(
      toolRegistry.execute({
        id: "call-3",
        name: "fake_tool",
        parameters: {},
      }),
    ).toEqual({
      toolCallId: "call-3",
      ok: true,
      output: "new_result",
    });
  });
});