import type { ToolResult } from "@boundcoder/shared";

// 构造统一的失败 ToolResult。
export function fail(toolCallId: string, errorMessage: string): ToolResult {
  return {
    toolCallId,
    ok: false,
    output: "",
    errorMessage,
  };
}

// 将未知异常规约为可读错误信息。
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "unknown error";
}
