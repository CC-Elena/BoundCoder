import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createReadFileTool } from "../read-file-tool.js";

const tempDirs: string[] = [];

// 创建临时目录来测试
function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "boundcoder-read-file-tool-"));
  tempDirs.push(dir);
  return dir;
}

// 测试完删除文件
afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("createReadFileTool", () => {
  it("读取 rootDir 内的文件并返回内容", () => {
    const rootDir = makeTempDir();
    const filePath = path.join(rootDir, "notes.txt");
    fs.writeFileSync(filePath, "hello", "utf-8");

    const tool = createReadFileTool({ rootDir });
    const result = tool.execute({
      id: "call-1",
      name: "read_file",
      parameters: { path: "notes.txt" },
    });

    expect(result).toEqual({
      toolCallId: "call-1",
      ok: true,
      output: "hello",
    });
  });

  it("路径参数无效时返回失败结果", () => {
    const rootDir = makeTempDir();
    const tool = createReadFileTool({ rootDir });

    const result = tool.execute({
      id: "call-2",
      name: "read_file",
      parameters: { path: "   " },
    });

    expect(result).toEqual({
      toolCallId: "call-2",
      ok: false,
      output: "",
      errorMessage: "invalid path parameter",
    });
  });

  it("尝试越界访问 rootDir 外部路径时返回失败结果", () => {
    const rootDir = makeTempDir();
    const tool = createReadFileTool({ rootDir });

    const result = tool.execute({
      id: "call-3",
      name: "read_file",
      parameters: { path: "../secret.txt" },
    });

    expect(result).toEqual({
      toolCallId: "call-3",
      ok: false,
      output: "",
      errorMessage: "path out of rootDir",
    });
  });

  it("读取不存在文件时返回结构化失败结果", () => {
    const rootDir = makeTempDir();
    const tool = createReadFileTool({ rootDir });

    const result = tool.execute({
      id: "call-4",
      name: "read_file",
      parameters: { path: "missing.txt" },
    });

    expect(result.toolCallId).toBe("call-4");
    expect(result.ok).toBe(false);
    expect(result.output).toBe("");
    expect(result.errorMessage).toContain("read file failed:");
  });
});