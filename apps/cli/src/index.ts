import { runAgentLoop } from "@boundcoder/agent-core";
import { createDefaultToolRegistry } from "@boundcoder/tools";
import type { CommandRunner, ToolRegistry } from "@boundcoder/tools";
import type { AgentEvent } from "@boundcoder/shared";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cliSourceDir = path.dirname(fileURLToPath(import.meta.url));
const repoRootDir = path.resolve(cliSourceDir, "../../..");
const sandboxRootDir = path.join(repoRootDir, "apps/sandbox-repo");

const fakeRunner: CommandRunner = (command, cwd) => ({
  ok: true,
  output: `[fake-runner] command=${command} cwd=${cwd} stdout=test passed`,
});

function logCliEvent(event: AgentEvent): void {
  switch (event.type) {
    case "run_start":
      console.log("🚀", event.task);
      break;
    case "assistant_message":
      if (event.message.kind === "tool_call" && event.message.toolCall) {
        console.log("🔧", event.message.toolCall.name);
      }
      break;
    case "tool_result":
      console.log("📦", event.toolResult.output);
      break;
    case "run_end":
      console.log("✅", event.finalAnswer ?? "(none)");
      break;
  }
}

const toolRegistry = createDefaultToolRegistry(
  sandboxRootDir,
  {
    runCommandOptions: {
      commandRunner: fakeRunner,
    },
  },
);

type Check = {
  name: string;
  run: () => Promise<{ ok: boolean; detail: string }>;
};

function executeTool(
  registry: ToolRegistry,
  id: string,
  name: string,
  parameters: Record<string, unknown>,
) {
  return registry.execute({
    id,
    name,
    parameters,
  });
}

async function runChecks(checks: Check[]) {
  let passed = 0;

  console.log("[cli] Capability Verification Start");
  for (const check of checks) {
    const result = await check.run();
    if (result.ok) {
      passed += 1;
      console.log(`[PASS] ${check.name}: ${result.detail}`);
    } else {
      console.log(`[FAIL] ${check.name}: ${result.detail}`);
    }
  }

  const failed = checks.length - passed;
  console.log(`[summary] passed=${passed} failed=${failed} total=${checks.length}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

const checks: Check[] = [
  {
    name: "read_file",
    run: async () => {
      const result = executeTool(toolRegistry, "call-read-1", "read_file", {
        path: "src/counter.ts",
      });
      const hasSignature = result.ok && result.output.includes("createCounter");
      return {
        ok: hasSignature,
        detail: hasSignature ? "read src/counter.ts and found createCounter" : (result.errorMessage ?? "unexpected read_file output"),
      };
    },
  },
  {
    name: "list_files",
    run: async () => {
      const result = executeTool(toolRegistry, "call-list-1", "list_files", {
        path: "src",
      });
      const hasCounter = result.ok && result.output.split("\n").some((line) => line.trim() === "src/counter.ts");
      return {
        ok: hasCounter,
        detail: hasCounter ? "listed src/counter.ts" : (result.errorMessage ?? "counter.ts not found in list_files output"),
      };
    },
  },
  {
    name: "search_code",
    run: async () => {
      const result = executeTool(toolRegistry, "call-search-1", "search_code", {
        query: "createCounter",
      });
      const hit = result.ok && result.output.includes("src/counter.ts");
      return {
        ok: hit,
        detail: hit ? "found createCounter in src/counter.ts" : (result.errorMessage ?? "search hit missing"),
      };
    },
  },
  {
    name: "apply_patch(dry-run)",
    run: async () => {
      const result = executeTool(toolRegistry, "call-patch-1", "apply_patch", {
        path: "src/counter.ts",
        patch: "add guard before decrement",
      });
      const dryRun = result.ok && result.output.includes("dry-run apply_patch");
      return {
        ok: dryRun,
        detail: dryRun ? "dry-run output generated" : (result.errorMessage ?? "dry-run output missing"),
      };
    },
  },
  {
    name: "run_command(test)",
    run: async () => {
      const result = executeTool(toolRegistry, "call-run-test-1", "run_command", {
        name: "test",
      });
      const ok = result.ok && result.output.includes("command=npm test");
      return {
        ok,
        detail: ok ? result.output : (result.errorMessage ?? "run_command(test) failed"),
      };
    },
  },
  {
    name: "run_command(lint)",
    run: async () => {
      const result = executeTool(toolRegistry, "call-run-lint-1", "run_command", {
        name: "lint",
      });
      const ok = result.ok && result.output.includes("command=npm run lint");
      return {
        ok,
        detail: ok ? result.output : (result.errorMessage ?? "run_command(lint) failed"),
      };
    },
  },
  {
    name: "run_command(reject unknown)",
    run: async () => {
      const result = executeTool(toolRegistry, "call-run-build-1", "run_command", {
        name: "build",
      });
      const rejected = !result.ok && result.errorMessage === "command not allowed: build";
      return {
        ok: rejected,
        detail: rejected ? "unknown command rejected as expected" : "unknown command was not rejected",
      };
    },
  },
  {
    name: "runAgentLoop(search -> patch -> verify)",
    run: async () => {
      const result = await runAgentLoop({
        task: "search: createCounter",
        maxSteps: 5,
        onEvent: (event) => {
          logCliEvent(event);
        },
      }, {
        toolRegistry,
      });

      const finalOk = result.stopReason === "final_answer"
        && typeof result.finalAnswer === "string"
        && result.finalAnswer.includes("command=npm test");

      return {
        ok: finalOk,
        detail: finalOk
          ? (result.finalAnswer ?? "")
          : `stopReason=${result.stopReason} final=${result.finalAnswer ?? "(none)"}`,
      };
    },
  },
];

void runChecks(checks);