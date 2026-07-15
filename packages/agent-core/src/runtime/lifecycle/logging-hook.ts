import type { RuntimeHook } from "./contracts.js";

export interface ToolCallLogEntry {
  event: "tool_call";
  runtimeId: string;
  step: number;
  toolCallId: string;
  toolName: string;
}

export interface ToolResultLogEntry {
  event: "tool_result";
  runtimeId: string;
  step: number;
  toolCallId: string;
  toolName: string;
  ok: boolean;
  errorMessage?: string;
}

export type RuntimeLogEntry = ToolCallLogEntry | ToolResultLogEntry;

export type RuntimeLogSink = (
  entry: RuntimeLogEntry,
) => void | Promise<void>;

export function createLoggingHook(write: RuntimeLogSink): RuntimeHook {
  return {
    onToolCall(payload) {
      // 字段白名单：默认不记录 task、parameters、messages 等潜在敏感内容。
      return write({
        event: "tool_call",
        runtimeId: payload.runtime.runtimeId,
        step: payload.runtime.step,
        toolCallId: payload.toolCall.id,
        toolName: payload.toolCall.name,
      });
    },
    onToolResult(payload) {
      // output 可能包含源码或文件内容，因此只记录结果状态和关联 ID。
      // TODO: 对 errorMessage 增加脱敏与长度限制，它仍可能包含敏感信息。
      return write({
        event: "tool_result",
        runtimeId: payload.runtime.runtimeId,
        step: payload.runtime.step,
        toolCallId: payload.toolResult.toolCallId,
        toolName: payload.toolCall.name,
        ok: payload.toolResult.ok,
        errorMessage: payload.toolResult.errorMessage,
      });
    },
  };
}
