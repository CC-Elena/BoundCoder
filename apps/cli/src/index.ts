import { runAgentLoop } from "@boundcoder/agent-core";
import { createDefaultToolRegistry } from "@boundcoder/tools";
import path from "node:path";
import { fileURLToPath } from "node:url";

// const task = "read:readme.md";
// const task = "list:";
const task = "search: createCounter";
const cliSourceDir = path.dirname(fileURLToPath(import.meta.url));
const repoRootDir = path.resolve(cliSourceDir, "../../..");
const toolRegistry = createDefaultToolRegistry(
  path.join(repoRootDir, "apps/sandbox-repo"),
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

}

console.log(`[model] final answer: ${result.finalAnswer ?? "(none)"}`);

console.log(`[agent] stop reason: ${result.stopReason}`);