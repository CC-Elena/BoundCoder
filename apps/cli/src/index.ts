import { runAgentLoop } from "@boundcoder/agent-core";
import { createDefaultToolRegistry } from "@boundcoder/tools";
import path from "node:path";

const task = "What project am I working on?";
const toolRegistry = createDefaultToolRegistry(
  path.resolve(process.cwd(), "apps/sandbox-repo"),
);

console.log(`[agent] Task received: ${task}`);

const result = runAgentLoop({
  task,
  maxSteps: 3,
}, {
  toolRegistry,
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