import type {
	AgentMessage,
	AgentEvent,
	AgentRunOptions,
	AgentRunResult,
	ToolResult,
} from "@boundcoder/shared";
import { fakeModel } from "../model/fake-model.js";
import { createApprovalRejectedToolResult } from "../runtime/approval/index.js";
import type { RuntimeEndOutcome } from "../runtime/lifecycle/index.js";
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

function normalizeErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export async function runAgentLoop(
	options: AgentRunOptions,
	dependencies: AgentLoopDependencies = {},
): Promise<AgentRunResult> {
	const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;

	const model = dependencies.model ?? fakeModel;
	const toolRegistry = dependencies.toolRegistry;
	const approvalHandler = dependencies.approvalHandler;
	const runtimeHook = dependencies.runtimeHook;
    
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
	let currentStep = 0;
	let endOutcome: RuntimeEndOutcome | undefined;

	function completeRun(result: AgentRunResult): AgentRunResult {
		endOutcome = {
			status: "completed",
			stopReason: result.stopReason,
		};
		return result;
	}

	try {

	emitEvent(options.onEvent, {
		type: "run_start",
		task: options.task,
		timestamp: Date.now(),
	});

	await yieldToEventLoop(); // 模拟异步

	for (let loopCount = 0; loopCount < maxSteps; loopCount++) {
		currentStep = loopCount + 1;
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

			return completeRun({
				finalAnswer: modelResponse.content,
				messages,
				stopReason: "final_answer",
			});
				} else if (modelResponse.kind === "tool_call" && modelResponse.toolCall) {
					let toolResult: ToolResult;

					if (runtimeHook?.onToolCall) {
						try {
							const payload = structuredClone({ // 快照方式保证Hook 即使强制修改参数，也不会影响 Runtime 原对象
								// 在进入 Hook 调度前记录，Trace 不受 Hook 注册顺序影响。
								occurredAt: Date.now(),
								runtime: {
									runtimeId,
									task: options.task,
									step: loopCount + 1,
									messages,
								},
								toolCall: modelResponse.toolCall,
							});

							await runtimeHook.onToolCall(payload);
						} catch (error) {
							console.error("[runtime-hook] onToolCall failed", error);
						}
					} // 快照或 Hook 失败只记录错误，不中断 Approval 和工具执行。

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

			if (runtimeHook?.onToolResult) {
				try {
					const payload = structuredClone({
						// messages 已提交 ToolResult，此时记录结果事实的发生时间。
						occurredAt: Date.now(),
						runtime: {
							runtimeId,
							task: options.task,
							step: loopCount + 1,
							messages,
						},
						toolCall: modelResponse.toolCall,
						toolResult,
					});

					await runtimeHook.onToolResult(payload);
				} catch (error) {
					console.error("[runtime-hook] onToolResult failed", error);
				}
			}

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

			return completeRun({
				finalAnswer: null,
				messages,
				stopReason: "invalid_tool_call",
			});
		}
	}

	emitEvent(options.onEvent, {
		type: "run_end",
		stopReason: "model_no_final",
		finalAnswer: null,
		timestamp: Date.now(),
	});

	await yieldToEventLoop();

	return completeRun({
		finalAnswer: null,
		messages,
		stopReason: "model_no_final",
	});
	} catch (error) {
		endOutcome = {
			status: "failed",
			errorMessage: normalizeErrorMessage(error),
		};
		// Lifecycle 只观察失败，不能把 Runtime 异常转换成正常结果。
		throw error;
	} finally {
		if (runtimeHook?.onRunEnd && endOutcome) {
			try {
				const payload = structuredClone({
					occurredAt: Date.now(),
					runtime: {
						runtimeId,
						task: options.task,
						step: currentStep,
						messages,
					},
					outcome: endOutcome,
				});

				await runtimeHook.onRunEnd(payload);
			} catch (hookError) {
				// 终止 Hook 失败不能覆盖 Runtime 原始结果或异常。
				console.error("[runtime-hook] onRunEnd failed", hookError);
			}
		}
	}
}
