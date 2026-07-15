import type {
  RunEndHookPayload,
  RuntimeHook,
  ToolCallHookPayload,
  ToolResultHookPayload,
} from "./contracts.js";

async function invokeRunEndHooks(
  hooks: readonly RuntimeHook[],
  payload: RunEndHookPayload,
): Promise<void> {
  for (const [index, hook] of hooks.entries()) {
    if (!hook.onRunEnd) {
      continue;
    }

    try {
      await hook.onRunEnd(structuredClone(payload));
    } catch (error) {
      console.error(`[runtime-hook] onRunEnd hook ${index} failed`, error);
    }
  }
}

async function invokeToolCallHooks(
  hooks: readonly RuntimeHook[],
  payload: ToolCallHookPayload,
): Promise<void> {
  for (const [index, hook] of hooks.entries()) {
    if (!hook.onToolCall) {
      continue;
    }

    try {
      // 每个 Hook 使用独立快照，避免一个观察者污染后续观察者的数据。
      await hook.onToolCall(structuredClone(payload));
    } catch (error) {
      // 单个观察能力失败不能阻止其他 Hook，也不能中断 Runtime。
      console.error(`[runtime-hook] onToolCall hook ${index} failed`, error);
    }
  }
}

async function invokeToolResultHooks(
  hooks: readonly RuntimeHook[],
  payload: ToolResultHookPayload,
): Promise<void> {
  for (const [index, hook] of hooks.entries()) {
    if (!hook.onToolResult) {
      continue;
    }

    try {
      // ToolResult 同样按 Hook 隔离，保证 Logging/Metrics/Trace 互不影响。
      await hook.onToolResult(structuredClone(payload));
    } catch (error) {
      console.error(`[runtime-hook] onToolResult hook ${index} failed`, error);
    }
  }
}

export function composeRuntimeHooks(
  hooks: readonly RuntimeHook[],
): RuntimeHook {
  // 固化注册列表，外部后续修改原数组不会改变 Runtime 行为。
  const registeredHooks = [...hooks];

  // TODO: 为异步 Hook 增加超时策略，避免观察系统永久挂起 Runtime。

  return {
    onToolCall(payload) {
      return invokeToolCallHooks(registeredHooks, payload);
    },
    onToolResult(payload) {
      return invokeToolResultHooks(registeredHooks, payload);
    },
    onRunEnd(payload) {
      return invokeRunEndHooks(registeredHooks, payload);
    },
  };
}
