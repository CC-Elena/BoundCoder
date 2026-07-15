import type {
  AgentMessage,
  AgentStopReason,
  ToolCall,
  ToolResult,
} from "@boundcoder/shared";

// 编译期阻止 Hook 误改嵌套数据；运行时隔离仍由 structuredClone 保证。
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
  // 由 Runtime 在结果提交时捕获，避免耗时统计受 Hook 调用顺序影响。
  readonly occurredAt: number;
  readonly runtime: DeepReadonly<RuntimeContext>;
  readonly toolCall: DeepReadonly<ToolCall>;
  readonly toolResult: DeepReadonly<ToolResult>;
}

export interface ToolCallHookPayload {
  // 由 Runtime 在 ToolCall 产生时捕获，所有 Hook 观察同一个事实时间。
  readonly occurredAt: number;
  readonly runtime: DeepReadonly<RuntimeContext>;
  readonly toolCall: DeepReadonly<ToolCall>;
}

export type RuntimeEndOutcome =
  | {
      status: "completed";
      stopReason: AgentStopReason;
    }
  | {
      status: "failed";
      errorMessage: string;
    };

export interface RunEndHookPayload {
  readonly occurredAt: number;
  readonly runtime: DeepReadonly<RuntimeContext>;
  readonly outcome: DeepReadonly<RuntimeEndOutcome>;
}

export interface RuntimeHook { // 多种hook的契约格式
  onToolCall?(payload: ToolCallHookPayload): Promise<void> | void;
  onToolResult?(payload: ToolResultHookPayload): Promise<void> | void;
  onRunEnd?(payload: RunEndHookPayload): Promise<void> | void;
  // TODO: Runtime 支持 AbortSignal 后，为 outcome 增加 cancelled 状态。
  // TODO: 有真实耗时诊断需求后，再增加 Approval/ToolExecution 子生命周期。
}
