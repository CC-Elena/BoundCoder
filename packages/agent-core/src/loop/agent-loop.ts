import type {
	AgentMessage,
	AgentEvent,
	AgentRunOptions,
	AgentRunResult,
	ToolResult,
} from "@boundcoder/shared";
import { fakeModel } from "../model/fake-model.js";
import { createApprovalRejectedToolResult } from "../runtime/approval/index.js";
import {
	type AgentLoopDependencies,
} from "../runtime/contracts.js";

const DEFAULT_MAX_STEPS = 5;

function createRuntimeId(): string {
	return `runtime-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function yieldToEventLoop(): Promise<void> {
	return new Promise((resolve) => {
		setImmediate(resolve);
	});
}

function emitEvent(
	onEvent: AgentRunOptions["onEvent"],
	event: AgentEvent,
): void {
	onEvent?.(event);
}

export async function runAgentLoop(
	options: AgentRunOptions,
	dependencies: AgentLoopDependencies = {},
): Promise<AgentRunResult> {
	const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;

	const model = dependencies.model ?? fakeModel;
	const toolRegistry = dependencies.toolRegistry;
	const approvalHandler = dependencies.approvalHandler;
	const runtimeId = createRuntimeId();
	if (!toolRegistry) {
		throw new Error("toolRegistry is required");
	}

	const messages: AgentMessage[] = [
		{
			role: "user",
			kind: "text",
			content: options.task,
		},
	];

	emitEvent(options.onEvent, {
		type: "run_start",
		task: options.task,
		timestamp: Date.now(),
	});

	await yieldToEventLoop();

	for (let loopCount = 0; loopCount < maxSteps; loopCount++) {
		const modelResponse = model(messages);
		messages.push(modelResponse);

		emitEvent(options.onEvent, {
			type: "assistant_message",
			step: loopCount + 1,
			message: modelResponse,
			timestamp: Date.now(),
		});

		await yieldToEventLoop();

		if (modelResponse.kind === "text") {
			emitEvent(options.onEvent, {
				type: "run_end",
				stopReason: "final_answer",
				finalAnswer: modelResponse.content,
				timestamp: Date.now(),
			});

			await yieldToEventLoop();

			return {
				finalAnswer: modelResponse.content,
				messages,
				stopReason: "final_answer",
			};
				} else if (modelResponse.kind === "tool_call" && modelResponse.toolCall) {
					let toolResult: ToolResult;

					if (approvalHandler) {
						emitEvent(options.onEvent, {
							type: "approval_requested",
							step: loopCount + 1,
							toolCall: modelResponse.toolCall,
							timestamp: Date.now(),
						});

						await yieldToEventLoop();

						const decision = await approvalHandler.requestApproval({
							runtimeId,
							task: options.task,
							step: loopCount + 1,
							messages: [...messages],
							toolCall: modelResponse.toolCall,
						});

						emitEvent(options.onEvent, {
							type: "approval_resolved",
							step: loopCount + 1,
							toolCall: modelResponse.toolCall,
							approved: decision.approved,
							reason: decision.approved ? undefined : decision.reason,
							timestamp: Date.now(),
						});

						await yieldToEventLoop();

						toolResult = decision.approved
							? toolRegistry.execute(modelResponse.toolCall)
							: createApprovalRejectedToolResult(modelResponse.toolCall, decision);
					} else {
						toolResult = toolRegistry.execute(modelResponse.toolCall);
					}

			messages.push({
				role: "tool",
				kind: "tool_result",
				content: toolResult.ok
					? toolResult.output
					: toolResult.errorMessage ?? "tool failed",
				toolResult,
			});

			emitEvent(options.onEvent, {
				type: "tool_result",
				step: loopCount + 1,
				toolResult,
				timestamp: Date.now(),
			});

			await yieldToEventLoop();

			continue;
		} else {
			emitEvent(options.onEvent, {
				type: "run_end",
				stopReason: "invalid_tool_call",
				finalAnswer: null,
				timestamp: Date.now(),
			});

			await yieldToEventLoop();

			return {
				finalAnswer: null,
				messages,
				stopReason: "invalid_tool_call",
			};
		}
	}

	emitEvent(options.onEvent, {
		type: "run_end",
		stopReason: "model_no_final",
		finalAnswer: null,
		timestamp: Date.now(),
	});

	await yieldToEventLoop();

	return {
		finalAnswer: null,
		messages,
		stopReason: "model_no_final",
	};
}