import type { RuntimeHook } from "./contracts.js";

export interface ToolCallTraceSpan {
  name: "tool_call";
  runtimeId: string;
  toolCallId: string;
  toolName: string;
  step: number;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  outcome: "success" | "failure" | "aborted";
}

export type RuntimeTraceSink = (
  span: ToolCallTraceSpan,
) => void | Promise<void>;

interface PendingToolCallSpan {
  runtimeId: string;
  toolCallId: string;
  toolName: string;
  step: number;
  startedAt: number;
}

function createSpanKey(runtimeId: string, toolCallId: string): string {
  // toolCallId 可能在不同 Runtime 中重复，必须与 runtimeId 组合关联。
  return JSON.stringify([runtimeId, toolCallId]);
}

export function createTraceHook(record: RuntimeTraceSink): RuntimeHook {
  // onToolCall 与 onToolResult 跨时刻到达，需要暂存尚未结束的 Span。
  const pendingSpans = new Map<string, PendingToolCallSpan>();

  // TODO: 增加 Approval/ToolExecution 子 Span，拆分等待耗时与执行耗时。
  // TODO: 对接 OpenTelemetry 时改用标准 traceId/spanId 和单调时钟。
  // TODO: 为 CLI/Web 选择演示 Sink，并将 TraceHook 注入各自的 Hook 组合器。

  return {
    onToolCall(payload) {
      const key = createSpanKey(
        payload.runtime.runtimeId,
        payload.toolCall.id,
      );
      pendingSpans.set(key, {
        runtimeId: payload.runtime.runtimeId,
        toolCallId: payload.toolCall.id,
        toolName: payload.toolCall.name,
        step: payload.runtime.step,
        startedAt: payload.occurredAt,
      });
    },
    onToolResult(payload) {
      const key = createSpanKey(
        payload.runtime.runtimeId,
        payload.toolResult.toolCallId,
      );
      const pendingSpan = pendingSpans.get(key);
      if (!pendingSpan) {
        return;
      }

      pendingSpans.delete(key);
      // 当前 Span 表示 ToolCall 到 ToolResult 提交的总链路，而非纯工具执行耗时。
      return record({
        name: "tool_call",
        ...pendingSpan,
        endedAt: payload.occurredAt,
        durationMs: Math.max(0, payload.occurredAt - pendingSpan.startedAt),
        outcome: payload.toolResult.ok ? "success" : "failure",
      });
    },
    async onRunEnd(payload) {
      const abortedSpans: ToolCallTraceSpan[] = [];

      // 先从 Map 删除全部遗留项；即使 Trace Sink 失败，也不能继续泄漏内存。
      for (const [key, pendingSpan] of pendingSpans.entries()) {
        if (pendingSpan.runtimeId !== payload.runtime.runtimeId) {
          continue;
        }

        pendingSpans.delete(key);
        abortedSpans.push({
          name: "tool_call",
          ...pendingSpan,
          endedAt: payload.occurredAt,
          durationMs: Math.max(
            0,
            payload.occurredAt - pendingSpan.startedAt,
          ),
          outcome: "aborted",
        });
      }

      for (const span of abortedSpans) {
        await record(span);
      }
    },
  };
}
