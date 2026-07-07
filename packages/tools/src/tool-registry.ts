import type { ToolCall, ToolResult } from "@boundcoder/shared";
import type { Tool, ToolRegistry } from "./contracts.js";


// 1. 用 call.name 找到对应 Tool
// 2. 找不到时返回 unsupported tool
export const createToolRegistry = (tools: Tool[]): ToolRegistry => {
    const toolMap = new Map<string, Tool>();
    for (const tool of tools) {
        toolMap.set(tool.name, tool);
    }

    return {
        execute(call: ToolCall): ToolResult {
            const tool = toolMap.get(call.name);
            if (!tool) {
                return {
                    toolCallId: call.id,
                    ok: false,
                    output: "",
                    errorMessage: `unsupported tool: ${call.name}`,
                };
            }

            return tool.execute(call);
        },
    };
};