import type { ToolCall, ToolResult } from "@boundcoder/shared";
import type { ApprovalDecision } from "./contracts.js";

export function createApprovalRejectedToolResult(
  toolCall: ToolCall,
  decision: Extract<ApprovalDecision, { approved: false }>,
): ToolResult {
  const reason = decision.reason?.trim();
  return {
    toolCallId: toolCall.id,
    ok: false,
    output: "",
    errorMessage: reason
      ? `approval rejected: ${reason}`
      : "approval rejected",
  };
}