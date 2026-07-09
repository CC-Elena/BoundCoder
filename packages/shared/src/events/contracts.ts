import type { AgentMessage } from "../messages/index.js";
import type { ToolResult } from "../tool/index.js";

export type StopReason = "final_answer" | "invalid_tool_call" | "model_no_final";

export interface RunStartEvent {
  type: "run_start";
  task: string;
  timestamp: number;
}

export interface AssistantMessageEvent {
  type: "assistant_message";
  step: number;
  message: AgentMessage;
  timestamp: number;
}

export interface ToolResultEvent {
  type: "tool_result";
  step: number;
  toolResult: ToolResult;
  timestamp: number;
}

export interface RunEndEvent {
  type: "run_end";
  stopReason: StopReason;
  finalAnswer: string | null;
  timestamp: number;
}

export type AgentEventUnion = RunStartEvent | AssistantMessageEvent | ToolResultEvent | RunEndEvent;

export type AgentEvent = AgentEventUnion;

export type AgentRunResult = {
  finalAnswer: string | null;
  messages: AgentMessage[];
  stopReason: StopReason;
};

export interface AgentRunOptions {
  task: string;
  maxSteps?: number;
  onEvent?: (event: AgentEventUnion) => void;
}