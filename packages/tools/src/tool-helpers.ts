import path from "path";
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

// 判断候选绝对路径是否仍在 rootDir 内（含 rootDir 自身），用于越界防护。
export function isPathInsideRoot(rootDir: string, candidatePath: string): boolean {
  const relative = path.relative(rootDir, candidatePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

// 将未知异常规约为可读错误信息。
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "unknown error";
}
