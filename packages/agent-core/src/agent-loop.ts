import type { AgentInput, AgentOutput } from "./contracts.js";

export async function runAgentLoop(input: AgentInput): Promise<AgentOutput> {
  return {
    message: `TODO: implement loop for instruction: ${input.instruction}`,
  };
}
