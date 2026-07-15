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
      return write({
        event: "tool_call",
        runtimeId: payload.runtime.runtimeId,
        step: payload.runtime.step,
        toolCallId: payload.toolCall.id,
        toolName: payload.toolCall.name,
      });
    },
    onToolResult(payload) {
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
