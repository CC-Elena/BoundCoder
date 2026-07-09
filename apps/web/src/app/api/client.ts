import { agentRunRequestSchema, agentRunResponseSchema, type AgentRunRequest, type AgentRunResponse } from "./protocol";

const API_BASE_URL = "/api";

async function readJsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return response.text();
  }
  return response.json();
}

export async function postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(typeof payload === "string" ? payload : `request failed with status ${response.status}`);
  }

  return payload as TResponse;
}

export async function requestAgentRun(input: AgentRunRequest): Promise<AgentRunResponse> {
  const request = agentRunRequestSchema.parse(input);
  const response = await postJson<unknown>("/agent-runs", request);
  return agentRunResponseSchema.parse(response);
}