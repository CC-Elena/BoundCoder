import { describe, expect, it, vi } from "vitest";
import { createRunCommandTool, parseRunCommandParameters } from "../command/run-command-tool.js";

describe("parseRunCommandParameters", () => {
  it("name 非字符串时返回失败", () => {
    const result = parseRunCommandParameters({ name: 123 });

    expect(result).toEqual({
      ok: false,
      error: "invalid name parameter",
    });
  });

  it("name 会做 trim 和小写规约", () => {
    const result = parseRunCommandParameters({ name: "  TeSt  " });

    expect(result).toEqual({
      ok: true,
      value: { name: "test" },
    });
  });
});

describe("createRunCommandTool", () => {
  it("允许白名单名 test，并映射到 npm test", () => {
    const commandRunner = vi.fn(() => ({ ok: true as const, output: "ok" }));
    const tool = createRunCommandTool({
      rootDir: "/tmp/work",
      commandRunner,
    });

    const result = tool.execute({
      id: "call-1",
      name: "run_command",
      parameters: { name: "test" },
    });

    expect(commandRunner).toHaveBeenCalledWith("npm test", "/tmp/work");
    expect(result).toEqual({
      toolCallId: "call-1",
      ok: true,
      output: "ok",
    });
  });

  it("允许白名单名 lint，并映射到 npm run lint", () => {
    const commandRunner = vi.fn(() => ({ ok: true as const, output: "lint ok" }));
    const tool = createRunCommandTool({
      rootDir: "/tmp/work",
      commandRunner,
    });

    const result = tool.execute({
      id: "call-2",
      name: "run_command",
      parameters: { name: "lint" },
    });

    expect(commandRunner).toHaveBeenCalledWith("npm run lint", "/tmp/work");
    expect(result).toEqual({
      toolCallId: "call-2",
      ok: true,
      output: "lint ok",
    });
  });

  it("非白名单 name 直接拒绝", () => {
    const commandRunner = vi.fn(() => ({ ok: true as const, output: "should not run" }));
    const tool = createRunCommandTool({
      rootDir: "/tmp/work",
      commandRunner,
    });

    const result = tool.execute({
      id: "call-3",
      name: "run_command",
      parameters: { name: "build" },
    });

    expect(commandRunner).not.toHaveBeenCalled();
    expect(result).toEqual({
      toolCallId: "call-3",
      ok: false,
      output: "",
      errorMessage: "command not allowed: build",
    });
  });

  it("name 带注入片段时应拒绝，不会执行命令", () => {
    const commandRunner = vi.fn(() => ({ ok: true as const, output: "should not run" }));
    const tool = createRunCommandTool({
      rootDir: "/tmp/work",
      commandRunner,
    });

    const result = tool.execute({
      id: "call-4",
      name: "run_command",
      parameters: { name: "test -- --watch" },
    });

    expect(commandRunner).not.toHaveBeenCalled();
    expect(result).toEqual({
      toolCallId: "call-4",
      ok: false,
      output: "",
      errorMessage: "command not allowed: test -- --watch",
    });
  });

  it("命令执行失败时返回结构化错误", () => {
    const commandRunner = vi.fn(() => ({ ok: false as const, error: "boom" }));
    const tool = createRunCommandTool({
      rootDir: "/tmp/work",
      commandRunner,
    });

    const result = tool.execute({
      id: "call-5",
      name: "run_command",
      parameters: { name: "test" },
    });

    expect(result).toEqual({
      toolCallId: "call-5",
      ok: false,
      output: "",
      errorMessage: "command failed: boom",
    });
  });

  it("timeoutMs 非法时创建工具应抛错", () => {
    expect(() => createRunCommandTool({
      rootDir: "/tmp/work",
      timeoutMs: 0,
    })).toThrow("invalid timeoutMs option");
  });

  it("maxOutputBytes 非法时创建工具应抛错", () => {
    expect(() => createRunCommandTool({
      rootDir: "/tmp/work",
      maxOutputBytes: -1,
    })).toThrow("invalid maxOutputBytes option");
  });
});
