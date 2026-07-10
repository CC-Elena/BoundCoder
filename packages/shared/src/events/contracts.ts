import type { AgentMessage } from "../messages/index.js";
import type { ToolCall, ToolResult } from "../tool/index.js";

export type AgentStopReason = "final_answer" | "invalid_tool_call" | "model_no_final";

export interface AgentRunStartedEvent {
  type: "run_start";
  task: string;
  timestamp: number;
}

export interface AgentAssistantMessageEvent {
  type: "assistant_message";
  step: number;
  message: AgentMessage;
  timestamp: number;
}

export interface AgentToolResultEvent {
  type: "tool_result";
  step: number;
  toolResult: ToolResult;
  timestamp: number;
}

export interface AgentApprovalRequestedEvent {
  type: "approval_requested";
  step: number;
  toolCall: ToolCall;
  timestamp: number;
}

export interface AgentApprovalResolvedEvent {
  type: "approval_resolved";
  step: number;
  toolCall: ToolCall;
  approved: boolean;
  reason?: string;
  timestamp: number;
}

export interface AgentRunEndedEvent {
  type: "run_end";
  stopReason: AgentStopReason;
  finalAnswer: string | null;
  timestamp: number;
}

export type AgentEvent =
  | AgentRunStartedEvent
  | AgentAssistantMessageEvent
  | AgentApprovalRequestedEvent
  | AgentApprovalResolvedEvent
  | AgentToolResultEvent
  | AgentRunEndedEvent;

export type AgentRunResult = {
  finalAnswer: string | null;
  messages: AgentMessage[];
  stopReason: AgentStopReason;
};

export interface AgentRunOptions {
  task: string;
  maxSteps?: number;
  onEvent?: (event: AgentEvent) => void;
}