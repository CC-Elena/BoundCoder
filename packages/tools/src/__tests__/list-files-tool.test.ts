import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createListFilesTool } from "../list-files-tool.js";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "boundcoder-list-files-tool-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("createListFilesTool", () => {
  it("列出 rootDir 下所有文件的相对路径", () => {
    const rootDir = makeTempDir();
    fs.mkdirSync(path.join(rootDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(rootDir, "README.md"), "root", "utf-8");
    fs.writeFileSync(path.join(rootDir, "src", "index.ts"), "code", "utf-8");

    const tool = createListFilesTool({ rootDir });
    const result = tool.execute({
      id: "call-1",
      name: "list_files",
      parameters: {},
    });

    expect(result).toEqual({
      toolCallId: "call-1",
      ok: true,
      output: "README.md\nsrc/index.ts",
    });
  });

  it("路径参数类型错误时返回失败", () => {
    const rootDir = makeTempDir();
    const tool = createListFilesTool({ rootDir });

    const result = tool.execute({
      id: "call-2",
      name: "list_files",
      parameters: { path: 123 },
    });

    expect(result).toEqual({
      toolCallId: "call-2",
      ok: false,
      output: "",
      errorMessage: "invalid path parameter",
    });
  });

  it("越界目录访问时返回失败", () => {
    const rootDir = makeTempDir();
    const tool = createListFilesTool({ rootDir });

    const result = tool.execute({
      id: "call-3",
      name: "list_files",
      parameters: { path: "../outside" },
    });

    expect(result).toEqual({
      toolCallId: "call-3",
      ok: false,
      output: "",
      errorMessage: "path out of rootDir",
    });
  });

  it("目录不存在时返回结构化失败", () => {
    const rootDir = makeTempDir();
    const tool = createListFilesTool({ rootDir });

    const result = tool.execute({
      id: "call-4",
      name: "list_files",
      parameters: { path: "missing" },
    });

    expect(result.toolCallId).toBe("call-4");
    expect(result.ok).toBe(false);
    expect(result.output).toBe("");
    expect(result.errorMessage).toContain("list files failed:");
  });
});