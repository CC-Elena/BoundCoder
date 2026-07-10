import type {
  ApprovalDecision,
  ApprovalHandler,
  ApprovalRequest,
} from "@boundcoder/agent-core";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

const YES_ANSWERS = new Set(["y", "yes"]);
const NO_ANSWERS = new Set(["n", "no"]);
const YES_AND_REMEMBER_ANSWERS = new Set(["ya", "yes-all", "yes_this_run"]);

const autoApproveToolNamesByRuntime = new Map<string, Set<string>>();

function getAutoApproveToolNames(runtimeId: string): Set<string> {
  let toolNames = autoApproveToolNamesByRuntime.get(runtimeId);
  if (!toolNames) {
    toolNames = new Set<string>();
    autoApproveToolNamesByRuntime.set(runtimeId, toolNames);
  }
  return toolNames;
}

function formatToolCall(request: ApprovalRequest): string {
  const prettyParams = JSON.stringify(request.toolCall.parameters, null, 2);
  return [
    `runtimeId: ${request.runtimeId}`,
    `step: ${request.step}`,
    `tool: ${request.toolCall.name}`,
    `toolCallId: ${request.toolCall.id}`,
    `parameters: ${prettyParams}`,
  ].join("\n");
}

async function askApprovalDecision(request: ApprovalRequest): Promise<ApprovalDecision> {
  const rl = createInterface({
    input: stdin,
    output: stdout,
  });

  try {
    stdout.write(`\n[approval] Request\n${formatToolCall(request)}\n`);
    stdout.write("[approval] Input: y(approve once) | ya(approve and remember same tool in this run) | n(reject)\n");

    while (true) {
      const answer = (await rl.question("[approval] Approve this tool call? (y/ya/n): "))
        .trim()
        .toLowerCase();

      if (YES_AND_REMEMBER_ANSWERS.has(answer)) {
        const rememberedTools = getAutoApproveToolNames(request.runtimeId);
        rememberedTools.add(request.toolCall.name);
        stdout.write(
          `[approval] Remembered tool \"${request.toolCall.name}\" for runtime ${request.runtimeId}.\n`,
        );
        return { approved: true };
      }

      if (YES_ANSWERS.has(answer)) {
        return { approved: true };
      }

      if (NO_ANSWERS.has(answer)) {
        const reason = (await rl.question("[approval] Reason (optional): ")).trim();
        return reason === ""
          ? { approved: false }
          : { approved: false, reason };
      }

      stdout.write("[approval] Please answer y/yes, ya/yes-all, or n/no.\n");
    }
  } finally {
    rl.close();
  }
}

export const InteractiveCliApprovalHandler: ApprovalHandler = {
  async requestApproval(request: ApprovalRequest): Promise<ApprovalDecision> {
    const rememberedTools = getAutoApproveToolNames(request.runtimeId);
    if (rememberedTools.has(request.toolCall.name)) {
      stdout.write(`[approval] Auto-approved ${request.toolCall.name} (remembered for this run).\n`);
      return { approved: true };
    }

    // In non-interactive environments, default to approve to avoid hanging scripts.
    if (!stdin.isTTY || !stdout.isTTY) {
      return { approved: true };
    }

    return askApprovalDecision(request);
  },
};