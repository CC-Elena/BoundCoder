export type AgentRole = "user" | "assistant" | "tool";
export type AgentMessageKind = "text" | "tool_call" | "tool_result";

export interface ToolCall {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  output: string;
  ok: boolean;
  errorMessage?: string;
}

export interface AgentMessage {
  role: AgentRole;
  kind: AgentMessageKind;
  content: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
}