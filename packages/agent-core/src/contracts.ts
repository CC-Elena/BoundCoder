import type { AgentMessage } from "@boundcoder/shared";
import type { ToolRegistry } from "@boundcoder/tools";

export type AgentModel = (messages: AgentMessage[]) => AgentMessage;

export interface AgentLoopDependencies {
  model?: AgentModel;
  toolRegistry?: ToolRegistry;
}