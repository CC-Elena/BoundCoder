import { useMutation } from "@tanstack/react-query";

import type { AgentRunRequest, AgentRunResponse } from "./protocol";
import { requestAgentRun } from "./client";

export function useAgentRunMutation() {
  return useMutation<AgentRunResponse, Error, AgentRunRequest>({
    mutationKey: ["agent-run"],
    mutationFn: requestAgentRun,
  });
}