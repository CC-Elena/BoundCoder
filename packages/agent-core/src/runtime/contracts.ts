import type { AgentMessage } from "@boundcoder/shared";
import type { ToolRegistry } from "@boundcoder/tools";
import type { ApprovalHandler } from "./approval/index.js";
import type { RuntimeHook } from "./lifecycle/index.js";

export type AgentModel = (messages: AgentMessage[]) => AgentMessage;

export interface AgentLoopDependencies {
  model?: AgentModel;
  toolRegistry?: ToolRegistry;
  approvalHandler?: ApprovalHandler;
  runtimeHook?: RuntimeHook;
}