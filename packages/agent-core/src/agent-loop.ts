import type {
  AgentMessage,
  AgentRunOptions,
  AgentRunResult,
  ToolCall,
  ToolResult,
} from "@boundcoder/shared";
import { fakeModel } from "./fake-model.js";
import { executeFakeTool } from "@boundcoder/tools";

const DEFAULT_MAX_STEPS = 5;

export type AgentModel = (messages: AgentMessage[]) => AgentMessage;
export type ToolExecutor = (call: ToolCall) => ToolResult;

export interface AgentLoopDependencies {
  model?: AgentModel;
  executeTool?: ToolExecutor;
}

export function runAgentLoop(
  options: AgentRunOptions,
  dependencies: AgentLoopDependencies = {},
): AgentRunResult {
  const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;

  const model = dependencies.model ?? fakeModel;
  const executeTool = dependencies.executeTool ?? executeFakeTool;

  const messages: AgentMessage[] = [
    {
      role: "user", // 消息角色
      kind: "text", // 消息类型
      content: options.task, // 消息内容 [后面真实模型和真实 Tool Result 可能会有 JSON、结构化参数、附件、日志片段]
    },
  ]; // 初始化消息历史

  for (let loopCount = 0; loopCount < maxSteps; loopCount++) {
    const modelResponse = model(messages);
    messages.push(modelResponse);

    // 根据 modelResponse.kind 分支
    if (modelResponse.kind === "text") {
      return {
        finalAnswer: modelResponse.content,
        messages,
        stopReason: "final_answer",
      };
    } else if (modelResponse.kind === "tool_call" && modelResponse.toolCall) {
      const toolResult = executeTool(modelResponse.toolCall);
      messages.push({
        role: "tool",
        kind: "tool_result",
        content: toolResult.ok
          ? toolResult.output
          : toolResult.errorMessage ?? "tool failed",
        toolResult,
      });
      continue;
    } else {
      return {
        finalAnswer: null,
        messages,
        stopReason: "invalid_tool_call",
      };
    }
  }

  return {
    finalAnswer: null,
    messages,
    stopReason: "model_no_final",
  };
}
