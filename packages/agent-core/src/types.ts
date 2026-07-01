export type AgentRole = "user" | "assistant" | "tool";
export type AgentMessageKind = "text" | "tool_call" | "tool_result";

export interface ToolCall { 
    id: string; // 调用ID   
    name: string; // 工具名称 
    parameters: Record<string, unknown>; // 工具参数
 }
export interface ToolResult { 
    toolCallId: string; // 工具调用ID
    output: string; // 工具调用结果
    ok: boolean; // 调用状态
    errorMessage?: string; // 错误信息（如果有）
 }

 export interface AgentMessage {
    role: AgentRole; // 消息角色
    kind: AgentMessageKind; // 消息类型
    content: string; // 消息内容 [后面真实模型和真实 Tool Result 可能会有 JSON、结构化参数、附件、日志片段]
    toolCall?: ToolCall; // 工具调用信息（如果有）
    toolResult?: ToolResult; // 工具调用结果（如果有）
}

export type StopReason =
  | "final_answer"
  | "invalid_tool_call"
  | "tool_failed"
  | "model_no_final";

export interface AgentRunResult {
  finalAnswer: string | null;
  messages: AgentMessage[];
  stopReason: StopReason;
}