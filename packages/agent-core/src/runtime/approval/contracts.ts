import type { AgentMessage, ToolCall } from "@boundcoder/shared";

export interface ApprovalRequest {
  runtimeId: string;
  task: string;
  step: number;
  messages: readonly AgentMessage[];
  toolCall: ToolCall;
}

export type ApprovalDecision =
  | {
      approved: true;
    }
  | {
      approved: false;
      reason?: string;
    };

export interface ApprovalHandler {
  requestApproval(request: ApprovalRequest): Promise<ApprovalDecision>;
}