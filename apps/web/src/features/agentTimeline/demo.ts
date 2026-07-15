import type { AgentEvent, AgentMessage, AgentStopReason, ToolCall, ToolResult } from "@boundcoder/shared";
import type { RuntimeHook } from "@boundcoder/agent-core";
import type { WebApprovalHandler } from "./web-approval";

const COUNTER_SOURCE = `export function createCounter(initial = 0) {
  let count = initial;
  return {
    increment() {
      count += 1;
    },
    decrement() {
      count -= 1;
    },
    reset() {
      count = 0;
    },
    value() {
      return count;
    },
  };
}`;

interface DemoToolRegistry {
  execute: (call: ToolCall) => ToolResult;
}

interface DemoRunResult {
  stopReason: AgentStopReason;
  finalAnswer: string | null;
}

interface DemoRunOptions {
  approvalHandler?: WebApprovalHandler;
  runtimeHook?: RuntimeHook;
}

const FAKE_TOOL_NAME = "fake_tool";
const READ_FILE_TOOL_NAME = "read_file";
const LIST_FILES_TOOL_NAME = "list_files";
const SEARCH_CODE_TOOL_NAME = "search_code";
const APPLY_PATCH_TOOL_NAME = "apply_patch";
const RUN_COMMAND_TOOL_NAME = "run_command";
const DEFAULT_VERIFICATION_NAME = "test";
const FAKE_TOOL_CALL_ID = "call-1";
const READ_TASK_PREFIX = "read:";
const LIST_TASK_PREFIX = "list:";
const SEARCH_TASK_PREFIX = "search:";
const APPLY_PATCH_TASK_PREFIX = "patch:";

function buildToolCall(task: string): ToolCall {
  return {
    id: FAKE_TOOL_CALL_ID,
    name: FAKE_TOOL_NAME,
    parameters: { task },
  };
}

function buildReadFileToolCall(filePath: string): ToolCall {
  return {
    id: FAKE_TOOL_CALL_ID,
    name: READ_FILE_TOOL_NAME,
    parameters: { path: filePath },
  };
}

function buildApplyPatchToolCall(task: string): ToolCall {
  const body = task.slice(APPLY_PATCH_TASK_PREFIX.length).trim();
  const separatorIndex = body.indexOf("|");
  const pathValue = separatorIndex === -1 ? "" : body.slice(0, separatorIndex).trim();
  const patchValue = separatorIndex === -1 ? body : body.slice(separatorIndex + 1).trim();

  return {
    id: FAKE_TOOL_CALL_ID,
    name: APPLY_PATCH_TOOL_NAME,
    parameters: {
      path: pathValue,
      patch: patchValue,
    },
  };
}

function buildSearchPatchToolCall(task: string, readCall: ToolCall): ToolCall {
  const patchIntent = `review and patch based on: ${task.slice(SEARCH_TASK_PREFIX.length).trim()}`;
  const pathParam = readCall.parameters.path;
  const patchPath = typeof pathParam === "string" ? pathParam : "";

  return {
    id: FAKE_TOOL_CALL_ID,
    name: APPLY_PATCH_TOOL_NAME,
    parameters: {
      path: patchPath,
      patch: patchIntent,
    },
  };
}

function buildRunCommandToolCall(name: string): ToolCall {
  return {
    id: FAKE_TOOL_CALL_ID,
    name: RUN_COMMAND_TOOL_NAME,
    parameters: { name },
  };
}

function extractFirstMatchedPath(searchOutput: string): string | null {
  const lines = searchOutput.split(/\r?\n/);
  for (const line of lines) {
    if (!line || line === "...TRUNCATED...") {
      continue;
    }

    const matched = line.match(/^([^:]+):\d+:/);
    if (!matched) {
      continue;
    }

    return matched[1] ?? null;
  }

  return null;
}

export function createDemoToolRegistry(): DemoToolRegistry {
  const fileMap: Record<string, string> = {
    "src/counter.ts": COUNTER_SOURCE,
  };

  return {
    execute(call: ToolCall): ToolResult {
      switch (call.name) {
        case "search_code": {
          return {
            toolCallId: call.id,
            ok: true,
            output: "src/counter.ts:1:export function createCounter(initial = 0) {",
          };
        }
        case "read_file": {
          const filePath = typeof call.parameters.path === "string" ? call.parameters.path : "";
          const content = fileMap[filePath];
          if (!content) {
            return {
              toolCallId: call.id,
              ok: false,
              output: "",
              errorMessage: `file not found: ${filePath}`,
            };
          }
          return {
            toolCallId: call.id,
            ok: true,
            output: content,
          };
        }
        case "apply_patch": {
          const pathValue = typeof call.parameters.path === "string" ? call.parameters.path : "src/counter.ts";
          const patchValue = typeof call.parameters.patch === "string" ? call.parameters.patch : "";
          return {
            toolCallId: call.id,
            ok: true,
            output: `dry-run apply_patch: ${pathValue} — intent: "${patchValue}" (hash demo-hash)`,
          };
        }
        case "run_command": {
          const commandName = typeof call.parameters.name === "string" ? call.parameters.name : "unknown";
          if (commandName === "test") {
            return {
              toolCallId: call.id,
              ok: true,
              output: "[demo-runner] npm test passed",
            };
          }
          if (commandName === "lint") {
            return {
              toolCallId: call.id,
              ok: true,
              output: "[demo-runner] npm run lint passed",
            };
          }
          return {
            toolCallId: call.id,
            ok: false,
            output: "",
            errorMessage: `command not allowed: ${commandName}`,
          };
        }
        default: {
          return {
            toolCallId: call.id,
            ok: false,
            output: "",
            errorMessage: `unsupported tool: ${call.name}`,
          };
        }
      }
    },
  };
}

function findLatestToolResult(messages: AgentMessage[]): ToolResult | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.kind === "tool_result" && message.toolResult) {
      return message.toolResult;
    }
  }
  return null;
}

function findLatestToolCall(messages: AgentMessage[]): ToolCall | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.kind === "tool_call" && message.toolCall) {
      return message.toolCall;
    }
  }
  return null;
}

function findLatestToolExecution(messages: AgentMessage[]): { call: ToolCall; result: ToolResult } | null {
  const latestResult = findLatestToolResult(messages);
  if (!latestResult) {
    return null;
  }

  const latestCall = findLatestToolCall(messages) ?? null;
  if (!latestCall) {
    return null;
  }

  return { call: latestCall, result: latestResult };
}

function decideNextToolCall(task: string, latestExecution: { call: ToolCall; result: ToolResult } | null): ToolCall | null {
  if (!latestExecution) {
    if (task.startsWith(READ_TASK_PREFIX)) {
      return buildReadFileToolCall(task.slice(READ_TASK_PREFIX.length).trim());
    }

    if (task.startsWith(LIST_TASK_PREFIX)) {
      const requestedPath = task.slice(LIST_TASK_PREFIX.length).trim();
      return {
        id: FAKE_TOOL_CALL_ID,
        name: LIST_FILES_TOOL_NAME,
        parameters: requestedPath ? { path: requestedPath } : {},
      };
    }

    if (task.startsWith(SEARCH_TASK_PREFIX)) {
      return {
        id: FAKE_TOOL_CALL_ID,
        name: SEARCH_CODE_TOOL_NAME,
        parameters: { query: task.slice(SEARCH_TASK_PREFIX.length).trim() },
      };
    }

    if (task.startsWith(APPLY_PATCH_TASK_PREFIX)) {
      return buildApplyPatchToolCall(task);
    }

    return buildToolCall(task);
  }

  const { call, result } = latestExecution;
  if (!result.ok) {
    return null;
  }

  if (task.startsWith(SEARCH_TASK_PREFIX)) {
    if (call.name === SEARCH_CODE_TOOL_NAME) {
      const firstMatchedPath = extractFirstMatchedPath(result.output);
      return firstMatchedPath ? buildReadFileToolCall(firstMatchedPath) : null;
    }

    if (call.name === READ_FILE_TOOL_NAME) {
      return buildSearchPatchToolCall(task, call);
    }

    if (call.name === APPLY_PATCH_TOOL_NAME) {
      return buildRunCommandToolCall(DEFAULT_VERIFICATION_NAME);
    }

    return null;
  }

  return null;
}

function toFinalAnswer(result: ToolResult): string {
  return result.ok
    ? `已处理任务：${result.output}`
    : `工具执行失败：${result.errorMessage ?? "unknown error"}`;
}

function createRuntimeId(): string {
  return `web-runtime-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createApprovalRejectedToolResult(call: ToolCall, reason?: string): ToolResult {
  const normalizedReason = reason?.trim();
  return {
    toolCallId: call.id,
    ok: false,
    output: "",
    errorMessage: normalizedReason
      ? `approval rejected: ${normalizedReason}`
      : "approval rejected",
  };
}

export async function createDemoRun(
  task: string,
  onEvent: (event: AgentEvent) => void,
  options: DemoRunOptions = {},
): Promise<DemoRunResult> {
  const toolRegistry = createDemoToolRegistry();
  const messages: AgentMessage[] = [];
  const runtimeId = createRuntimeId();

  onEvent({ type: "run_start", task, timestamp: Date.now() });

  let latestExecution: { call: ToolCall; result: ToolResult } | null = null;
  let step = 1;

  while (step <= 5) {
    const nextToolCall = decideNextToolCall(task, latestExecution);
    if (!nextToolCall) {
      const finalMessage = latestExecution ? toFinalAnswer(latestExecution.result) : "已处理任务：";
      onEvent({
        type: "assistant_message",
        step,
        message: {
          role: "assistant",
          kind: "text",
          content: finalMessage,
        },
        timestamp: Date.now(),
      });
      onEvent({
        type: "run_end",
        stopReason: latestExecution && latestExecution.result.ok ? "final_answer" : "model_no_final",
        finalAnswer: finalMessage,
        timestamp: Date.now(),
      });
      return {
        stopReason: latestExecution && latestExecution.result.ok ? "final_answer" : "model_no_final",
        finalAnswer: finalMessage,
      };
    }

    onEvent({
      type: "assistant_message",
      step,
      message: {
        role: "assistant",
        kind: "tool_call",
        content: `Calling ${nextToolCall.name}`,
        toolCall: nextToolCall,
      },
      timestamp: Date.now(),
    });
    messages.push({
      role: "assistant",
      kind: "tool_call",
      content: `Calling ${nextToolCall.name}`,
      toolCall: nextToolCall,
    });

    if (options.runtimeHook?.onToolCall) {
      try {
        const payload = structuredClone({
          runtime: {
            runtimeId,
            task,
            step,
            messages,
          },
          toolCall: nextToolCall,
        });

        await options.runtimeHook.onToolCall(payload);
      } catch (error) {
        console.error("[runtime-hook] onToolCall failed", error);
      }
    }

    let toolResult: ToolResult;
    if (options.approvalHandler) {
      onEvent({
        type: "approval_requested",
        step,
        toolCall: nextToolCall,
        timestamp: Date.now(),
      });

      const decision = await options.approvalHandler.requestApproval({
        runtimeId,
        task,
        step,
        toolCall: nextToolCall,
      });

      onEvent({
        type: "approval_resolved",
        step,
        toolCall: nextToolCall,
        approved: decision.approved,
        reason: decision.approved ? undefined : decision.reason,
        timestamp: Date.now(),
      });

      toolResult = decision.approved
        ? toolRegistry.execute(nextToolCall)
        : createApprovalRejectedToolResult(nextToolCall, decision.reason);
    } else {
      toolResult = toolRegistry.execute(nextToolCall);
    }

    messages.push({
      role: "tool",
      kind: "tool_result",
      content: toolResult.ok ? toolResult.output : toolResult.errorMessage ?? "tool failed",
      toolResult,
    });

    if (options.runtimeHook?.onToolResult) {
      try {
        const payload = structuredClone({
          runtime: {
            runtimeId,
            task,
            step,
            messages,
          },
          toolCall: nextToolCall,
          toolResult,
        });

        await options.runtimeHook.onToolResult(payload);
      } catch (error) {
        console.error("[runtime-hook] onToolResult failed", error);
      }
    }

    onEvent({
      type: "tool_result",
      step,
      toolResult,
      timestamp: Date.now(),
    });

    latestExecution = { call: nextToolCall, result: toolResult };
    step += 1;

    if (nextToolCall.name === RUN_COMMAND_TOOL_NAME || !toolResult.ok) {
      break;
    }
  }

  const finalResult = latestExecution?.result ?? {
    toolCallId: FAKE_TOOL_CALL_ID,
    ok: false,
    output: "",
    errorMessage: "unknown error",
  };
  const finalAnswer = toFinalAnswer(finalResult);

  onEvent({
    type: "assistant_message",
    step,
    message: {
      role: "assistant",
      kind: "text",
      content: finalAnswer,
    },
    timestamp: Date.now(),
  });
  onEvent({
    type: "run_end",
    stopReason: finalResult.ok ? "final_answer" : "invalid_tool_call",
    finalAnswer,
    timestamp: Date.now(),
  });

  return {
    stopReason: finalResult.ok ? "final_answer" : "invalid_tool_call",
    finalAnswer,
  };
}
