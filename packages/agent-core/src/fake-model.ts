import type { AgentMessage, ToolCall, ToolResult } from "@boundcoder/shared";

const FAKE_TOOL_NAME = "fake_tool";
const READ_FILE_TOOL_NAME = "read_file";
const LIST_FILES_TOOL_NAME = "list_files";
const SEARCH_CODE_TOOL_NAME = "search_code";
const APPLY_PATCH_TOOL_NAME = "apply_patch";
const FAKE_TOOL_CALL_ID = "call-1";
const READ_TASK_PREFIX = "read:";
const LIST_TASK_PREFIX = "list:";
const SEARCH_TASK_PREFIX = "search:";
const APPLY_PATCH_TASK_PREFIX = "patch:";

function parsePatchTask(task: string): { path: string; patch: string } {
  // 约定格式：patch:<path>|<intent>
  // 例：patch:src/counter.ts|add bounds check before decrement
  const body = task.slice(APPLY_PATCH_TASK_PREFIX.length).trim();
  const separatorIndex = body.indexOf("|");

  if (separatorIndex === -1) {
    return {
      path: "",
      patch: body,
    };
  }

  const requestedPath = body.slice(0, separatorIndex).trim();
  const patch = body.slice(separatorIndex + 1).trim();

  return {
    path: requestedPath,
    patch,
  };
}

/**
 * 构造工具调用对象。
 * 根据受控任务前缀构造工具调用。
 */
function buildToolCall(task: string): ToolCall {
  return {
    id: FAKE_TOOL_CALL_ID,
    name: FAKE_TOOL_NAME,
    parameters: {
      task,
    },
  };
}

function buildReadFileToolCall(filePath: string): ToolCall {
  return {
    id: FAKE_TOOL_CALL_ID,
    name: READ_FILE_TOOL_NAME,
    parameters: {
      path: filePath,
    },
  };
}

function buildApplyPatchToolCall(task: string): ToolCall {
  const parsedPatchTask = parsePatchTask(task);
  return {
    id: FAKE_TOOL_CALL_ID,
    name: APPLY_PATCH_TOOL_NAME,
    parameters: {
      path: parsedPatchTask.path,
      patch: parsedPatchTask.patch,
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

function buildToolCallForTask(task: string): ToolCall {
  if (task.startsWith(READ_TASK_PREFIX)) {
    const requestedPath = task.slice(READ_TASK_PREFIX.length).trim();
    return {
      id: FAKE_TOOL_CALL_ID,
      name: READ_FILE_TOOL_NAME,
      parameters: {
        path: requestedPath,
      },
    };
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
    const query = task.slice(SEARCH_TASK_PREFIX.length).trim();
    return {
      id: FAKE_TOOL_CALL_ID,
      name: SEARCH_CODE_TOOL_NAME,
      parameters: {
        query,
      },
    };
  }

  if (task.startsWith(APPLY_PATCH_TASK_PREFIX)) {
    return buildApplyPatchToolCall(task);
  }

  return buildToolCall(task);
}

/**
 * 从消息历史中倒序查找最近一次工具执行结果。
 * 倒序的原因是我们只关心“最新状态”，它决定模型下一步是继续调工具还是直接回答。
 */
function findLatestToolResult(messages: AgentMessage[]): ToolResult | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (!msg) {
      continue;
    }
    if (msg.kind === "tool_result" && msg.toolResult) {
      return msg.toolResult;
    }
  }
  return null;
}

interface ToolExecution {
  call: ToolCall;
  result: ToolResult;
}

type TaskKind = "search" | "patch" | "other";

type NextAction =
  | { kind: "call_tool"; toolCall: ToolCall }
  | { kind: "final"; content: string };

function findLatestToolCall(messages: AgentMessage[]): ToolCall | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (!msg) {
      continue;
    }
    if (msg.kind === "tool_call" && msg.toolCall) {
      return msg.toolCall;
    }
  }
  return null;
}

function findToolCallById(messages: AgentMessage[], toolCallId: string): ToolCall | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (!msg) {
      continue;
    }
    if (msg.kind !== "tool_call" || !msg.toolCall) {
      continue;
    }
    if (msg.toolCall.id === toolCallId) {
      return msg.toolCall;
    }
  }
  return null;
}

function findLatestToolExecution(messages: AgentMessage[]): ToolExecution | null {
  const latestToolResult = findLatestToolResult(messages);
  if (!latestToolResult) {
    return null;
  }

  const latestToolCall = findToolCallById(messages, latestToolResult.toolCallId)
    ?? findLatestToolCall(messages);
  if (!latestToolCall) {
    return null;
  }

  return {
    call: latestToolCall,
    result: latestToolResult,
  };
}

function detectTaskKind(task: string): TaskKind {
  if (task.startsWith(SEARCH_TASK_PREFIX)) {
    return "search";
  }
  if (task.startsWith(APPLY_PATCH_TASK_PREFIX)) {
    return "patch";
  }
  return "other";
}

function toFinalAnswer(result: ToolResult): NextAction {
  if (!result.ok) {
    return {
      kind: "final",
      content: `工具执行失败：${result.errorMessage ?? "unknown error"}`,
    };
  }

  return {
    kind: "final",
    content: `已处理任务：${result.output}`,
  };
}

// 决策核心：
// 把“任务类型 + 最近一步执行”映射成下一步动作，
// 让 fakeModel 从 if-else 片段演进到可扩展的状态机雏形。
function decideNextAction(task: string, latestExecution: ToolExecution | null): NextAction {
  if (!latestExecution) {
    return {
      kind: "call_tool",
      toolCall: buildToolCallForTask(task),
    };
  }

  const { call, result } = latestExecution;

  // 失败分支统一收口：最近一步失败就直接收尾。
  if (!result.ok) {
    return toFinalAnswer(result);
  }

  const taskKind = detectTaskKind(task);
  if (taskKind === "search") {
    if (call.name === SEARCH_CODE_TOOL_NAME) {
      const firstMatchedPath = extractFirstMatchedPath(result.output);
      if (!firstMatchedPath) {
        return {
          kind: "final",
          content: "已处理任务：",
        };
      }

      return {
        kind: "call_tool",
        toolCall: buildReadFileToolCall(firstMatchedPath),
      };
    }

    if (call.name === READ_FILE_TOOL_NAME) {
      return {
        kind: "call_tool",
        toolCall: buildSearchPatchToolCall(task, call),
      };
    }

    if (call.name === APPLY_PATCH_TOOL_NAME) {
      return toFinalAnswer(result);
    }
  }

  return toFinalAnswer(result);
}

/**
 * fakeModel 的职责：
 * - 输入：完整消息历史
 * - 输出：一条 assistant 消息（要么是 tool_call，要么是 final text）
 *
 * 设计意图：
 * 1) 让 runAgentLoop 能稳定测试“模型 -> 工具 -> 模型”这条主链路
 * 2) 不依赖真实 LLM，避免引入外部不确定性
 */
export function fakeModel(messages: AgentMessage[]): AgentMessage {
  const latestExecution = findLatestToolExecution(messages);
  const userTask = messages.find((m) => m.role === "user" && m.kind === "text");
  const task = userTask?.content ?? "";
  const action = decideNextAction(task, latestExecution);

  if (action.kind === "call_tool") {
    return {
      role: "assistant",
      kind: "tool_call",
      content: `Calling ${action.toolCall.name}`,
      toolCall: action.toolCall,
    };
  }

  return {
    role: "assistant",
    kind: "text",
    content: action.content,
  };
}
