import type {
  RuntimeMetricIncrement,
  RuntimeMetricsSink,
} from "./metrics-hook.js";

export interface ToolResultOutcomeCounts {
  success: number;
  failure: number;
}

export interface RuntimeMetricsSnapshot {
  toolCallsTotal: Record<string, number>;
  toolResultsTotal: Record<string, ToolResultOutcomeCounts>;
}

export interface InMemoryRuntimeMetrics {
  record: RuntimeMetricsSink;
  snapshot(): RuntimeMetricsSnapshot;
}

function incrementCount(counts: Map<string, number>, key: string): void {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function toSortedRecord<T>(entries: Iterable<[string, T]>): Record<string, T> {
  return Object.fromEntries(
    [...entries].sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function createInMemoryRuntimeMetrics(): InMemoryRuntimeMetrics {
  // 第一版演示存储：生命周期与 CLI 进程或 Web 页面一致，重启后清空。
  // TODO: 需要跨进程聚合时，用 Prometheus/OpenTelemetry Adapter 替换该实现。
  const toolCalls = new Map<string, number>();
  const toolResults = new Map<string, ToolResultOutcomeCounts>();

  function record(increment: RuntimeMetricIncrement): void {
    if (increment.name === "tool_calls_total") {
      incrementCount(toolCalls, increment.labels.tool);
      return;
    }

    const tool = increment.labels.tool;
    const current = toolResults.get(tool) ?? { success: 0, failure: 0 };
    toolResults.set(tool, {
      ...current,
      [increment.labels.outcome]: current[increment.labels.outcome] + 1,
    });
  }

  return {
    record,
    snapshot() {
      // 返回副本，展示层修改 snapshot 不会破坏内部累计值。
      return {
        toolCallsTotal: toSortedRecord(toolCalls.entries()),
        toolResultsTotal: toSortedRecord(
          [...toolResults.entries()].map(([tool, counts]) => [
            tool,
            { ...counts },
          ]),
        ),
      };
    },
  };
}
