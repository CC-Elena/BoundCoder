import type { ToolCall } from "@boundcoder/shared";

export interface WebApprovalRequest {
  runtimeId: string;
  task: string;
  step: number;
  toolCall: ToolCall;
}

export type WebApprovalDecision =
  | { approved: true }
  | { approved: false; reason?: string };

export interface WebApprovalHandler {
  requestApproval(request: WebApprovalRequest): Promise<WebApprovalDecision>;
}

export interface PendingWebApproval {
  runtimeId: string;
  task: string;
  step: number;
  toolCall: ToolCall;
}

interface PendingResolution {
  request: PendingWebApproval;
  resolve: (decision: WebApprovalDecision) => void;
}

export interface WebApprovalController extends WebApprovalHandler {
  approvePending(rememberToolName?: boolean): boolean;
  rejectPending(reason?: string): boolean;
  resetRun(): void;
}

export interface CreateWebApprovalControllerOptions {
  onPendingChange: (pending: PendingWebApproval | null) => void;
}

export function createWebApprovalController(
  options: CreateWebApprovalControllerOptions,
): WebApprovalController {
  let pending: PendingResolution | null = null;
  const autoApprovedToolNames = new Set<string>();

  return {
    requestApproval(request: WebApprovalRequest): Promise<WebApprovalDecision> {
      if (autoApprovedToolNames.has(request.toolCall.name)) {
        return Promise.resolve({ approved: true });
      }

      if (pending) {
        return Promise.resolve({
          approved: false,
          reason: "another approval is pending",
        });
      }

      const pendingRequest: PendingWebApproval = {
        runtimeId: request.runtimeId,
        task: request.task,
        step: request.step,
        toolCall: request.toolCall,
      };
      options.onPendingChange(pendingRequest);

      return new Promise<WebApprovalDecision>((resolve) => {
        pending = {
          request: pendingRequest,
          resolve,
        };
      });
    },

    approvePending(rememberToolName?: boolean): boolean {
      if (!pending) {
        return false;
      }

      if (rememberToolName) {
        autoApprovedToolNames.add(pending.request.toolCall.name);
      }

      pending.resolve({ approved: true });
      pending = null;
      options.onPendingChange(null);
      return true;
    },

    rejectPending(reason?: string): boolean {
      if (!pending) {
        return false;
      }

      const trimmedReason = reason?.trim();
      pending.resolve(
        trimmedReason
          ? { approved: false, reason: trimmedReason }
          : { approved: false },
      );
      pending = null;
      options.onPendingChange(null);
      return true;
    },

    resetRun(): void {
      autoApprovedToolNames.clear();
      if (pending) {
        pending.resolve({
          approved: false,
          reason: "run reset",
        });
        pending = null;
      }
      options.onPendingChange(null);
    },
  };
}