import type {
  RuntimeHook,
  ToolCallHookPayload,
  ToolResultHookPayload,
} from "./contracts.js";

async function invokeToolCallHooks(
  hooks: readonly RuntimeHook[],
  payload: ToolCallHookPayload,
): Promise<void> {
  for (const [index, hook] of hooks.entries()) {
    if (!hook.onToolCall) {
      continue;
    }

    try {
      await hook.onToolCall(structuredClone(payload));
    } catch (error) {
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
      await hook.onToolResult(structuredClone(payload));
    } catch (error) {
      console.error(`[runtime-hook] onToolResult hook ${index} failed`, error);
    }
  }
}

export function composeRuntimeHooks(
  hooks: readonly RuntimeHook[],
): RuntimeHook {
  const registeredHooks = [...hooks];

  return {
    onToolCall(payload) {
      return invokeToolCallHooks(registeredHooks, payload);
    },
    onToolResult(payload) {
      return invokeToolResultHooks(registeredHooks, payload);
    },
  };
}
