import { describe, expect, it } from "vitest";
import { createInMemoryRuntimeMetrics } from "../runtime/lifecycle/index.js";

describe("createInMemoryRuntimeMetrics", () => {
  it("应按工具和结果聚合指标增量", () => {
    const metrics = createInMemoryRuntimeMetrics();

    metrics.record({
      name: "tool_calls_total",
      value: 1,
      labels: { tool: "read_file" },
    });
    metrics.record({
      name: "tool_calls_total",
      value: 1,
      labels: { tool: "read_file" },
    });
    metrics.record({
      name: "tool_calls_total",
      value: 1,
      labels: { tool: "run_command" },
    });
    metrics.record({
      name: "tool_results_total",
      value: 1,
      labels: { tool: "read_file", outcome: "success" },
    });
    metrics.record({
      name: "tool_results_total",
      value: 1,
      labels: { tool: "read_file", outcome: "failure" },
    });

    expect(metrics.snapshot()).toEqual({
      toolCallsTotal: {
        read_file: 2,
        run_command: 1,
      },
      toolResultsTotal: {
        read_file: {
          success: 1,
          failure: 1,
        },
      },
    });
  });

  it("修改快照不应影响内部计数", () => {
    const metrics = createInMemoryRuntimeMetrics();
    metrics.record({
      name: "tool_results_total",
      value: 1,
      labels: { tool: "read_file", outcome: "success" },
    });

    const snapshot = metrics.snapshot();
    snapshot.toolResultsTotal.read_file!.success = 999;

    expect(metrics.snapshot().toolResultsTotal.read_file).toEqual({
      success: 1,
      failure: 0,
    });
  });
});
