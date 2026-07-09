import { spawnSync } from "node:child_process";
import type { ToolCall, ToolResult } from "@boundcoder/shared";
import type { Tool } from "./contracts.js";
import { paramErr, paramOk, type ParamResult } from "./params.js";
import { fail } from "./tool-helpers.js";

export interface RunCommandToolOptions {
	rootDir: string;
	allowedCommandNames?: readonly string[];
	commandMap?: Record<string, string>;
	timeoutMs?: number;
	maxOutputBytes?: number;
	commandRunner?: CommandRunner;
}

export interface RunCommandParameters {
	name: string;
}

interface CommandRunSuccess {
	ok: true;
	output: string;
}

interface CommandRunFailure {
	ok: false;
	error: string;
}

type CommandRunResult = CommandRunSuccess | CommandRunFailure;

export type CommandRunner = (command: string, cwd: string) => CommandRunResult;

const RUN_COMMAND_TOOL_NAME = "run_command";

const DEFAULT_COMMAND_MAP: Record<string, string> = {
	test: "npm test",
	lint: "npm run lint",
};

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_OUTPUT_BYTES = 64 * 1024;

function normalizeName(name: string): string {
	return name.trim().toLowerCase();
}

export function parseRunCommandParameters(
	params: Record<string, unknown>,
): ParamResult<RunCommandParameters> {
	const name = params.name;
	if (typeof name !== "string" || name.trim() === "") {
		return paramErr("invalid name parameter");
	}

	return paramOk({ name: normalizeName(name) });
}

export interface RealCommandRunnerOptions {
	timeoutMs: number;
	maxOutputBytes: number;
}

// 生产默认 runner：真实执行命令。
// 测试可通过 options.commandRunner 注入 fake runner，避免慢/不稳定/环境依赖。
export function createRealCommandRunner(options: RealCommandRunnerOptions): CommandRunner {
	const { timeoutMs, maxOutputBytes } = options;

	return (command: string, cwd: string): CommandRunResult => {
		const parts = command.split(" ");
		const program = parts[0] ?? "";
		const args = parts.slice(1);

		if (program === "") {
			return {
				ok: false,
				error: "empty command",
			};
		}

		const result = spawnSync(program, args, {
			cwd,
			encoding: "utf-8",
			timeout: timeoutMs,
			maxBuffer: maxOutputBytes,
		});

		if (result.error) {
			if ((result.error as NodeJS.ErrnoException).code === "ETIMEDOUT") {
				return {
					ok: false,
					error: `command timed out after ${timeoutMs}ms`,
				};
			}

			if ((result.error as NodeJS.ErrnoException).code === "ENOBUFS") {
				return {
					ok: false,
					error: `command output exceeded ${maxOutputBytes} bytes`,
				};
			}

			return {
				ok: false,
				error: result.error.message,
			};
		}

		const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
		if (Buffer.byteLength(output, "utf-8") > maxOutputBytes) {
			return {
				ok: false,
				error: `command output exceeded ${maxOutputBytes} bytes`,
			};
		}

		if (result.status !== 0) {
			const trimmedOutput = output.trim();
			return {
				ok: false,
				error: trimmedOutput || `command exited with code ${result.status ?? "unknown"}`,
			};
		}

		return {
			ok: true,
			output: output.trim(),
		};
	};
}

export function createRunCommandTool(options: RunCommandToolOptions): Tool {
	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;

	if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
		throw new Error("invalid timeoutMs option");
	}

	if (!Number.isInteger(maxOutputBytes) || maxOutputBytes <= 0) {
		throw new Error("invalid maxOutputBytes option");
	}

	const commandRunner = options.commandRunner
		?? createRealCommandRunner({ timeoutMs, maxOutputBytes });
	const commandMap = options.commandMap ?? DEFAULT_COMMAND_MAP;
	const allowed = options.allowedCommandNames ?? Object.keys(commandMap);
	const allowedSet = new Set(allowed.map(normalizeName));

	return {
		name: RUN_COMMAND_TOOL_NAME,

		execute(call: ToolCall): ToolResult {
			const parsed = parseRunCommandParameters(call.parameters);
			if (!parsed.ok) {
				return fail(call.id, parsed.error);
			}

			const commandName = parsed.value.name;
			if (!allowedSet.has(commandName)) {
				return fail(call.id, `command not allowed: ${commandName}`);
			}

			const mappedCommand = commandMap[commandName];
			if (typeof mappedCommand !== "string" || mappedCommand.trim() === "") {
				return fail(call.id, `command mapping not found: ${commandName}`);
			}

			const runResult = commandRunner(mappedCommand, options.rootDir);
			if (!runResult.ok) {
				return fail(call.id, `command failed: ${runResult.error}`);
			}

			return {
				toolCallId: call.id,
				ok: true,
				output: runResult.output,
			};
		},
	};
}