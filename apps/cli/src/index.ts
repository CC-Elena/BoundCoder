import { runAgentLoop } from "@boundcoder/agent-core";

const task = "What project am I working on?";

console.log(`[agent] Task received: ${task}`);

const result = runAgentLoop({
  task,
  maxSteps: 3,
});

for (const message of result.messages) {
  if (message.role === "user") {
    continue;
  }

  if (message.kind === "tool_call" && message.toolCall) {
    console.log(
      `[model] tool_call: ${message.toolCall.name}`,
      message.toolCall.parameters,
    );
    continue;
  }

  if (message.kind === "tool_result" && message.toolResult) {
    const toolResult = message.toolResult;

    if (toolResult.ok) {
      console.log(`[tool] result: ${toolResult.output}`);
    } else {
      console.log(
        `[tool] failed: ${toolResult.errorMessage ?? "unknown error"}`,
      );
    }

    continue;
  }

  if (message.kind === "text") {
    console.log(`[model] final answer: ${message.content}`);
  }
}

console.log(`[agent] stop reason: ${result.stopReason}`);