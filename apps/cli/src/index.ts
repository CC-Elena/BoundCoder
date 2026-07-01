import { runAgentLoop } from "@boundcoder/agent-core";

console.log("BoundCoder CLI booted.");
void runAgentLoop; // agent-core resolved — import chain: cli → agent-core → shared
console.log("Agent Core loaded.");
