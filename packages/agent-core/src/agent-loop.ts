import type {
  AgentMessage,
  AgentEvent,
  AgentRunOptions,
  AgentRunResult,
} from "@boundcoder/shared";
import { fakeModel } from "./fake-model.js";
import type { AgentLoopDependencies } from "./contracts.js";

const DEFAULT_MAX_STEPS = 5;

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

function emitEvent(
  onEvent: AgentRunOptions["onEvent"],
  event: AgentEvent,
): void {
  onEvent?.(event);
}

export async function runAgentLoop(
  options: AgentRunOptions,
  dependencies: AgentLoopDependencies = {},
): Promise<AgentRunResult> {
  const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;

  const model = dependencies.model ?? fakeModel;
  const toolRegistry = dependencies.toolRegistry;
  if (!toolRegistry) {
    throw new Error("toolRegistry is required");
  }

  const messages: AgentMessage[] = [
    {
      role: "user", // 消息角色
      kind: "text", // 消息类型
      content: options.task, // 消息内容 [后面真实模型和真实 Tool Result 可能会有 JSON、结构化参数、附件、日志片段]
    },
  ]; // 初始化消息历史

  emitEvent(options.onEvent, {
    type: "run_start",
    task: options.task,
    timestamp: Date.now(),
  });

  await yieldToEventLoop();

  for (let loopCount = 0; loopCount < maxSteps; loopCount++) {
    const modelResponse = model(messages);
    messages.push(modelResponse);

    emitEvent(options.onEvent, {
      type: "assistant_message",
      step: loopCount + 1,
      message: modelResponse,
      timestamp: Date.now(),
    });

    await yieldToEventLoop();

    // 根据 modelResponse.kind 分支
    if (modelResponse.kind === "text") {
      emitEvent(options.onEvent, {
        type: "run_end",
        stopReason: "final_answer",
        finalAnswer: modelResponse.content,
        timestamp: Date.now(),
      });

      await yieldToEventLoop();

      return {
        finalAnswer: modelResponse.content,
        messages,
        stopReason: "final_answer",
      };
    } else if (modelResponse.kind === "tool_call" && modelResponse.toolCall) {
      const toolResult = toolRegistry.execute(modelResponse.toolCall);
      messages.push({
        role: "tool",
        kind: "tool_result",
        content: toolResult.ok
          ? toolResult.output
          : toolResult.errorMessage ?? "tool failed",
        toolResult,
      });

      emitEvent(options.onEvent, {
        type: "tool_result",
        step: loopCount + 1,
        toolResult,
        timestamp: Date.now(),
      });

      await yieldToEventLoop();

      continue;
    } else {
      emitEvent(options.onEvent, {
        type: "run_end",
        stopReason: "invalid_tool_call",
        finalAnswer: null,
        timestamp: Date.now(),
      });

      await yieldToEventLoop();

      return {
        finalAnswer: null,
        messages,
        stopReason: "invalid_tool_call",
      };
    }
  }

  emitEvent(options.onEvent, {
    type: "run_end",
    stopReason: "model_no_final",
    finalAnswer: null,
    timestamp: Date.now(),
  });

  await yieldToEventLoop();

  return {
    finalAnswer: null,
    messages,
    stopReason: "model_no_final",
  };
}
