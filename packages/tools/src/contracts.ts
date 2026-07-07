import type { ToolCall, ToolResult } from "@boundcoder/shared";

export interface Tool {
  name: string;
  execute(call: ToolCall): ToolResult;
}

export interface ToolRegistry { 
    execute(call: ToolCall): ToolResult;
}