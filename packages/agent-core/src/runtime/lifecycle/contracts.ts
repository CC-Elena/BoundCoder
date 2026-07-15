import type { AgentMessage, ToolCall, ToolResult } from "@boundcoder/shared";

export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

export interface RuntimeContext {
  runtimeId: string;
  task: string;
  step: number;
  messages: readonly AgentMessage[];
}

export interface ToolResultHookPayload {
  readonly runtime: DeepReadonly<RuntimeContext>;
  readonly toolCall: DeepReadonly<ToolCall>;
  readonly toolResult: DeepReadonly<ToolResult>;
}

export interface ToolCallHookPayload {
  readonly runtime: DeepReadonly<RuntimeContext>;
  readonly toolCall: DeepReadonly<ToolCall>;
}

export interface RuntimeHook { // 多种hook的契约格式
  onToolCall?(payload: ToolCallHookPayload): Promise<void> | void;
  onToolResult?(payload: ToolResultHookPayload): Promise<void> | void;
}
