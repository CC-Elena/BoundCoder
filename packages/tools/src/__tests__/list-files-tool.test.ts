import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createListFilesTool } from "../filesystem/list-files-tool.js";
import { createWorkspaceFs } from "../filesystem/workspace-fs.js";

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

    const tool = createListFilesTool({ workspaceFs: createWorkspaceFs({ rootDir }) });
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
    const tool = createListFilesTool({ workspaceFs: createWorkspaceFs({ rootDir }) });

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
    const tool = createListFilesTool({ workspaceFs: createWorkspaceFs({ rootDir }) });

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
    const tool = createListFilesTool({ workspaceFs: createWorkspaceFs({ rootDir }) });

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

  it("超过 maxEntries 时应截断并追加标记", () => {
    const rootDir = makeTempDir();
    fs.writeFileSync(path.join(rootDir, "a.txt"), "a", "utf-8");
    fs.writeFileSync(path.join(rootDir, "b.txt"), "b", "utf-8");

    const tool = createListFilesTool({
      workspaceFs: createWorkspaceFs({ rootDir }),
      maxEntries: 1,
    });
    const result = tool.execute({
      id: "call-5",
      name: "list_files",
      parameters: {},
    });

    expect(result).toEqual({
      toolCallId: "call-5",
      ok: true,
      output: "a.txt\n...TRUNCATED...",
    });
  });

  it("超过 maxDepth 时应截断并追加标记", () => {
    const rootDir = makeTempDir();
    fs.mkdirSync(path.join(rootDir, "a", "b"), { recursive: true });
    fs.writeFileSync(path.join(rootDir, "a", "b", "deep.txt"), "x", "utf-8");

    const tool = createListFilesTool({
      workspaceFs: createWorkspaceFs({ rootDir }),
      maxDepth: 0,
    });
    const result = tool.execute({
      id: "call-6",
      name: "list_files",
      parameters: {},
    });

    expect(result).toEqual({
      toolCallId: "call-6",
      ok: true,
      output: "...TRUNCATED...",
    });
  });

  it("默认忽略 node_modules、dist、.git 目录", () => {
    const rootDir = makeTempDir();
    fs.mkdirSync(path.join(rootDir, "node_modules"), { recursive: true });
    fs.mkdirSync(path.join(rootDir, "dist"), { recursive: true });
    fs.mkdirSync(path.join(rootDir, ".git"), { recursive: true });
    fs.writeFileSync(path.join(rootDir, "node_modules", "skip.js"), "x", "utf-8");
    fs.writeFileSync(path.join(rootDir, "dist", "skip.js"), "x", "utf-8");
    fs.writeFileSync(path.join(rootDir, ".git", "config"), "x", "utf-8");
    fs.writeFileSync(path.join(rootDir, "keep.ts"), "x", "utf-8");

    const tool = createListFilesTool({ workspaceFs: createWorkspaceFs({ rootDir }) });
    const result = tool.execute({
      id: "call-7",
      name: "list_files",
      parameters: {},
    });

    expect(result).toEqual({
      toolCallId: "call-7",
      ok: true,
      output: "keep.ts",
    });
  });
});