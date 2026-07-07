import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSearchCodeTool } from "../search-code-tool.js";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "boundcoder-search-code-tool-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("createSearchCodeTool", () => {
  it("返回命中的相对路径和行号", () => {
    const rootDir = makeTempDir();
    fs.mkdirSync(path.join(rootDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(rootDir, "src", "a.ts"), "const token = 1;", "utf-8");

    const tool = createSearchCodeTool({ rootDir });
    const result = tool.execute({
      id: "call-1",
      name: "search_code",
      parameters: { query: "token" },
    });

    expect(result).toEqual({
      toolCallId: "call-1",
      ok: true,
      output: "src/a.ts:1:const token = 1;",
    });
  });

  it("query 参数非法时返回失败", () => {
    const rootDir = makeTempDir();
    const tool = createSearchCodeTool({ rootDir });

    const result = tool.execute({
      id: "call-2",
      name: "search_code",
      parameters: { query: "   " },
    });

    expect(result).toEqual({
      toolCallId: "call-2",
      ok: false,
      output: "",
      errorMessage: "invalid query parameter",
    });
  });

  it("默认忽略 node_modules 目录", () => {
    const rootDir = makeTempDir();
    fs.mkdirSync(path.join(rootDir, "node_modules"), { recursive: true });
    fs.writeFileSync(path.join(rootDir, "node_modules", "lib.js"), "token", "utf-8");
    fs.writeFileSync(path.join(rootDir, "main.ts"), "token", "utf-8");

    const tool = createSearchCodeTool({ rootDir });
    const result = tool.execute({
      id: "call-3",
      name: "search_code",
      parameters: { query: "token" },
    });

    expect(result).toEqual({
      toolCallId: "call-3",
      ok: true,
      output: "main.ts:1:token",
    });
  });

  it("超过 maxResults 时追加截断标记", () => {
    const rootDir = makeTempDir();
    fs.writeFileSync(path.join(rootDir, "a.ts"), "token\ntoken", "utf-8");

    const tool = createSearchCodeTool({ rootDir, maxResults: 1 });
    const result = tool.execute({
      id: "call-4",
      name: "search_code",
      parameters: { query: "token" },
    });

    expect(result).toEqual({
      toolCallId: "call-4",
      ok: true,
      output: "a.ts:1:token\n...TRUNCATED...",
    });
  });

  it("命中数等于 maxResults 时不应追加截断标记", () => {
    const rootDir = makeTempDir();
    fs.writeFileSync(path.join(rootDir, "a.ts"), "token", "utf-8");

    const tool = createSearchCodeTool({ rootDir, maxResults: 1 });
    const result = tool.execute({
      id: "call-5",
      name: "search_code",
      parameters: { query: "token" },
    });

    expect(result).toEqual({
      toolCallId: "call-5",
      ok: true,
      output: "a.ts:1:token",
    });
  });

  it("path 越界时返回 path out of rootDir", () => {
    const rootDir = makeTempDir();
    const tool = createSearchCodeTool({ rootDir });

    const result = tool.execute({
      id: "call-6",
      name: "search_code",
      parameters: {
        query: "token",
        path: "../outside",
      },
    });

    expect(result).toEqual({
      toolCallId: "call-6",
      ok: false,
      output: "",
      errorMessage: "path out of rootDir",
    });
  });

  it("path 指向文件时返回 path is not a directory", () => {
    const rootDir = makeTempDir();
    fs.writeFileSync(path.join(rootDir, "single.ts"), "token", "utf-8");
    const tool = createSearchCodeTool({ rootDir });

    const result = tool.execute({
      id: "call-7",
      name: "search_code",
      parameters: {
        query: "token",
        path: "single.ts",
      },
    });

    expect(result).toEqual({
      toolCallId: "call-7",
      ok: false,
      output: "",
      errorMessage: "path is not a directory",
    });
  });
});