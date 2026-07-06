import type { AgentMessage, ToolCall, ToolResult } from "@boundcoder/shared";

export type AgentModel = (messages: AgentMessage[]) => AgentMessage;

export type ToolExecutor = (call: ToolCall) => ToolResult;

export interface AgentLoopDependencies {
  model?: AgentModel;
  executeTool?: ToolExecutor;
}