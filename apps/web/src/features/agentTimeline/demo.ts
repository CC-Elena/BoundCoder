import { runAgentLoop } from "@boundcoder/agent-core";
import type { AgentEvent, ToolCall, ToolResult } from "@boundcoder/shared";

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

export function createDemoRun(task: string, onEvent: (event: AgentEvent) => void) {
  return runAgentLoop(
    {
      task,
      maxSteps: 5,
      onEvent,
    },
    {
      toolRegistry: createDemoToolRegistry(),
    },
  );
}