import type { AgentMessage, ToolCall, ToolResult } from "@boundcoder/shared";

/**
 * 当前最小 Agent Loop 的约束：
 * 1) 只允许一个 fake 工具名
 * 2) 只做最多两轮模型行为：
 *    - 第一轮返回 tool_call
 *    - 第二轮在拿到 tool_result 后返回最终答案
 */
const FAKE_TOOL_NAME = "fake_tool";
const FAKE_TOOL_CALL_ID = "call-1";

/**
 * 构造工具调用对象。
 * 这里不接入真实 Tool Registry，只返回固定工具 + 最小参数。
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
  const latestToolResult = findLatestToolResult(messages);

  // 第一轮：消息中尚无 tool_result，说明工具还没执行过。
  // 此时返回 tool_call，让上层 loop 去执行 fake tool。
  if (!latestToolResult) {
    // 从历史里取第一条 user text 作为任务输入。
    // 最小版本只处理单任务场景，因此不做复杂多任务解析。
    const userTask = messages.find((m) => m.role === "user" && m.kind === "text");
    const task = userTask?.content ?? "";
    const toolCall = buildToolCall(task);

    return {
      role: "assistant",
      kind: "tool_call",
      content: `Calling ${toolCall.name}`,
      toolCall,
    };
  }

  // 第二轮：拿到工具结果后，直接汇总为最终回答。
  // 成功路径使用 output，失败路径带上 errorMessage。
  const answer = latestToolResult.ok
    ? `已处理任务：${latestToolResult.output}`
    : `工具执行失败：${latestToolResult.errorMessage ?? "unknown error"}`;

  return {
    role: "assistant",
    kind: "text",
    content: answer,
  };
}
